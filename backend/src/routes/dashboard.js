const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /dashboard/summary
router.get("/summary", (req, res) => {
  const userId = req.userId;

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN direction = 'gave' THEN amount ELSE 0 END), 0) AS totalGave,
         COALESCE(SUM(CASE WHEN direction = 'got' THEN amount ELSE 0 END), 0) AS totalGot
       FROM transactions WHERE user_id = ?`
    )
    .get(userId);

  const byCategory = db
    .prepare(
      `SELECT category,
              COALESCE(SUM(CASE WHEN direction = 'gave' THEN amount ELSE 0 END), 0) AS gave,
              COALESCE(SUM(CASE WHEN direction = 'got' THEN amount ELSE 0 END), 0) AS got
       FROM transactions WHERE user_id = ? GROUP BY category`
    )
    .all(userId);

  const contactBalances = db
    .prepare(
      `SELECT c.id, c.type, c.name,
              COALESCE(SUM(CASE WHEN t.direction = 'gave' THEN t.amount ELSE 0 END), 0) -
              COALESCE(SUM(CASE WHEN t.direction = 'got' THEN t.amount ELSE 0 END), 0) AS balance
       FROM contacts c LEFT JOIN transactions t ON t.contact_id = c.id AND t.user_id = c.user_id
       WHERE c.user_id = ?
       GROUP BY c.id`
    )
    .all(userId);

  const totalReceivable = contactBalances
    .filter((c) => c.type === "customer" && c.balance > 0)
    .reduce((s, c) => s + c.balance, 0);
  const totalPayable = contactBalances
    .filter((c) => c.type === "supplier" && c.balance > 0)
    .reduce((s, c) => s + c.balance, 0);

  const recent = db
    .prepare(
      `SELECT t.*, c.name as contact_name FROM transactions t
       LEFT JOIN contacts c ON c.id = t.contact_id
       WHERE t.user_id = ? ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT 10`
    )
    .all(userId);

  res.json({
    netBalance: totals.totalGave - totals.totalGot,
    totalGave: totals.totalGave,
    totalGot: totals.totalGot,
    totalReceivable,
    totalPayable,
    byCategory,
    recentTransactions: recent,
  });
});

module.exports = router;
