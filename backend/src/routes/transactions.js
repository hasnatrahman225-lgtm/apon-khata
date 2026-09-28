const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const CATEGORIES = ["sale", "purchase", "expense", "due", "deposit", "general"];

// GET /transactions?from=&to=&category=&contactId=
router.get("/", (req, res) => {
  const contactId = req.query.contactId || req.query.contact_id;
  const { from, to, category } = req.query;
  let sql = `
    SELECT t.*, c.name AS contact_name, c.type AS contact_type
    FROM transactions t
    LEFT JOIN contacts c ON c.id = t.contact_id
    WHERE t.user_id = ?
  `;
  const params = [req.userId];

  if (from) {
    sql += " AND date(t.occurred_at) >= date(?)";
    params.push(from);
  }
  if (to) {
    sql += " AND date(t.occurred_at) <= date(?)";
    params.push(to);
  }
  if (category) {
    sql += " AND t.category = ?";
    params.push(category);
  }
  if (contactId) {
    sql += " AND t.contact_id = ?";
    params.push(contactId);
  }
  sql += " ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT 1000";

  const rows = db.prepare(sql).all(...params);
  res.json({ transactions: rows });
});

// POST /transactions { contactId, direction, amount, category, note, occurredAt }
router.post("/", (req, res) => {
  const contactId = req.body.contactId || req.body.contact_id;
  const occurredAt = req.body.occurredAt || req.body.occurred_at;
  const { direction, amount, category, note } = req.body;

  if (!["gave", "got"].includes(direction)) {
    return res.status(400).json({ error: "direction must be 'gave' or 'got'." });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    return res.status(400).json({ error: "সঠিক পরিমাণ দিন।" });
  }
  const cat = CATEGORIES.includes(category) ? category : "general";

  if (contactId) {
    const contact = db
      .prepare("SELECT id FROM contacts WHERE id = ? AND user_id = ?")
      .get(contactId, req.userId);
    if (!contact) return res.status(400).json({ error: "Contact not found." });
  }

  // Format date if given
  let finalOccurredAt = null;
  if (occurredAt) {
    // If it's just YYYY-MM-DD, add current time of day for good ordering
    if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
      const nowTime = new Date().toTimeString().split(" ")[0];
      finalOccurredAt = `${occurredAt} ${nowTime}`;
    } else {
      finalOccurredAt = occurredAt;
    }
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO transactions (id, user_id, contact_id, direction, amount, category, note, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
  ).run(id, req.userId, contactId || null, direction, amt, cat, note || null, finalOccurredAt);

  const tx = db
    .prepare(
      `SELECT t.*, c.name AS contact_name, c.type AS contact_type
       FROM transactions t
       LEFT JOIN contacts c ON c.id = t.contact_id
       WHERE t.id = ?`
    )
    .get(id);
  res.status(201).json({ transaction: tx });
});

// PATCH /transactions/:id
router.patch("/:id", (req, res) => {
  const tx = db
    .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!tx) return res.status(404).json({ error: "Transaction not found." });

  const occurredAt = req.body.occurredAt || req.body.occurred_at;
  const contactId = req.body.contactId || req.body.contact_id;
  const { direction, amount, category, note } = req.body;

  let newDirection = tx.direction;
  if (direction !== undefined) {
    if (!["gave", "got"].includes(direction)) {
      return res.status(400).json({ error: "direction must be 'gave' or 'got'." });
    }
    newDirection = direction;
  }

  let newAmount = tx.amount;
  if (amount !== undefined) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return res.status(400).json({ error: "সঠিক পরিমাণ দিন।" });
    }
    newAmount = amt;
  }

  let newCategory = tx.category;
  if (category !== undefined) {
    newCategory = CATEGORIES.includes(category) ? category : tx.category;
  }

  let newNote = tx.note;
  if (note !== undefined) {
    newNote = note || null;
  }

  let newOccurredAt = tx.occurred_at;
  if (occurredAt !== undefined && occurredAt) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
      const existingTime = tx.occurred_at.includes(" ") ? tx.occurred_at.split(" ")[1] : "12:00:00";
      newOccurredAt = `${occurredAt} ${existingTime}`;
    } else {
      newOccurredAt = occurredAt;
    }
  }

  let newContactId = tx.contact_id;
  if (contactId !== undefined) {
    if (contactId) {
      const contact = db
        .prepare("SELECT id FROM contacts WHERE id = ? AND user_id = ?")
        .get(contactId, req.userId);
      if (!contact) return res.status(400).json({ error: "Contact not found." });
      newContactId = contactId;
    } else {
      newContactId = null;
    }
  }

  db.prepare(
    `UPDATE transactions
     SET direction = ?, amount = ?, category = ?, note = ?, occurred_at = ?, contact_id = ?
     WHERE id = ? AND user_id = ?`
  ).run(newDirection, newAmount, newCategory, newNote, newOccurredAt, newContactId, tx.id, req.userId);

  const updated = db
    .prepare(
      `SELECT t.*, c.name AS contact_name, c.type AS contact_type
       FROM transactions t
       LEFT JOIN contacts c ON c.id = t.contact_id
       WHERE t.id = ?`
    )
    .get(tx.id);

  res.json({ transaction: updated });
});

// DELETE /transactions/:id
router.delete("/:id", (req, res) => {
  const tx = db
    .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!tx) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM transactions WHERE id = ?").run(tx.id);
  res.json({ ok: true });
});

module.exports = router;
