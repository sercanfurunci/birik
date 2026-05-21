// v2 — custom_categories per user (JSONB), installment detection
// Required SQL migrations:
// CREATE TABLE users (
//   id SERIAL PRIMARY KEY,
//   email VARCHAR(255) UNIQUE,
//   password TEXT NOT NULL,
//   is_verified BOOLEAN DEFAULT FALSE,
//   verify_token TEXT,
//   verify_expires TIMESTAMP,
//   reset_token TEXT,
//   reset_expires TIMESTAMP,
//   username TEXT,
//   currency TEXT DEFAULT 'USD',
//   created_at TIMESTAMP DEFAULT NOW()
// );
// ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_expires TIMESTAMP;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
// ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_method TEXT DEFAULT 'email';
// ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;  ← NEW
// ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id);

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const cookieParser = require("cookie-parser");
const { Pool }   = require("pg");
const bcrypt     = require("bcrypt");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const rateLimit  = require("express-rate-limit");
const crypto     = require("crypto");
const swaggerUi  = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const admin      = require("firebase-admin");
const multer     = require("multer");
const Anthropic  = require("@anthropic-ai/sdk");
const pdfParse   = require("pdf-parse");

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const app = express();
const JWT_SECRET   = process.env.JWT_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!JWT_SECRET || !ADMIN_SECRET) {
  console.error("Missing JWT_SECRET or ADMIN_SECRET in .env — server stopped.");
  process.exit(1);
}

if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
  console.error("Missing MAIL_USER or MAIL_PASS in .env — server stopped.");
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Treat as prod whenever FRONTEND_URL points to a non-localhost domain
// (covers Render deployments that don't set NODE_ENV=production)
const isProd = process.env.NODE_ENV === "production" ||
               !FRONTEND_URL.startsWith("http://localhost");

// CORS must run before helmet so credentials header isn't stripped
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith("http://localhost:") ||
      origin === FRONTEND_URL ||
      origin.endsWith(".vercel.app") ||
      ALLOWED_ORIGINS.has(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.set("trust proxy", 1);
app.use(helmet());

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Escape user input before interpolating into HTML email templates so a malicious
// subscription/account name can't inject markup or scripts into the message.
const HTML_ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value) {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c]);
}

// [FIX 7] httpOnly cookie options — cross-origin (Vercel→Render) needs sameSite:"none" + secure in prod
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.use(generalLimiter);

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/register-phone",
  "/auth/forgot-password",
  "/auth/reset-password",
];
AUTH_ROUTES.forEach((route) => app.use(route, authLimiter));

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Expense Tracker API", version: "1.0.0", description: "Transactions API" },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./server.js"],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
if (!isProd) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
  ssl: isProd ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
});

pool.query(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    amount           NUMERIC NOT NULL,
    currency         TEXT NOT NULL DEFAULT 'USD',
    billing_cycle    TEXT NOT NULL DEFAULT 'monthly',
    next_billing_date DATE NOT NULL,
    category         TEXT NOT NULL DEFAULT 'other',
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    started_at       DATE NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error("subscriptions table init error:", err));

// Add auto_charge column for existing deployments
pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_charge BOOLEAN NOT NULL DEFAULT FALSE`)
  .catch(err => console.error("subscriptions.auto_charge migration:", err));
pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_charged_date DATE`)
  .catch(err => console.error("subscriptions.last_charged_date migration:", err));
pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_days INTEGER`)
  .catch(err => console.error("subscriptions.reminder_days migration:", err));
pool.query(`ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS reminder_days INTEGER`)
  .catch(err => console.error("recurring_transactions.reminder_days migration:", err));

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_categories JSONB DEFAULT '[]'`)
  .catch(err => console.error("users.custom_categories migration:", err));

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0`)
  .catch(err => console.error("users.token_version migration:", err));

pool.query(`
  CREATE TABLE IF NOT EXISTS goals (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    emoji          TEXT NOT NULL DEFAULT '🎯',
    target_amount  NUMERIC NOT NULL,
    saved_amount   NUMERIC NOT NULL DEFAULT 0,
    currency       TEXT NOT NULL DEFAULT 'USD',
    target_date    DATE,
    created_at     TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error("goals table init error:", err));

pool.query(`
  CREATE TABLE IF NOT EXISTS budgets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category   TEXT NOT NULL,
    amount     NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category)
  )
`).catch(err => console.error("budgets table init error:", err));

pool.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT`)
  .catch(err => console.error("budgets notes column error:", err));

pool.query(`
  CREATE TABLE IF NOT EXISTS recurring_transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    description     TEXT,
    amount          NUMERIC NOT NULL,
    type            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'other',
    frequency       TEXT NOT NULL,
    day_of_period   INTEGER,
    start_date      DATE NOT NULL,
    end_date        DATE,
    next_run_date   DATE NOT NULL,
    last_run_date   DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error("recurring_transactions table init error:", err));

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

// Resend (HTTPS-based) is used in production because Railway blocks outbound
// SMTP. Falls back to nodemailer/Gmail for local development.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
async function sendEmail({ to, subject, html, from }) {
  const fromAddress = from || process.env.MAIL_FROM || "Birik <onboarding@resend.dev>";
  if (resend) {
    const { data, error } = await resend.emails.send({
      from: fromAddress, to, subject, html,
    });
    if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
    return data;
  }
  return transporter.sendMail({ from: fromAddress, to, subject, html });
}

// ─── Input validation helpers ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

const VALID_TYPES            = new Set(["income", "expense"]);
const VALID_CATEGORIES       = new Set(["food", "housing", "utilities", "transport", "entertainment", "salary", "other"]);
const VALID_CURRENCIES       = new Set(["USD", "EUR", "GBP", "TRY", "JPY", "CAD", "AUD", "CHF"]);
const VALID_BILLING_CYCLES   = new Set(["weekly", "monthly", "yearly"]);
const VALID_SUB_CATEGORIES   = new Set(["ai", "entertainment", "music", "finance", "productivity", "health", "news", "telecom", "other"]);

// Categories include the base set plus the user's saved custom_categories.
async function isCategoryAllowedForUser(userId, category) {
  if (!category) return false;
  if (VALID_CATEGORIES.has(category)) return true;
  try {
    const { rows } = await pool.query(
      "SELECT custom_categories FROM users WHERE id = $1",
      [userId]
    );
    const list = rows[0]?.custom_categories;
    if (!Array.isArray(list)) return false;
    return list.some(c => c && typeof c === "object" && c.id === category);
  } catch (err) {
    console.error("isCategoryAllowedForUser:", err);
    return false;
  }
}

function trimStr(val, maxLen) {
  if (typeof val !== "string") return null;
  const s = val.trim();
  return s.length > 0 && s.length <= maxLen ? s : null;
}
function isValidEmail(email) {
  const s = trimStr(email, 255);
  return s && EMAIL_RE.test(s) ? s : null;
}
function isValidPhone(phone) {
  const s = trimStr(phone, 20);
  return s && PHONE_RE.test(s) ? s : null;
}
function isValidToken(token) {
  const s = trimStr(token, 128);
  return s && HEX64_RE.test(s) ? s : null;
}
function isValidId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}
function isValidAmount(amount) {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 && n < 1_000_000_000 ? n : null;
}
function isValidDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "Password required";
  if (password.length < 8)   return "Password must be at least 8 characters";
  if (password.length > 128) return "Password too long";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

