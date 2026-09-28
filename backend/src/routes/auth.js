const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    businessName: row.business_name,
    businessPhone: row.business_phone,
    hasPassword: !!row.password_hash,
    hasGoogle: !!row.google_sub,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// POST /auth/register  { email, password, name, businessName }
// Creates an account keyed by email. If an account with that email already
// exists (e.g. previously created via Google), this just attaches a password
// to it instead of creating a duplicate — one email, one account, always.
// ---------------------------------------------------------------------------
router.post("/register", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password, name } = req.body;
  const businessName = req.body.businessName || req.body.business_name;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "একটি সঠিক ইমেইল দিন।" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });
  }

  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) {
    if (existing.password_hash) {
      return res.status(409).json({ error: "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে। লগইন করুন।" });
    }
    // Account existed via Google only — attach a password so email+password
    // login also works for the same data going forward.
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, existing.id);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
    const token = signToken(updated);
    return res.json({ token, user: publicUser(updated) });
  }

  const hash = bcrypt.hashSync(password, 10);
  const id = uuid();
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, business_name)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, name || null, hash, businessName || null);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// POST /auth/login  { email, password }
// ---------------------------------------------------------------------------
router.post("/login", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "ইমেইল বা পাসওয়ার্ড ভুল।" });
  }
  const ok = bcrypt.compareSync(password || "", user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "ইমেইল বা পাসওয়ার্ড ভুল।" });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// POST /auth/google  { idToken }
// Verifies the Google ID token, then finds-or-creates a user by the email
// inside that token. This is the "restore my data by logging in with the
// same Gmail" path — no separate Google-only user id is ever used as the
// account key, only the email.
//
// Requires GOOGLE_CLIENT_ID to be configured (see README) — without it this
// endpoint returns 501 so the rest of the app still runs during local dev.
// ---------------------------------------------------------------------------
router.post("/google", async (req, res) => {
  if (!googleClient) {
    return res.status(501).json({
      error:
        "Google Sign-In is not configured on this server yet. Set GOOGLE_CLIENT_ID (see README) to enable it.",
    });
  }
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing idToken." });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload.email);
    if (!payload.email_verified) {
      return res.status(400).json({ error: "Google email is not verified." });
    }

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      const id = uuid();
      db.prepare(
        `INSERT INTO users (id, email, name, google_sub) VALUES (?, ?, ?, ?)`
      ).run(id, email, payload.name || null, payload.sub);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    } else if (!user.google_sub) {
      db.prepare("UPDATE users SET google_sub = ? WHERE id = ?").run(payload.sub, user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(401).json({ error: "Google sign-in failed. Try again." });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/me — used on app launch to restore the session/account from a
// stored token, and by the frontend right after login.
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// PATCH /auth/profile — edit business name/phone/display name
// ---------------------------------------------------------------------------
router.patch("/profile", requireAuth, (req, res) => {
  const { name, businessName, businessPhone } = req.body;
  db.prepare(
    `UPDATE users SET name = COALESCE(?, name),
                       business_name = COALESCE(?, business_name),
                       business_phone = COALESCE(?, business_phone)
     WHERE id = ?`
  ).run(name, businessName, businessPhone, req.userId);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: publicUser(user) });
});

// ---------------------------------------------------------------------------
// POST /auth/reset-password — unauthenticated password reset by email
// ---------------------------------------------------------------------------
router.post("/reset-password", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { newPassword } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "একটি সঠিক ইমেইল দিন।" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(404).json({ error: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।" });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  const token = signToken(updated);
  res.json({
    ok: true,
    token,
    user: publicUser(updated),
    message: "পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে।",
  });
});

// ---------------------------------------------------------------------------
// POST /auth/change-password — authenticated password update
// ---------------------------------------------------------------------------
router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  // If user has existing password, verify current password
  if (user.password_hash) {
    if (!currentPassword) {
      return res.status(400).json({ error: "বর্তমান পাসওয়ার্ড দিন।" });
    }
    const match = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "বর্তমান পাসওয়ার্ডটি ভুল হয়েছে।" });
    }
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  res.json({ ok: true, message: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।" });
});

module.exports = router;
