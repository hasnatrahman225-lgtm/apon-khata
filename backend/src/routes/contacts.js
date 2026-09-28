const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function balanceForContact(userId, contactId) {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN direction = 'gave' THEN amount ELSE 0 END), 0) AS gave,
         COALESCE(SUM(CASE WHEN direction = 'got' THEN amount ELSE 0 END), 0) AS got
       FROM transactions WHERE user_id = ? AND contact_id = ?`
    )
    .get(userId, contactId);
  return row.gave - row.got; // positive = they owe you
}

// GET /contacts?type=customer|supplier
router.get("/", (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare("SELECT * FROM contacts WHERE user_id = ? AND type = ? ORDER BY name").all(req.userId, type)
    : db.prepare("SELECT * FROM contacts WHERE user_id = ? ORDER BY name").all(req.userId);

  const withBalance = rows.map((c) => ({
    ...c,
    balance: balanceForContact(req.userId, c.id),
  }));
  res.json({ contacts: withBalance });
});

// POST /contacts { type, name, phone, note }
router.post("/", (req, res) => {
  const { type, name, phone, note } = req.body;
  if (!["customer", "supplier"].includes(type)) {
    return res.status(400).json({ error: "type must be 'customer' or 'supplier'." });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "নাম আবশ্যক।" });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO contacts (id, user_id, type, name, phone, note) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, type, name.trim(), phone || null, note || null);
  const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id);
  res.status(201).json({ contact: { ...contact, balance: 0 } });
});

// GET /contacts/:id — profile + transaction history
router.get("/:id", (req, res) => {
  const contact = db
    .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: "Not found." });

  const transactions = db
    .prepare(
      `SELECT * FROM transactions WHERE user_id = ? AND contact_id = ? ORDER BY occurred_at DESC, created_at DESC`
    )
    .all(req.userId, contact.id);

  res.json({ contact: { ...contact, balance: balanceForContact(req.userId, contact.id) }, transactions });
});

// PATCH /contacts/:id
router.patch("/:id", (req, res) => {
  const contact = db
    .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: "Not found." });

  const { name, phone, note } = req.body;
  db.prepare(
    `UPDATE contacts SET name = COALESCE(?, name), phone = COALESCE(?, phone), note = COALESCE(?, note) WHERE id = ?`
  ).run(name, phone, note, contact.id);
  const updated = db.prepare("SELECT * FROM contacts WHERE id = ?").get(contact.id);
  res.json({ contact: { ...updated, balance: balanceForContact(req.userId, contact.id) } });
});

// DELETE /contacts/:id
router.delete("/:id", (req, res) => {
  const contact = db
    .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM contacts WHERE id = ?").run(contact.id);
  res.json({ ok: true });
});

module.exports = router;