// [FIX 6] token_version — reads cookie first, falls back to Bearer header
const authMiddleware = async (req, res, next) => {
  const raw =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!raw) return res.status(401).json({ error: "Unauthorized" });

  let payload;
  try {
    // [FIX 2] Explicit algorithm prevents none/RS256 downgrade
    payload = jwt.verify(raw, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const tv = await pool.query("SELECT token_version FROM users WHERE id = $1", [payload.id]);
    if (!tv.rows.length) return res.status(401).json({ error: "User not found" });
    const dbTv = tv.rows[0].token_version;
    if (dbTv != null && payload.tv != null && payload.tv !== dbTv) {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
  } catch {
    // token_version column may not exist yet — skip version check, still allow request
  }

  req.user = payload;
  next();
};

app.get("/", (req, res) => res.send("Backend running 🚀"));

// ─── Exchange rates (daily server-side cache) ────────────────────────────────
const _ratesCache = {};
app.get("/rates", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to required" });
  if (from === to) return res.json({ rate: 1 });
  const key = `${from}|${to}`;
  const cached = _ratesCache[key];
  if (cached && Date.now() - cached.ts < 86_400_000) return res.json({ rate: cached.rate });
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`);
    const data = await r.json();
    const rate = data.rates?.[to];
    if (!rate) return res.status(502).json({ error: "rate not found" });
    _ratesCache[key] = { rate, ts: Date.now() };
    res.json({ rate });
  } catch {
    res.status(502).json({ error: "failed to fetch rate" });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

app.get("/admin/users", async (req, res) => {
  // [FIX 3] Timing-safe comparison prevents secret extraction via response-time attacks
  const provided = Buffer.from(req.headers["x-admin-secret"] || "");
  const expected = Buffer.from(ADMIN_SECRET);
  const valid = provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);
  if (!valid) return res.status(403).json({ error: "Forbidden" });

  try {
    const result = await pool.query(
      "SELECT id, email, is_verified, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
  const email    = isValidEmail(req.body.email);
  const password = trimStr(req.body.password, 128);

  if (!email)    return res.status(400).json({ error: "Valid email required" });
  if (!password) return res.status(400).json({ error: "Password required" });

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const password_hash = await bcrypt.hash(password, 10);
    const verifyToken   = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const defaultUsername = email.split("@")[0].slice(0, 50);

    await pool.query(
      `INSERT INTO users (email, password, is_verified, verify_token, verify_expires, username)
       VALUES ($1, $2, FALSE, $3, $4, $5)`,
      [email, password_hash, verifyToken, verifyExpires, defaultUsername]
    );

    const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:3000"}/auth/verify?token=${verifyToken}`;
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F7F4ED;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://birik.furunci.tech/birik.png" width="48" height="48" alt="Birik" style="border-radius:12px;display:inline-block;"/>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Birik</h2>
            <p style="color:#64748b;margin:0;font-size:14px;">Email Verification</p>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #DDD8CE;">
            <p style="color:#334155;margin:0 0 20px;">Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
            <a href="${verifyUrl}" style="display:block;text-align:center;background:#37C978;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Verify Email</a>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">Or copy this link:<br/><span style="color:#37C978;">${verifyUrl}</span></p>
          </div>
        </div>`,
    });

    res.status(201).json({ message: "Verification email sent. Please check your inbox." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.get("/auth/verify", async (req, res) => {
  const token = isValidToken(req.query.token);
  if (!token) return res.status(400).send("Invalid or missing token");

  try {
    const result = await pool.query("SELECT * FROM users WHERE verify_token = $1", [token]);
    if (result.rows.length === 0)
      return res.status(400).send(verifyHtmlPage("Invalid or already used verification link.", false));

    const user = result.rows[0];
    if (new Date() > new Date(user.verify_expires))
      return res.status(400).send(verifyHtmlPage("Verification link has expired. Please register again.", false));

    await pool.query(
      "UPDATE users SET is_verified = TRUE, verify_token = NULL, verify_expires = NULL WHERE id = $1",
      [user.id]
    );
    res.send(verifyHtmlPage("Email verified! You can now sign in.", true));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

function verifyHtmlPage(message, success) {
  const color = success ? "#37C978" : "#E04F4F";
  const icon  = success ? "✓" : "✕";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification — Birik</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0D0D0D;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
    .card{background:#15151A;border:1px solid #262630;border-radius:20px;padding:40px 32px;max-width:400px;width:100%;text-align:center;}
    .logo{border-radius:12px;display:inline-block;margin-bottom:20px;}
    .icon{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:26px;font-weight:bold;}
    .title{font-size:22px;font-weight:700;color:#F5F5F5;margin-bottom:10px;}
    .msg{color:#A8A8B0;font-size:15px;line-height:1.5;margin-bottom:28px;}
    .btn{display:inline-block;background:#37C978;color:#fff;text-decoration:none;padding:13px 36px;border-radius:12px;font-weight:600;font-size:15px;}
  </style>
</head>
<body>
  <div class="card">
    <img src="https://birik.furunci.tech/birik.png" width="56" height="56" alt="Birik" class="logo"/>
    <div class="icon" style="background:${color}22;color:${color};">${icon}</div>
    <div class="title">Birik</div>
    <p class="msg">${message}</p>
    <a href="${FRONTEND_URL}" class="btn">Go to App</a>
  </div>
</body>
</html>`;
}

app.post("/auth/login", async (req, res) => {
  const password = trimStr(req.body.password, 128);
  if (!password) return res.status(400).json({ error: "Credentials required" });

  const email = req.body.email ? isValidEmail(req.body.email) : null;
  const phone = req.body.phone ? isValidPhone(req.body.phone) : null;
  if (!email && !phone) return res.status(400).json({ error: "Valid email or phone required" });

  try {
    const result = phone
      ? await pool.query("SELECT * FROM users WHERE phone = $1", [phone])
      : await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: "Invalid credentials" });

    // Only block if there is an active pending verification token (accounts created before
    // email verification was added have is_verified=false but no verify_token — allow those)
    if (!user.is_verified && user.verify_token)
      return res.status(403).json({ error: "Please verify your email before logging in. Check your inbox." });

    const tv = user.token_version ?? 0;
    // [FIX 2] Explicit algorithm on sign
    const jwtToken = jwt.sign({ id: user.id, email: user.email, tv }, JWT_SECRET, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    res.cookie("token", jwtToken, COOKIE_OPTS);
    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        username: user.username || null,
        currency: user.currency || "USD",
        custom_categories: user.custom_categories || [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// [FIX 7] Logout — clears the httpOnly cookie
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ message: "Logged out" });
});

