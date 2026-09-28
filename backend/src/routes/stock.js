const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM stock_items WHERE user_id = ? ORDER BY name").all(req.userId);
  res.json({ items: rows });
});

router.post("/", (req, res) => {
  const name = req.body.name || req.body.item_name;
  const unitPrice = req.body.unitPrice || req.body.unit_price;
  const { unit, quantity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "নাম আবশ্যক।" });
  const id = uuid();
  db.prepare(
    `INSERT INTO stock_items (id, user_id, name, unit, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, name.trim(), unit || "pcs", Number(quantity) || 0, Number(unitPrice) || 0);
  const item = db.prepare("SELECT * FROM stock_items WHERE id = ?").get(id);
  res.status(201).json({ item });
});

router.patch("/:id", (req, res) => {
  const item = db.prepare("SELECT * FROM stock_items WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!item) return res.status(404).json({ error: "Not found." });
  const name = req.body.name || req.body.item_name;
  const unitPrice = req.body.unitPrice || req.body.unit_price;
  const { unit, quantity } = req.body;
  db.prepare(
    `UPDATE stock_items SET name = COALESCE(?, name), unit = COALESCE(?, unit),
     quantity = COALESCE(?, quantity), unit_price = COALESCE(?, unit_price) WHERE id = ?`
  ).run(name, unit, quantity, unitPrice, item.id);
  const updated = db.prepare("SELECT * FROM stock_items WHERE id = ?").get(item.id);
  res.json({ item: updated });
});

router.delete("/:id", (req, res) => {
  const item = db.prepare("SELECT * FROM stock_items WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!item) return res.status(404).json({ error: "Not found." });
  db.prepare("DELETE FROM stock_items WHERE id = ?").run(item.id);
  res.json({ ok: true });
});

module.exports = router;
