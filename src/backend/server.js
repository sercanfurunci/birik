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
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith("http://localhost:") ||
      origin === FRONTEND_URL ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(helmet());

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false },
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

// ─── Input validation helpers ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

const VALID_TYPES            = new Set(["income", "expense"]);
const VALID_CATEGORIES       = new Set(["food", "housing", "utilities", "transport", "entertainment", "salary", "other"]);
const VALID_CURRENCIES       = new Set(["USD", "EUR", "GBP", "TRY", "JPY", "CAD", "AUD", "CHF"]);
const VALID_BILLING_CYCLES   = new Set(["weekly", "monthly", "yearly"]);
const VALID_SUB_CATEGORIES   = new Set(["ai", "entertainment", "music", "finance", "productivity", "health", "news", "other"]);

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

    await pool.query(
      `INSERT INTO users (email, password, is_verified, verify_token, verify_expires)
       VALUES ($1, $2, FALSE, $3, $4)`,
      [email, password_hash, verifyToken, verifyExpires]
    );

    const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:3000"}/auth/verify?token=${verifyToken}`;
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#7c3aed;color:#fff;font-size:22px;font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:12px;">$</div>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Finance Tracker</h2>
            <p style="color:#64748b;margin:0;font-size:14px;">Email Verification</p>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 20px;">Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
            <a href="${verifyUrl}" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Verify Email</a>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">Or copy this link:<br/><span style="color:#7c3aed;">${verifyUrl}</span></p>
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
  const color = success ? "#10b981" : "#ef4444";
  const icon  = success ? "✓" : "✕";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email Verification</title></head>
  <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;">
    <div style="text-align:center;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px 48px;max-width:400px;">
      <div style="width:56px;height:56px;border-radius:50%;background:${color}22;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;color:${color};">${icon}</div>
      <div style="font-size:24px;font-weight:bold;color:#fff;margin-bottom:8px;">Finance Tracker</div>
      <p style="color:#94a3b8;margin:0 0 24px;">${message}</p>
      <a href="${FRONTEND_URL}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 28px;border-radius:10px;font-weight:600;">Go to App</a>
    </div>
  </body></html>`;
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
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#7c3aed;color:#fff;font-size:22px;font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:12px;">$</div>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Finance Tracker</h2>
            <p style="color:#64748b;margin:0;font-size:14px;">Password Reset</p>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 8px;">You requested a password reset. Click below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
            <p style="color:#64748b;font-size:13px;margin:0 0 20px;">If you didn't request this, you can safely ignore this email.</p>
            <a href="${resetUrl}" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Reset Password</a>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">Or copy this link:<br/><span style="color:#7c3aed;">${resetUrl}</span></p>
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
      "SELECT id, email, phone, username, currency FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.put("/auth/profile", authMiddleware, async (req, res) => {
  const username = req.body.username ? trimStr(req.body.username, 50) : null;
  const currency = req.body.currency ? trimStr(req.body.currency, 10) : null;

  if (req.body.username !== undefined && username === null)
    return res.status(400).json({ error: "Username too long (max 50 characters)" });
  if (currency && !VALID_CURRENCIES.has(currency))
    return res.status(400).json({ error: "Invalid currency code" });

  try {
    const result = await pool.query(
      `UPDATE users SET
         username = COALESCE($1, username),
         currency = COALESCE($2, currency)
       WHERE id = $3
       RETURNING id, email, username, currency`,
      [username || null, currency || null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
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
    await transporter.sendMail({
      from: `"Finance Tracker" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Link your email to Finance Tracker",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#7c3aed;color:#fff;font-size:22px;font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:12px;">$</div>
            <h2 style="margin:12px 0 4px;color:#1e293b;">Finance Tracker</h2>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
            <p style="color:#334155;margin:0 0 20px;">Click below to link this email to your account. This link expires in <strong>24 hours</strong>.</p>
            <a href="${verifyUrl}" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:15px;">Link Email</a>
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
  if (!category || !VALID_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });
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
  if (!category || !VALID_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });

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

  if (!name)                                    return res.status(400).json({ error: "Name required" });
  if (amount === null)                          return res.status(400).json({ error: "Invalid amount" });
  if (!currency || !VALID_CURRENCIES.has(currency)) return res.status(400).json({ error: "Invalid currency" });
  if (!billing_cycle || !VALID_BILLING_CYCLES.has(billing_cycle)) return res.status(400).json({ error: "Invalid billing cycle" });
  if (!next_billing_date)                       return res.status(400).json({ error: "Invalid next billing date" });
  if (!category || !VALID_SUB_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });
  if (!started_at)                              return res.status(400).json({ error: "Invalid start date" });

  try {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, name, amount, currency, billing_cycle, next_billing_date, category, started_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, name, amount, currency, billing_cycle, next_billing_date, category, started_at, notes]
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
           category=$6, started_at=$7, notes=$8, is_active=$9
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [name, amount, currency, billing_cycle, next_billing_date, category, started_at,
       notes !== undefined ? notes : null,
       is_active !== null ? is_active : true,
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
        { type: "text", text: `Extract all transactions from this bank or credit card statement.
Return ONLY a valid JSON array — no markdown, no explanation.
Each item must have exactly these fields:
  date        – YYYY-MM-DD
  description – merchant or transaction name (string)
  amount      – positive number, no currency symbols
  type        – "expense" or "income"
  category    – one of: food, housing, utilities, transport, entertainment, salary, other

CRITICAL — number format: Turkish/European receipts use . as thousands separator and , as decimal.
Examples: 18.410,00 = 18410.00 | 1.250,50 = 1250.50 | 99,90 = 99.90
Always output amount as a plain decimal number (e.g. 18410, not 18.41).

CRITICAL — Turkish installment payments (taksit): Lines may look like:
  "MERCHANT 2.198,00 TL İşlemin 2/3 Taksidi 732,66"
  The large number before "TL" is the TOTAL original price — do NOT use it.
  The number after "Taksidi" (e.g. 732,66) is the actual installment amount charged — USE THIS as the amount.
  Similarly "01.Tak", "02.Tak", "03.Tak" in the description means it is an installment transaction.

Category rules:
  food          → restaurants, cafes, supermarkets, food delivery
  housing       → rent, mortgage
  utilities     → electricity, water, gas, internet, phone bills
  transport     → fuel, public transit, taxi, rideshare, car payments
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

Return only the JSON array.` }
      ]
    }]
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const list = JSON.parse(cleaned);
  if (!Array.isArray(list)) throw new Error("AI returned non-array");

  return list.map(tx => ({
    date:        String(tx.date || "").trim(),
    description: String(tx.description || "").trim(),
    amount:      Math.abs(Number(tx.amount)),
    type:        tx.type === "income" ? "income" : "expense",
    category:    VALID_CATEGORIES.has(tx.category) ? tx.category : "other",
  })).filter(tx => tx.description && tx.amount > 0 && tx.amount < 1_000_000_000 && /^\d{4}-\d{2}-\d{2}$/.test(tx.date));
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
  try {
    for (const tx of transactions) {
      await pool.query(
        `INSERT INTO transactions (description, amount, type, category, date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tx.description, Math.abs(Number(tx.amount)) || 0, tx.type, tx.category, tx.date, req.user.id]
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
      "SELECT id, category, amount FROM budgets WHERE user_id=$1 ORDER BY category",
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

  if (!category || !VALID_CATEGORIES.has(category)) return res.status(400).json({ error: "Invalid category" });
  if (amount === null) return res.status(400).json({ error: "Amount must be a positive number under 1 billion" });

  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category) DO UPDATE
         SET amount = EXCLUDED.amount, updated_at = NOW()
       RETURNING id, category, amount`,
      [req.user.id, category, amount]
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

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