app.post("/auth/register-phone", async (req, res) => {
  if (!admin.apps.length)
    return res.status(503).json({ error: "SMS registration not configured on server" });

  const firebaseToken = trimStr(req.body.firebaseToken, 2048);
  const phone         = isValidPhone(req.body.phone);
  const password      = trimStr(req.body.password, 128);

  if (!firebaseToken) return res.status(400).json({ error: "firebaseToken required" });
  if (!phone)         return res.status(400).json({ error: "Valid phone number required (E.164 format)" });
  if (!password)      return res.status(400).json({ error: "Password required" });

  try {
    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    if (decoded.phone_number !== phone)
      return res.status(400).json({ error: "Phone number mismatch" });

    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Phone number already registered" });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (phone, password, is_verified, verify_method) VALUES ($1, $2, TRUE, 'sms')`,
      [phone, password_hash]
    );
    res.status(201).json({ message: "Account created successfully." });
  } catch (err) {
    console.error(err);
    if (err.code === "auth/id-token-expired")
      return res.status(401).json({ error: "Verification expired. Please try again." });
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/auth/forgot-password", async (req, res) => {
  const email = isValidEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "Valid email required" });

  const SILENT_OK = { message: "If that email exists, a reset link has been sent." };

  try {
    const result = await pool.query(
      "SELECT id, reset_expires FROM users WHERE email = $1", [email]
    );
    if (result.rows.length === 0) return res.json(SILENT_OK);

    // [FIX 4] Per-user rate limit: reject if a reset was requested < 5 minutes ago.
    // reset_expires is set to NOW()+1h, so if it's still > NOW()+55m it was set <5m ago.
    const { reset_expires } = result.rows[0];
    if (reset_expires && new Date(reset_expires) > new Date(Date.now() + 55 * 60 * 1000)) {
      return res.json(SILENT_OK); // silent reject — no spam
    }

    const userId      = result.rows[0].id;
    const resetToken  = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
      [resetToken, resetExpires, userId]
    );

    const resetUrl = `${FRONTEND_URL}/?reset_token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F7F4ED;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://birik.furunci.tech/birik.png" width="48" height="48" alt="Birik" style="border-radius:12px;display:inline-block;"/>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Birik</h2>
            <p style="color:#64748b;margin:0;font-size:14px;">Password Reset</p>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #DDD8CE;">
            <p style="color:#334155;margin:0 0 8px;">You requested a password reset. Click below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
            <p style="color:#64748b;font-size:13px;margin:0 0 20px;">If you didn't request this, you can safely ignore this email.</p>
            <a href="${resetUrl}" style="display:block;text-align:center;background:#37C978;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Reset Password</a>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">Or copy this link:<br/><span style="color:#37C978;">${resetUrl}</span></p>
          </div>
        </div>`,
    });

    res.json(SILENT_OK);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  const token    = isValidToken(req.body.token);
  const password = trimStr(req.body.password, 128);

  if (!token)    return res.status(400).json({ error: "Invalid or missing reset token" });
  if (!password) return res.status(400).json({ error: "Password required" });

  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    // Must fetch first to check same-password constraint
    const lookup = await pool.query(
      "SELECT id, password, reset_expires FROM users WHERE reset_token = $1", [token]
    );
    if (lookup.rows.length === 0)
      return res.status(400).json({ error: "Invalid or expired reset link" });

    const user = lookup.rows[0];
    if (new Date() > new Date(user.reset_expires))
      return res.status(400).json({ error: "Reset link has expired. Please request a new one." });

    if (await bcrypt.compare(password, user.password))
      return res.status(400).json({ error: "Your new password cannot be the same as your old password" });

    const newHash = await bcrypt.hash(password, 10);

    // [FIX 5] Atomically consume token + [FIX 6] increment token_version in one UPDATE
    // This also ensures concurrent requests both fail after the first succeeds.
    await pool.query(
      `UPDATE users
         SET password = $1, reset_token = NULL, reset_expires = NULL,
             token_version = token_version + 1
       WHERE id = $2`,
      [newHash, user.id]
    );

    // [FIX 7] Clear the session cookie — user must re-login with new password
    res.clearCookie("token", { ...COOKIE_OPTS, maxAge: 0 });
    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ─── Authenticated routes ─────────────────────────────────────────────────────

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, phone, username, currency, custom_categories FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = result.rows[0];
    if (!user.username && user.email) {
      const fallback = user.email.split("@")[0].slice(0, 50);
      await pool.query("UPDATE users SET username = $1 WHERE id = $2", [fallback, user.id]);
      user.username = fallback;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.put("/auth/profile", authMiddleware, async (req, res) => {
  let username = null;
  if (req.body.username !== undefined && req.body.username !== null) {
    if (typeof req.body.username !== "string")
      return res.status(400).json({ error: "Invalid username" });
    const trimmed = req.body.username.trim();
    if (trimmed.length === 0)
      return res.status(400).json({ error: "Username cannot be empty" });
    if (trimmed.length > 50)
      return res.status(400).json({ error: "Username too long (max 50 characters)" });
    username = trimmed;
  }
  const currency = req.body.currency ? trimStr(req.body.currency, 10) : null;

  if (currency && !VALID_CURRENCIES.has(currency))
    return res.status(400).json({ error: "Invalid currency code" });

  let customCategories = undefined;
  if (req.body.custom_categories !== undefined) {
    if (!Array.isArray(req.body.custom_categories))
      return res.status(400).json({ error: "Invalid custom_categories" });
    // Validate each entry: { id: string, color: string }
    const valid = req.body.custom_categories.every(
      c => c && typeof c.id === "string" && typeof c.color === "string" &&
           c.id.length <= 50 && c.color.length <= 20
    );
    if (!valid) return res.status(400).json({ error: "Invalid category entry" });
    customCategories = JSON.stringify(req.body.custom_categories.slice(0, 30));
  }

  try {
    const result = await pool.query(
      `UPDATE users SET
         username = COALESCE($1, username),
         currency = COALESCE($2, currency),
         custom_categories = COALESCE($3::jsonb, custom_categories)
       WHERE id = $4
       RETURNING id, email, username, currency, custom_categories`,
      [username || null, currency || null, customCategories ?? null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/auth/account", authMiddleware, async (req, res) => {
  const password = trimStr(req.body.password, 128);
  if (!password) return res.status(400).json({ error: "Password required to delete account" });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT id, password FROM users WHERE id = $1",
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = userRes.rows[0];
    if (!user.password || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: "Incorrect password" });

    await client.query("BEGIN");
    await client.query("DELETE FROM transactions             WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM subscriptions            WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM budgets                  WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM recurring_transactions   WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM users                    WHERE id = $1",      [user.id]);
    await client.query("COMMIT");

    res.clearCookie("token", { ...COOKIE_OPTS, maxAge: 0 });
    res.json({ message: "Account deleted" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  } finally {
    client.release();
  }
});

app.get("/auth/check-phone", authMiddleware, async (req, res) => {
  const phone = isValidPhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: "Valid phone number required (E.164 format)" });
  try {
    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Phone number is already linked to another account" });
    res.json({ available: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check failed" });
  }
});

app.get("/auth/check-email", authMiddleware, async (req, res) => {
  const email = isValidEmail(req.query.email);
  if (!email) return res.status(400).json({ error: "Valid email required" });
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email is already linked to another account" });
    res.json({ available: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check failed" });
  }
});

app.post("/auth/link-phone", authMiddleware, async (req, res) => {
  if (!admin.apps.length) return res.status(503).json({ error: "SMS not configured on server" });

  const firebaseToken = trimStr(req.body.firebaseToken, 2048);
  const phone         = isValidPhone(req.body.phone);

  if (!firebaseToken) return res.status(400).json({ error: "firebaseToken required" });
  if (!phone)         return res.status(400).json({ error: "Valid phone number required (E.164 format)" });

  try {
    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    if (decoded.phone_number !== phone) return res.status(400).json({ error: "Phone number mismatch" });

    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Phone already linked to another account" });

    const result = await pool.query(
      "UPDATE users SET phone = $1 WHERE id = $2 RETURNING id, email, phone, username, currency",
      [phone, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to link phone" });
  }
});

app.post("/auth/link-email", authMiddleware, async (req, res) => {
  const email = isValidEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "Valid email required" });

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email already linked to another account" });

    // [FIX 4] Per-user rate limit for email linking
    const user = await pool.query("SELECT verify_expires FROM users WHERE id = $1", [req.user.id]);
    const ve = user.rows[0]?.verify_expires;
    if (ve && new Date(ve) > new Date(Date.now() + 23 * 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Please wait before requesting another link." });
    }

    const verifyToken   = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET pending_email = $1, verify_token = $2, verify_expires = $3 WHERE id = $4",
      [email, verifyToken, verifyExpires, req.user.id]
    );

    const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:3000"}/auth/link-email/verify?token=${verifyToken}`;
    await sendEmail({
      to: email,
      subject: "Link your email to Birik",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F7F4ED;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://birik.furunci.tech/birik.png" width="48" height="48" alt="Birik" style="border-radius:12px;display:inline-block;"/>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Birik</h2>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #DDD8CE;">
            <p style="color:#334155;margin:0 0 20px;">Click below to link this email to your account. This link expires in <strong>24 hours</strong>.</p>
            <a href="${verifyUrl}" style="display:block;text-align:center;background:#37C978;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Link Email</a>
          </div>
        </div>`,
    });
    res.json({ message: "Verification email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

app.get("/auth/link-email/verify", async (req, res) => {
  const token = isValidToken(req.query.token);
  if (!token) return res.status(400).send("Invalid or missing token");

  try {
    const result = await pool.query("SELECT * FROM users WHERE verify_token = $1", [token]);
    if (result.rows.length === 0)
      return res.status(400).send(verifyHtmlPage("Invalid or already used link.", false));

    const user = result.rows[0];
    if (new Date() > new Date(user.verify_expires))
      return res.status(400).send(verifyHtmlPage("Link has expired.", false));
    if (!user.pending_email)
      return res.status(400).send(verifyHtmlPage("No pending email to link.", false));

    await pool.query(
      "UPDATE users SET email = $1, pending_email = NULL, verify_token = NULL, verify_expires = NULL WHERE id = $2",
      [user.pending_email, user.id]
    );
    res.send(verifyHtmlPage("Email linked successfully! You can now sign in with your email.", true));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

app.get("/transactions", authMiddleware, async (req, res) => {
  try {
    // Lazy materialize any recurring transactions / auto-charge subscriptions that have come due
    try { await materializeDueRecurring(req.user.id); }     catch (e) { console.error("materialize recurring error:", e); }
    try { await materializeDueSubscriptions(req.user.id); } catch (e) { console.error("materialize subs error:", e); }
    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/transactions", authMiddleware, async (req, res) => {
  const description = trimStr(req.body.description, 200) ?? "";
  const amount      = isValidAmount(req.body.amount);
  const type        = trimStr(req.body.type, 20);
  const category    = trimStr(req.body.category, 50);
  const date        = isValidDate(req.body.date);

  if (amount === null)                               return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });
  if (!type || !VALID_TYPES.has(type))               return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
  if (!(await isCategoryAllowedForUser(req.user.id, category))) return res.status(400).json({ error: "Invalid category" });
  if (!date)                                         return res.status(400).json({ error: "Valid date required" });

  try {
    const result = await pool.query(
      `INSERT INTO transactions (description, amount, type, category, date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [description, amount, type, category, date, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.put("/transactions/:id", authMiddleware, async (req, res) => {
  const id          = isValidId(req.params.id);
  const description = trimStr(req.body.description, 200) ?? "";
  const amount      = isValidAmount(req.body.amount);
  const type        = trimStr(req.body.type, 20);
  const category    = trimStr(req.body.category, 50);

  if (!id)                                           return res.status(400).json({ error: "Invalid transaction ID" });
  if (amount === null)                               return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });
  if (!type || !VALID_TYPES.has(type))               return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
  if (!(await isCategoryAllowedForUser(req.user.id, category))) return res.status(400).json({ error: "Invalid category" });

  try {
    const result = await pool.query(
      `UPDATE transactions SET description=$1, amount=$2, type=$3, category=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [description, amount, type, category, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update error" });
  }
});

app.delete("/transactions/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid transaction ID" });

  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
    res.json({ message: "Deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete error" });
  }
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

app.get("/subscriptions", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY next_billing_date ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch error" });
  }
});

app.post("/subscriptions", authMiddleware, async (req, res) => {
  const name             = trimStr(req.body.name, 100);
  const amount           = isValidAmount(req.body.amount);
  const currency         = trimStr(req.body.currency, 10);
  const billing_cycle    = trimStr(req.body.billing_cycle, 20);
  const next_billing_date = isValidDate(req.body.next_billing_date);
  const category         = trimStr(req.body.category, 50);
  const started_at       = isValidDate(req.body.started_at);
  const notes            = trimStr(req.body.notes, 500) ?? null;
  const auto_charge      = typeof req.body.auto_charge === "boolean" ? req.body.auto_charge : false;
  const reminder_days    = [3, 7, 14].includes(Number(req.body.reminder_days)) ? Number(req.body.reminder_days) : null;

  if (!name)                                    return res.status(400).json({ error: "Name required" });
  if (amount === null)                          return res.status(400).json({ error: "Invalid amount" });
  if (!currency || !VALID_CURRENCIES.has(currency)) return res.status(400).json({ error: "Invalid currency" });
  if (!billing_cycle || !VALID_BILLING_CYCLES.has(billing_cycle)) return res.status(400).json({ error: "Invalid billing cycle" });
  if (!next_billing_date)                       return res.status(400).json({ error: "Invalid next billing date" });
  if (!category || !VALID_SUB_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });
  if (!started_at)                              return res.status(400).json({ error: "Invalid start date" });

  try {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, name, amount, currency, billing_cycle, next_billing_date, category, started_at, notes, auto_charge, reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.user.id, name, amount, currency, billing_cycle, next_billing_date, category, started_at, notes, auto_charge, reminder_days]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.put("/subscriptions/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid subscription ID" });

  const name             = trimStr(req.body.name, 100);
  const amount           = isValidAmount(req.body.amount);
  const currency         = trimStr(req.body.currency, 10);
  const billing_cycle    = trimStr(req.body.billing_cycle, 20);
  const next_billing_date = isValidDate(req.body.next_billing_date);
  const category         = trimStr(req.body.category, 50);
  const started_at       = isValidDate(req.body.started_at);
  const notes            = req.body.notes !== undefined ? (trimStr(req.body.notes, 500) ?? null) : undefined;
  const is_active        = typeof req.body.is_active === "boolean" ? req.body.is_active : null;
  const auto_charge      = typeof req.body.auto_charge === "boolean" ? req.body.auto_charge : null;
  const reminder_days    = req.body.reminder_days !== undefined
    ? ([3, 7, 14].includes(Number(req.body.reminder_days)) ? Number(req.body.reminder_days) : null)
    : undefined;

  if (!name)                                    return res.status(400).json({ error: "Name required" });
  if (amount === null)                          return res.status(400).json({ error: "Invalid amount" });
  if (!currency || !VALID_CURRENCIES.has(currency)) return res.status(400).json({ error: "Invalid currency" });
  if (!billing_cycle || !VALID_BILLING_CYCLES.has(billing_cycle)) return res.status(400).json({ error: "Invalid billing cycle" });
  if (!next_billing_date)                       return res.status(400).json({ error: "Invalid next billing date" });
  if (!category || !VALID_SUB_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });
  if (!started_at)                              return res.status(400).json({ error: "Invalid start date" });

  try {
    const result = await pool.query(
      `UPDATE subscriptions
       SET name=$1, amount=$2, currency=$3, billing_cycle=$4, next_billing_date=$5,
           category=$6, started_at=$7, notes=$8, is_active=$9, auto_charge=$10, reminder_days=$11
       WHERE id=$12 AND user_id=$13 RETURNING *`,
      [name, amount, currency, billing_cycle, next_billing_date, category, started_at,
       notes !== undefined ? notes : null,
       is_active !== null ? is_active : true,
       auto_charge !== null ? auto_charge : false,
       reminder_days !== undefined ? reminder_days : null,
       id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Subscription not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update error" });
  }
});

app.delete("/subscriptions/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid subscription ID" });

  try {
    const result = await pool.query(
      "DELETE FROM subscriptions WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Subscription not found" });
    res.json({ message: "Deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete error" });
  }
});

// ─── Recurring Transactions ───────────────────────────────────────────────────

const VALID_FREQUENCIES = new Set(["weekly", "monthly", "yearly"]);

function toISODate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

function advanceDate(isoDate, frequency, dayOfPeriod) {
  // isoDate is "YYYY-MM-DD". Returns next "YYYY-MM-DD" string.
  const [y, m, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  if (frequency === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
    if (typeof dayOfPeriod === "number" && dayOfPeriod >= 1 && dayOfPeriod <= 31) {
      const monthLen = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(dayOfPeriod, monthLen));
    }
  } else if (frequency === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
}

// Map subscription category → transaction category (must mirror SUB_TO_TX_CATEGORY in Subscriptions.jsx)
const SUB_TO_TX_CAT = {
  ai: "other", entertainment: "entertainment", music: "entertainment",
  finance: "other", productivity: "other", health: "other",
  news: "other", telecom: "utilities", other: "other",
};

async function materializeDueSubscriptions(userId) {
  const today = new Date().toISOString().split("T")[0];
  const due = await pool.query(
    `SELECT * FROM subscriptions
     WHERE user_id = $1 AND is_active = TRUE AND auto_charge = TRUE AND next_billing_date <= $2`,
    [userId, today]
  );
  for (const s of due.rows) {
    let cursor = toISODate(s.next_billing_date);
    let safety = 0;
    while (cursor <= today && safety < 60) {
      await pool.query(
        `INSERT INTO transactions (description, amount, type, category, date, user_id)
         VALUES ($1, $2, 'expense', $3, $4, $5)`,
        [s.name, s.amount, SUB_TO_TX_CAT[s.category] || "other", cursor, userId]
      );
      cursor = advanceDate(cursor, s.billing_cycle, null);
      safety++;
    }
    await pool.query(
      `UPDATE subscriptions SET next_billing_date=$1, last_charged_date=$2 WHERE id=$3`,
      [cursor, today, s.id]
    );
  }
}

async function materializeDueRecurring(userId) {
  const today = new Date().toISOString().split("T")[0];
  const due = await pool.query(
    `SELECT * FROM recurring_transactions
     WHERE user_id = $1 AND is_active = TRUE AND next_run_date <= $2`,
    [userId, today]
  );
  for (const r of due.rows) {
    let cursor = toISODate(r.next_run_date);
    const endISO = r.end_date ? toISODate(r.end_date) : null;
    let safety = 0;
    while (cursor <= today && safety < 60) {
      if (endISO && cursor > endISO) break;
      await pool.query(
        `INSERT INTO transactions (description, amount, type, category, date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [r.description, r.amount, r.type, r.category, cursor, userId]
      );
      cursor = advanceDate(cursor, r.frequency, r.day_of_period);
      safety++;
    }
    await pool.query(
      `UPDATE recurring_transactions SET next_run_date=$1, last_run_date=$2 WHERE id=$3`,
      [cursor, today, r.id]
    );
  }
}

app.get("/recurring", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM recurring_transactions WHERE user_id = $1 ORDER BY is_active DESC, next_run_date ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/recurring", authMiddleware, async (req, res) => {
  const description   = trimStr(req.body.description, 200) ?? "";
  const amount        = isValidAmount(req.body.amount);
  const type          = trimStr(req.body.type, 20);
  const category      = trimStr(req.body.category, 50);
  const frequency     = trimStr(req.body.frequency, 20);
  const start_date    = isValidDate(req.body.start_date);
  const end_date      = req.body.end_date ? isValidDate(req.body.end_date) : null;
  const day_of_period = Number.isInteger(req.body.day_of_period) ? req.body.day_of_period : null;
  const reminder_days = req.body.reminder_days === null || req.body.reminder_days === undefined
    ? null
    : (Number.isInteger(Number(req.body.reminder_days)) && Number(req.body.reminder_days) >= 0 && Number(req.body.reminder_days) <= 30
        ? Number(req.body.reminder_days)
        : null);

  if (amount === null)                                    return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });
  if (!type || !VALID_TYPES.has(type))                    return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
  if (!(await isCategoryAllowedForUser(req.user.id, category))) return res.status(400).json({ error: "Invalid category" });
  if (!frequency || !VALID_FREQUENCIES.has(frequency))    return res.status(400).json({ error: "Invalid frequency" });
  if (!start_date)                                        return res.status(400).json({ error: "Valid start_date required" });
  if (req.body.end_date && !end_date)                     return res.status(400).json({ error: "Invalid end_date" });

  try {
    const result = await pool.query(
      `INSERT INTO recurring_transactions
         (user_id, description, amount, type, category, frequency, day_of_period, start_date, end_date, next_run_date, reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $8, $10) RETURNING *`,
      [req.user.id, description, amount, type, category, frequency, day_of_period, start_date, end_date, reminder_days]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.put("/recurring/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid recurring ID" });

  const description   = trimStr(req.body.description, 200) ?? "";
  const amount        = isValidAmount(req.body.amount);
  const type          = trimStr(req.body.type, 20);
  const category      = trimStr(req.body.category, 50);
  const frequency     = trimStr(req.body.frequency, 20);
  const start_date    = isValidDate(req.body.start_date);
  const end_date      = req.body.end_date ? isValidDate(req.body.end_date) : null;
  const day_of_period = Number.isInteger(req.body.day_of_period) ? req.body.day_of_period : null;
  const is_active     = typeof req.body.is_active === "boolean" ? req.body.is_active : true;
  const reminder_days = req.body.reminder_days === null || req.body.reminder_days === undefined
    ? null
    : (Number.isInteger(Number(req.body.reminder_days)) && Number(req.body.reminder_days) >= 0 && Number(req.body.reminder_days) <= 30
        ? Number(req.body.reminder_days)
        : null);

  if (amount === null)                                    return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });
  if (!type || !VALID_TYPES.has(type))                    return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
  if (!(await isCategoryAllowedForUser(req.user.id, category))) return res.status(400).json({ error: "Invalid category" });
  if (!frequency || !VALID_FREQUENCIES.has(frequency))    return res.status(400).json({ error: "Invalid frequency" });
  if (!start_date)                                        return res.status(400).json({ error: "Valid start_date required" });

  try {
    const result = await pool.query(
      `UPDATE recurring_transactions
       SET description=$1, amount=$2, type=$3, category=$4, frequency=$5,
           day_of_period=$6, start_date=$7, end_date=$8, is_active=$9, reminder_days=$10
       WHERE id=$11 AND user_id=$12 RETURNING *`,
      [description, amount, type, category, frequency, day_of_period,
       start_date, end_date, is_active, reminder_days, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Recurring not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update error" });
  }
});

app.delete("/recurring/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid recurring ID" });

  try {
    const result = await pool.query(
      "DELETE FROM recurring_transactions WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Recurring not found" });
    res.json({ message: "Deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete error" });
  }
});

// ─── Statement Import ─────────────────────────────────────────────────────────

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF or image files (JPG, PNG, WEBP) are allowed"));
  },
});

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic.default()
  : null;

async function parseWithAI(buffer, mimeType) {
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY not set");

  const b64 = buffer.toString("base64");
  const contentBlock = mimeType === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
    : { type: "image",    source: { type: "base64", media_type: mimeType, data: b64 } };

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        contentBlock,
        { type: "text", text: `Extract financial transactions from this document. It may be a bank statement, credit card statement, OR a single-purchase receipt (fiş / fatura).
Return ONLY a valid JSON array — no markdown, no explanation.
Each item must have exactly these fields:
  date        – YYYY-MM-DD
  description – merchant or transaction name (string)
  amount      – positive number, no currency symbols
  type        – "expense" or "income"
  category    – one of: food, housing, utilities, transport, entertainment, salary, other

CRITICAL — Receipts (fiş / fatura) represent ONE purchase, not many:
If the document is a single point-of-sale receipt (gas station, supermarket, restaurant, etc.), output EXACTLY ONE transaction:
  - amount = the final TOPLAM / TOTAL paid (NOT subtotal, NOT individual line items unless the receipt has only one item)
  - description = the merchant name (from the header, e.g. "Shell", "Migros", "OPET", "BP")
  - date = the date printed on the receipt
NEVER output separate transactions for:
  - KDV, TOPKDV, VAT, TAX (these are taxes INCLUDED in the total — already part of TOPLAM)
  - ARA TOPLAM, SUBTOTAL (intermediate sums, not separate purchases)
  - TOPLAM, TOTAL, GENEL TOPLAM (the total — output ONLY this as the amount, with the merchant name as description)
  - Individual line items on a multi-item receipt — only emit ONE transaction for the whole receipt unless the user clearly listed multiple distinct purchases on separate receipts

CRITICAL — number format: Turkish/European receipts use . as thousands separator and , as decimal.
Examples: 18.410,00 = 18410.00 | 1.250,50 = 1250.50 | 99,90 = 99.90
Always output amount as a plain decimal number (e.g. 18410, not 18.41).

CRITICAL — Turkish installment payments (taksit): Lines may look like:
  "MERCHANT 2.198,00 TL İşlemin 2/3 Taksidi 732,66"
  The large number before "TL" is the TOTAL original price — do NOT use it.
  The number after "Taksidi" (e.g. 732,66) is the actual installment amount charged — USE THIS as the amount.
  Similarly "01.Tak", "02.Tak", "03.Tak" in the description means it is an installment transaction.

INSTALLMENT METADATA: When you identify a taksit (installment) transaction, ALSO include these two optional integer fields:
  installment_index – the current installment number (e.g. 2 for "2/3")
  installment_total – total installment count (e.g. 3 for "2/3")
  Only add these when clearly visible in the statement. If the installment fraction is not visible, omit them.

Category rules:
  food          → restaurants, cafes, supermarkets, food delivery
  housing       → rent, mortgage
  utilities     → electricity, water, gas, internet, phone bills
  transport     → fuel (benzin, mazot, motorin, LPG), gas stations (petrol, OPET, Shell, BP, TP), public transit, taxi, rideshare, car payments
  entertainment → streaming services, games, cinema, sports
  salary        → salary, wages, payroll
  other         → everything else

CRITICAL — Turkish credit card statement sign convention:
In Turkish credit card statements, a "+" at the end of a line means money was credited TO the card (i.e. a payment made to settle the card balance). It does NOT mean income.
- Lines ending with "+" are almost always card payments → SKIP them entirely
- The ONLY exception: lines ending with "+" that contain "iade" (refund) → these are merchant refunds → type "income"
- All other lines (no sign, or "-") are purchases → type "expense"

Skip these entirely — do NOT include in output:
- Any line ending with "+" UNLESS it contains "iade"
- Interest, fees: "faiz", "kkdf", "bsmv", "komisyon", "gecikme"
- Turkish: "hesaptan ödeme", "otomatik ödeme", "bankkart lira ile ödeme", "kredi kartı ödemesi", "hesap özeti ödemesi", "ekstreden transfer"
- Receipt tax/total lines (see above): KDV, TOPKDV, VAT, ARA TOPLAM, TOPLAM (these are NOT separate transactions)

Return only the JSON array.` }
      ]
    }]
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const list = JSON.parse(cleaned);
  if (!Array.isArray(list)) throw new Error("AI returned non-array");

  return list.map(tx => {
    const idx   = Number.isInteger(tx.installment_index) && tx.installment_index > 0 ? tx.installment_index : null;
    const total = Number.isInteger(tx.installment_total) && tx.installment_total > 1  ? tx.installment_total : null;
    const entry = {
      date:        String(tx.date || "").trim(),
      description: String(tx.description || "").trim(),
      amount:      Math.abs(Number(tx.amount)),
      type:        tx.type === "income" ? "income" : "expense",
      category:    VALID_CATEGORIES.has(tx.category) ? tx.category : "other",
    };
    if (idx !== null && total !== null) {
      entry.installment_index = idx;
      entry.installment_total = total;
    }
    return entry;
  }).filter(tx => tx.description && tx.amount > 0 && tx.amount < 1_000_000_000 && /^\d{4}-\d{2}-\d{2}$/.test(tx.date));
}

