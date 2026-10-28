"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const PgStore = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { Pool } = require("pg");

const { DATABASE_URL, NODE_ENV = "development", SESSION_SECRET, PORT = 3000 } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required. Add a Render PostgreSQL database to this service.");
if (!SESSION_SECRET) throw new Error("SESSION_SECRET is required.");

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: "250kb" }));
app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 30 }
}));

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notes (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      title VARCHAR(120) NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
  `);
}

function requireUser(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please sign in." });
  next();
}

function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (origin && origin !== `${req.protocol}://${req.get("host")}`) return res.status(403).json({ error: "Invalid request origin." });
  next();
}

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Please try again later." } });
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

app.get("/api/auth/me", (req, res) => res.json({ user: req.session.user || null }));
app.post("/api/auth/register", requireSameOrigin, authLimit, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!emailIsValid(email) || password.length < 10 || password.length > 128) return res.status(400).json({ error: "Use a valid email and a password with 10 to 128 characters." });
    const result = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email", [email, await bcrypt.hash(password, 12)]);
    const user = result.rows[0];
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.user = { id: String(user.id), email: user.email };
      res.status(201).json({ user: req.session.user });
    });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    next(error);
  }
});
app.post("/api/auth/login", requireSameOrigin, authLimit, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
    const account = result.rows[0];
    if (!account || !(await bcrypt.compare(String(req.body.password || ""), account.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = account.id;
      req.session.user = { id: String(account.id), email: account.email };
      res.json({ user: req.session.user });
    });
  } catch (error) { next(error); }
});
app.post("/api/auth/logout", requireSameOrigin, (req, res, next) => req.session.destroy((error) => error ? next(error) : res.clearCookie("connect.sid").status(204).end()));

function sanitizeNotes(input) {
  if (!Array.isArray(input) || input.length > 500) return null;
  const seen = new Set();
  const notes = [];
  for (const item of input) {
    const id = String(item?.id || "");
    const title = String(item?.title || "");
    const body = String(item?.body || "");
    const created = Number(item?.created);
    const updated = Number(item?.updated);
    if (!/^[a-z0-9]{6,32}$/i.test(id) || seen.has(id) || title.length > 120 || body.length > 100000 || !Number.isSafeInteger(created) || !Number.isSafeInteger(updated)) return null;
    seen.add(id);
    notes.push({ id, title, body, created, updated });
  }
  return notes;
}

app.get("/api/notes", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT id, title, body, created_at AS created, updated_at AS updated FROM notes WHERE user_id = $1 ORDER BY updated_at DESC", [req.session.userId]);
    res.json({ notes: result.rows });
  } catch (error) { next(error); }
});
app.post("/api/notes/sync", requireSameOrigin, requireUser, async (req, res, next) => {
  const notes = sanitizeNotes(req.body.notes);
  if (!notes) return res.status(400).json({ error: "Invalid notes payload." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids = notes.map((note) => note.id);
    if (ids.length) await client.query("DELETE FROM notes WHERE user_id = $1 AND NOT (id = ANY($2::text[]))", [req.session.userId, ids]);
    else await client.query("DELETE FROM notes WHERE user_id = $1", [req.session.userId]);
    for (const note of notes) await client.query(`INSERT INTO notes (user_id, id, title, body, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = EXCLUDED.updated_at`, [req.session.userId, note.id, note.title, note.body, note.created, note.updated]);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally { client.release(); }
});

// This app has no public asset directory. Serve only the two HTML entry files
// so deployment files and server source cannot be fetched from the web server.
app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/memorykeepnote.html", (req, res) => res.sendFile(path.join(__dirname, "memorykeepnote.html")));
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: "Something went wrong. Please try again." }); });

migrate().then(() => app.listen(PORT, () => console.log(`Memory Keep Note listening on ${PORT}`))).catch((error) => { console.error("Database setup failed", error); process.exit(1); });
