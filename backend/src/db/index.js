const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "khatabook.sqlite"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ---------------------------------------------------------------------------
// Schema
//
// The core design decision: every business-data row is scoped to `users.id`,
// and `users.email` is the ONLY durable identity. Whether someone logs in
// with an email+password pair or with "Sign in with Google", they resolve to
// the same row keyed by email — so logging in from a new phone or a browser
// with that same email restores every khata, customer, and transaction.
// There is no phone-number identity and no payment/wallet data anywhere.
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,          -- NULL if the account was created via Google sign-in only
  google_sub TEXT UNIQUE,       -- Google's stable account id, if linked
  business_name TEXT,
  business_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('customer','supplier')),
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  -- 'gave' = you gave goods/credit (they owe you more, i.e. a due/debit)
  -- 'got'  = you received money/goods back (reduces due, i.e. a deposit/credit)
  direction TEXT NOT NULL CHECK (direction IN ('gave','got')),
  amount REAL NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL DEFAULT 'general', -- sale, purchase, expense, due, deposit, general
  note TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_stock_user ON stock_items(user_id);
`);

module.exports = db;