async function extractPdfText(buffer) {
  const { PDFParse } = pdfParse;
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  await parser.load();
  const result = await parser.getText();
  return result.text;
}

function categorize(desc) {
  if (/tikla gelsin|şok[- ]|bim[- ]|migros|carrefour|tazedirekt|market|restoran|cafe|kafe/i.test(desc)) return "food";
  if (/toplu ta[sş]ıma|otob[üu][sş]|metro |tren |taksi|taxi|uber|bisiklet/i.test(desc)) return "transport";
  if (/spotify|netflix|youtube|openai|chatgpt|steam|playstation|disney|twitch/i.test(desc)) return "entertainment";
  if (/elektrik|su fatura|doğalgaz|internet|ttnet|turk telekom|vodafone|turkcell/i.test(desc)) return "utilities";
  return "other";
}

function parseTRAmount(str) {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

const TR_MONTHS = {
  ocak: "01", şubat: "02", mart: "03", nisan: "04",
  mayıs: "05", haziran: "06", temmuz: "07", ağustos: "08",
  eylül: "09", ekim: "10", kasım: "11", aralık: "12",
};

// JS /i flag doesn't case-fold Turkish İ/ı — normalize before regex testing
function trNorm(s) {
  return s.replace(/İ/g,"I").replace(/ı/g,"i").replace(/Ğ/g,"G").replace(/ğ/g,"g")
          .replace(/Ş/g,"S").replace(/ş/g,"s").replace(/Ü/g,"U").replace(/ü/g,"u")
          .replace(/Ö/g,"O").replace(/ö/g,"o");
}

function parseTRMonthDate(str) {
  // "DD Month YYYY" or "D Month YYYY"
  const m = str.trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!m) return null;
  const month = TR_MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

function parseYapiKrediStatement(text) {
  const transactions = [];
  const monthNames = Object.keys(TR_MONTHS).map(k =>
    k.charAt(0).toUpperCase() + k.slice(1)
  ).join("|");
  // pdf-parse gives single-space separated text (no column alignment)
  const lineRe = new RegExp(
    `^(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\s+(.+?)\\s+(\\+?[\\d.]+,\\d{2})(?:\\s.*)?$`,
    "i"
  );
  const skipRe = /FAIZ|EKSTREDEN|^ODEME-/;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(lineRe);
    if (!m) continue;

    const [, day, monthStr, year, rawDesc, amountStr] = m;
    const month = TR_MONTHS[trNorm(monthStr).toLowerCase()];
    if (!month) continue;

    const desc = rawDesc.trim();
    if (skipRe.test(trNorm(desc))) continue;

    const date = `${year}-${month}-${day.padStart(2, "0")}`;
    const isCredit = amountStr.startsWith("+");
    const amount = parseTRAmount(amountStr.replace(/^\+/, ""));
    if (amount <= 0 || amount >= 1_000_000_000) continue;

    const type = isCredit && /iade/i.test(desc) ? "income" : isCredit ? null : "expense";
    if (!type) continue;

    transactions.push({ date, description: desc, amount, type, category: categorize(desc) });
  }

  return transactions;
}

function parseGenericStatement(text) {
  const transactions = [];

  // Date patterns: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
  const dmyRe = /(\d{2}[/.\-]\d{2}[/.\-]\d{4})/;
  // Date pattern: DD Month YYYY (Turkish month names)
  const monthNames = Object.keys(TR_MONTHS).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join("|");
  const trMonthRe = new RegExp(`(\\d{1,2}\\s+(?:${monthNames})\\s+\\d{4})`, "i");

  // Amount: optional +/-, digits with dots/commas, ends with ,XX (Turkish format)
  const amountRe = /([+-]?[\d.]+,\d{2})\s*$/;

  // Skip-list: common non-transaction lines
  const skipRe = /hesaptan\s+ödeme|^kkdf|kredi faizi|taksit faizi|bsmv|dönem faizi|gecikme faizi|ekstreden transfer|kredi karti ödemesi|hesap özeti ödemesi|toplam|tutar|bakiye|limit|borç|alacak|minimum ödeme|son ödeme/i;

  for (const rawLine of text.split("\n")) {
    const amountMatch = rawLine.match(amountRe);
    if (!amountMatch) continue;

    let date = null;
    let descStart = 0;
    let descEnd = rawLine.lastIndexOf(amountMatch[0]);

    const dmyMatch = rawLine.match(dmyRe);
    const trMonthMatch = rawLine.match(trMonthRe);

    if (dmyMatch) {
      const parts = dmyMatch[1].replace(/[.-]/g, "/").split("/");
      date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      descStart = rawLine.indexOf(dmyMatch[1]) + dmyMatch[1].length;
    } else if (trMonthMatch) {
      date = parseTRMonthDate(trMonthMatch[1]);
      descStart = rawLine.indexOf(trMonthMatch[1]) + trMonthMatch[1].length;
    } else {
      continue;
    }

    if (!date) continue;

    const desc = rawLine.slice(descStart, descEnd).trim().replace(/\s+/g, " ");
    if (!desc || desc.length < 2) continue;
    if (skipRe.test(desc)) continue;

    const isCredit = amountMatch[1].startsWith("+");
    const amount = parseTRAmount(amountMatch[1].replace(/^\+/, ""));
    if (amount <= 0 || amount >= 1_000_000_000) continue;

    const type = isCredit && /iade/i.test(desc) ? "income" : isCredit ? null : "expense";
    if (!type) continue;

    transactions.push({ date, description: desc, amount, type, category: categorize(desc) });
  }

  // Deduplicate: same date+description+amount may appear twice (e.g. statement date vs transaction date)
  const seen = new Set();
  return transactions.filter(tx => {
    const key = `${tx.date}|${tx.description}|${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectBankAndParse(text) {
  if (/worldpuan|worldcard|yapi.*kredi/i.test(trNorm(text))) {
    return parseYapiKrediStatement(text);
  }
  if (/ziraat/i.test(text)) {
    return parseZiraatStatement(text);
  }
  // Generic fallback for any other bank
  return parseGenericStatement(text);
}

function parseZiraatStatement(text) {
  const transactions = [];
  // Layout line: [optional space] DD/MM/YYYY  DESCRIPTION  [INSTALLMENT INFO]  AMOUNT[+]
  const lineRe = /^\s*(\d{2}\/\d{2}\/\d{4})\s{2,}(.+?)\s{3,}([\d.]+,\d{2})(\+)?\s*$/;

  for (const rawLine of text.split("\n")) {
    const m = rawLine.match(lineRe);
    if (!m) continue;

    const [, dateStr, rawDesc, amountStr, plus] = m;
    const isCredit = plus === "+";

    // Remove installment suffix from description (e.g. "854,80 TL İşlemin 3/3 Taksidi")
    const desc = rawDesc.replace(/\s{3,}[\d.,]+\s+TL.*$/i, "").trim();

    // Skip payments to credit card
    if (/hesaptan\s+ödeme/i.test(desc)) continue;
    // Skip bank fees and interest
    if (/^(kkdf|kredi faizi|taksit faizi|bsmv)/i.test(desc)) continue;

    const [dd, mm, yyyy] = dateStr.split("/");
    const date = `${yyyy}-${mm}-${dd}`;
    const amount = parseTRAmount(amountStr);
    if (amount <= 0 || amount >= 1_000_000_000) continue;

    // Refunds (Satis Iade with +) → income; regular charges → expense
    const type = isCredit && /iade/i.test(desc) ? "income" : "expense";
    if (isCredit && type !== "income") continue; // skip non-refund credits

    transactions.push({ date, description: desc, amount, type, category: categorize(desc) });
  }

  return transactions;
}

app.post("/transactions/import", authMiddleware, upload.single("statement"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File required (PDF, JPG, PNG, or WEBP)" });

  let parsed = [];
  const mime = req.file.mimetype;

  // AI path — used when ANTHROPIC_API_KEY is set (supports any bank, any file type)
  if (anthropic) {
    try {
      parsed = await parseWithAI(req.file.buffer, mime);
    } catch (err) {
      console.error("AI parse failed:", err.message);
      // Fall through to regex fallback for PDFs
    }
  }

  // Regex fallback — PDF only, Ziraat / Yapı Kredi / generic
  if (parsed.length === 0 && mime === "application/pdf") {
    try {
      const text = await extractPdfText(req.file.buffer);
      parsed = detectBankAndParse(text);
    } catch {
      // ignore
    }
  }

  if (parsed.length === 0) {
    const hint = anthropic
      ? "No transactions found. Make sure the file is a clear bank or credit card statement."
      : "No transactions found. Add ANTHROPIC_API_KEY for AI-powered import, or upload a Ziraat / Yapı Kredi PDF.";
    return res.status(422).json({ error: hint });
  }

  if (req.query.preview === "true") {
    return res.json({ transactions: parsed });
  }

  try {
    for (const tx of parsed) {
      await pool.query(
        `INSERT INTO transactions (description, amount, type, category, date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tx.description, tx.amount, tx.type, tx.category, tx.date, req.user.id]
      );
    }
    res.json({ imported: parsed.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import transactions" });
  }
});

app.post("/transactions/import/bulk", authMiddleware, async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: "No transactions provided" });
  }
  if (transactions.length > 500) {
    return res.status(400).json({ error: "Too many transactions in one import (max 500)" });
  }
  try {
    const { rows: userRows } = await pool.query(
      "SELECT custom_categories FROM users WHERE id = $1",
      [req.user.id]
    );
    const customIds = Array.isArray(userRows[0]?.custom_categories)
      ? userRows[0].custom_categories.map(c => c?.id).filter(Boolean)
      : [];
    const allowedCategories = new Set([...VALID_CATEGORIES, ...customIds]);

    for (const tx of transactions) {
      const description = trimStr(tx.description, 500) ?? "";
      const amount      = Math.abs(Number(tx.amount)) || 0;
      const type        = trimStr(tx.type, 20);
      const category    = trimStr(tx.category, 50);
      const date        = isValidDate(tx.date) ?? new Date().toISOString().split("T")[0];

      if (!type || !VALID_TYPES.has(type))           continue;
      if (!category || !allowedCategories.has(category)) continue;

      await pool.query(
        `INSERT INTO transactions (description, amount, type, category, date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [description, amount, type, category, date, req.user.id]
      );
    }
    res.json({ imported: transactions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import transactions" });
  }
});

// ─── Budgets ──────────────────────────────────────────────────────────────────

app.get("/budgets", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, category, amount, notes FROM budgets WHERE user_id=$1 ORDER BY category",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch error" });
  }
});

app.put("/budgets", authMiddleware, async (req, res) => {
  const category = trimStr(req.body.category, 50);
  const amount   = isValidAmount(req.body.amount);
  const notes    = trimStr(req.body.notes, 500) ?? null;

  if (!(await isCategoryAllowedForUser(req.user.id, category))) return res.status(400).json({ error: "Invalid category" });
  if (amount === null) return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });

  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, amount, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category) DO UPDATE
         SET amount = EXCLUDED.amount, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING id, category, amount, notes`,
      [req.user.id, category, amount, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Save error" });
  }
});

app.delete("/budgets/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid budget ID" });

  try {
    const result = await pool.query(
      "DELETE FROM budgets WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Budget not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete error" });
  }
});

// ── Goals ────────────────────────────────────────────────────────────────────
app.get("/goals", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch error" });
  }
});

app.post("/goals", authMiddleware, async (req, res) => {
  const name          = trimStr(req.body.name, 100);
  const emoji         = trimStr(req.body.emoji, 10) || "🎯";
  const target_amount = isValidAmount(req.body.target_amount);
  const saved_amount  = isValidAmount(req.body.saved_amount ?? 0) ?? 0;
  const target_date   = isValidDate(req.body.target_date) ?? null;

  if (!name)               return res.status(400).json({ error: "Name required" });
  if (target_amount === null || target_amount <= 0) return res.status(400).json({ error: "Invalid target amount" });
  if (saved_amount < 0)    return res.status(400).json({ error: "Saved amount cannot be negative" });

  try {
    const result = await pool.query(
      `INSERT INTO goals (user_id, name, emoji, target_amount, saved_amount, currency, target_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name, emoji, target_amount, saved_amount, req.user.currency || "USD", target_date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.put("/goals/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid goal ID" });

  const name          = trimStr(req.body.name, 100);
  const emoji         = trimStr(req.body.emoji, 10) || "🎯";
  const target_amount = isValidAmount(req.body.target_amount);
  const saved_amount  = isValidAmount(req.body.saved_amount ?? 0) ?? 0;
  const target_date   = req.body.target_date !== undefined ? (isValidDate(req.body.target_date) ?? null) : undefined;

  if (!name)               return res.status(400).json({ error: "Name required" });
  if (target_amount === null || target_amount <= 0) return res.status(400).json({ error: "Invalid target amount" });
  if (saved_amount < 0)    return res.status(400).json({ error: "Saved amount cannot be negative" });

  try {
    const result = await pool.query(
      `UPDATE goals
       SET name=$1, emoji=$2, target_amount=$3, saved_amount=$4, target_date=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [name, emoji, target_amount, saved_amount,
       target_date !== undefined ? target_date : null,
       id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Goal not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update error" });
  }
});

app.delete("/goals/:id", authMiddleware, async (req, res) => {
  const id = isValidId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid goal ID" });

  try {
    const result = await pool.query(
      "DELETE FROM goals WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Goal not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete error" });
  }
});

// ── Bill reminder emails ──────────────────────────────────────────────────────
async function sendSubscriptionReminders() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const result = await pool.query(
      `SELECT s.id, s.name, s.amount, s.currency, s.next_billing_date, s.reminder_days,
              u.email, u.username
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.is_active = TRUE
         AND s.reminder_days IS NOT NULL
         AND (s.next_billing_date - s.reminder_days * INTERVAL '1 day')::date = $1`,
      [today]
    );

    for (const row of result.rows) {
      const dueDate = new Date(row.next_billing_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const rawSubName = String(row.name || "").replace(/[\r\n]+/g, " ");
      const name = escapeHtml(row.username || row.email.split("@")[0]);
      const subName = escapeHtml(rawSubName);
      const subCurrency = escapeHtml(row.currency);
      const reminderDays = Number(row.reminder_days) || 0;
      const dayLabel = reminderDays === 1 ? "" : "s";
      await sendEmail({
        to: row.email,
        subject: `Reminder: ${rawSubName} bills in ${reminderDays} day${dayLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 8px;font-size:20px">Hi ${name},</h2>
            <p style="color:#555;margin:0 0 20px">
              Just a heads-up — your <strong>${subName}</strong> subscription is due in
              <strong>${reminderDays} day${dayLabel}</strong>.
            </p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:20px">
              <p style="margin:0 0 4px;font-size:13px;color:#888">NEXT BILLING DATE</p>
              <p style="margin:0;font-size:18px;font-weight:600">${dueDate}</p>
              <p style="margin:6px 0 0;font-size:16px;color:#333">${subCurrency} ${parseFloat(row.amount).toFixed(2)}</p>
            </div>
            <p style="font-size:12px;color:#aaa;margin:0">Sent by Birik · Manage reminders in your Subscriptions tab</p>
          </div>`,
      });
    }

    if (result.rows.length > 0) {
      console.log(`[reminders] Sent ${result.rows.length} subscription reminder(s) for ${today}`);
    }
  } catch (err) {
    console.error("[reminders] Error sending subscription reminders:", err);
  }
}

// Run reminder check once at startup, then every 24 hours
let _lastReminderDate = "";
async function maybeRunReminders() {
  const today = new Date().toISOString().split("T")[0];
  if (today !== _lastReminderDate) {
    _lastReminderDate = today;
    await sendSubscriptionReminders();
  }
}
maybeRunReminders();
setInterval(maybeRunReminders, 60 * 60 * 1000); // check every hour

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
