# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install frontend dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build

# Backend (src/backend/)
node src/backend/server.js   # Run backend locally on port 3000
```

## Architecture

Full-stack personal finance app called **Birik**. React 19 + Vite frontend, Express + PostgreSQL (Neon) backend.

### Deployment

- **Frontend**: Vercel — auto-deploys from GitHub `main`. Custom domain: `furunci.tech`
- **Backend**: Railway (Hobby plan, always-on, no cold starts) — auto-deploys from GitHub `main`
  - Custom Build Command: `cd src/backend && npm ci`
  - Custom Start Command: `node src/backend/server.js`
- **Database**: Neon (PostgreSQL) — connection via individual `DB_*` env vars
- **Email**: Resend HTTPS API (Railway blocks outbound SMTP — Gmail/Nodemailer won't work). Sending domain `furunci.tech` verified via DNS records in Resend dashboard.

### Frontend environment variables

```
VITE_API_URL=https://api.furunci.tech   # Railway backend (custom domain)
```

### Backend environment variables (Railway)

```
JWT_SECRET, ADMIN_SECRET            # auth secrets
RESEND_API_KEY                       # Resend HTTPS email API
MAIL_FROM=noreply@furunci.tech       # plain email, no display-name/<> (Railway misparses angle brackets)
BACKEND_URL                          # public URL of this backend (for email links)
FRONTEND_URL=https://furunci.tech    # primary frontend URL (used for CORS + email links)
ALLOWED_ORIGINS                      # optional comma-separated extra CORS origins
ANTHROPIC_API_KEY                    # for AI statement import (claude-haiku-4-5)
DB_HOST, DB_USER, DB_NAME, DB_PASSWORD, DB_PORT   # Neon PostgreSQL
```

`MAIL_USER` / `MAIL_PASS` (Gmail SMTP) still exist as code-level fallback in `transporter`, but are not used in production — Railway blocks ports 465/587.

### Database schema

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verify_token TEXT,
  verify_expires TIMESTAMP,
  reset_token TEXT,
  reset_expires TIMESTAMP,
  username TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  description TEXT,
  amount NUMERIC,
  type TEXT,         -- 'income' | 'expense'
  category TEXT,     -- 'food' | 'housing' | 'utilities' | 'transport' | 'entertainment' | 'salary' | 'other'
  date TIMESTAMP DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,   -- 'weekly' | 'monthly' | 'yearly'
  next_billing_date DATE NOT NULL,
  category TEXT DEFAULT 'other', -- 'ai' | 'entertainment' | 'music' | 'finance' | 'productivity' | 'health' | 'news' | 'other'
  started_at DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_charge BOOLEAN NOT NULL DEFAULT FALSE,  -- when TRUE, materializeDueSubscriptions logs each billing as an expense
  last_charged_date DATE,                       -- last date materialized as a transaction
  reminder_days INTEGER,                        -- 3 | 7 | 14 — days before next_billing_date to send reminder email
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Savings goals
CREATE TABLE goals (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  emoji          TEXT NOT NULL DEFAULT '🎯',
  target_amount  NUMERIC NOT NULL,
  saved_amount   NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  target_date    DATE,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Budgets (one row per user/category)
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,        -- same category set as transactions
  amount NUMERIC NOT NULL,       -- monthly limit in user's currency
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Recurring transactions (rules that materialize as transactions on schedule)
CREATE TABLE recurring_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,            -- 'income' | 'expense'
  category TEXT NOT NULL DEFAULT 'other',
  frequency TEXT NOT NULL,       -- 'weekly' | 'monthly' | 'yearly'
  day_of_period INTEGER,         -- monthly: 1..31, snapped to month length
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,   -- next scheduled materialization
  last_run_date DATE,            -- last time materializeDueRecurring ran for this rule
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Tables `subscriptions`, `budgets`, and `recurring_transactions` auto-create on backend start via `CREATE TABLE IF NOT EXISTS`.

If adding new columns: `ALTER TABLE users ADD COLUMN IF NOT EXISTS ...`

### Component tree

```
App                     # auth state, transactions state, theme, token, currentUser
├── LandingPage         # marketing page shown to unauthenticated users
├── LoginPage           # email + password login form
├── RegisterPage        # registration with email verification flow
├── ForgotPasswordPage  # sends reset email
├── ResetPasswordPage   # consumes reset token, sets new password
└── (authenticated)
    ├── CurrencyProvider    # context: current user's currency symbol
    ├── Dashboard           # donut chart + recent activity (uses Summary)
    │   └── Summary         # balance hero card + income/expense totals
    ├── TransactionForm     # add income/expense form (pill type toggle)
    ├── TransactionList     # filterable list, inline edit, delete modal, CSV export
    ├── Analytics           # 30-day bar chart + stat cards + category breakdown + month-over-month spending trends
    ├── Budgets             # monthly budget per category with progress bars; computes current-month spending from transactions prop
    │   ├── BudgetForm      # add/edit modal (category dropdown filtered to unset categories on add)
    │   └── DeleteConfirm   # delete confirmation modal
    ├── Subscriptions       # subscription tracker: list, add/edit/delete, monthly total, brand icons, reminder_days
    │   ├── SubForm         # add/edit modal (includes reminder_days dropdown)
    │   ├── SubDetail       # detail/stats modal
    │   └── DeleteConfirm   # delete confirmation modal
    ├── Goals               # savings goals: emoji, target/saved amounts, progress bar, optional deadline
    │   ├── GoalForm        # add/edit modal with emoji picker
    │   └── DeleteConfirm   # delete confirmation modal
    ├── StatementImportModal # AI-powered bank statement import (PDF/image, drag-and-drop)
    └── ProfileModal        # edit display name + currency picker (8 currencies)
```

### Key design decisions

- **No React Router** — navigation is `authPage` / `activeTab` state in `App.jsx`
- **No global state library** — state flows via props; `CurrencyProvider` and `LangProvider` are the only contexts
- **CSS design tokens** — all colors via CSS variables (`--bg`, `--surface`, `--brand`, `--green`, `--red`, etc.) on `:root` / `.dark`; dark mode toggled by `.dark` class on `<html>`
- **Currency** — stored per user in DB, fetched on every app load via `GET /auth/me` so changes sync across devices without re-login
- **Exchange rates** — fetched via backend `GET /rates?from=X&to=Y` (24-hour in-memory cache `_ratesCache`) so all devices see identical conversions on the same day. Frankfurter API is the upstream source.
- **Date normalization** — Neon returns ISO timestamps; use `date.split("T")[0]` before comparing to `YYYY-MM-DD` strings
- **Trust proxy** — backend calls `app.set("trust proxy", 1)` so Railway's `X-Forwarded-For` is honored (required for `express-rate-limit`)
- **Currency glyph rendering** — body/`fin-mono` font stacks include `-apple-system`, `Segoe UI`, `Roboto`, `ui-monospace`, `SF Mono` so older Android/iOS devices have a glyph for ₺ even before web fonts load

### i18n

`src/i18n.jsx` — `LangProvider` + `useLang()` hook. Supports `en` and `tr`. All user-visible strings must go through `t("key")`. Add new keys to both `en` and `tr` objects.

### Styling

Tailwind CSS v4 + custom classes in `src/App.css`:
- `.fin-card` — surface card with border, subtle shadow + hover lift
- `.fin-label` — uppercase tracking label
- `.fin-serif` — DM Serif Display (with Georgia / Times New Roman fallbacks)
- `.fin-mono` — JetBrains Mono (with `ui-monospace`, SF Mono, Menlo, Consolas fallbacks for ₺ glyph support)
- `.fin-btn-primary`, `.fin-icon-btn`, `.fin-input`, `.fin-select`
- `.anim-1` through `.anim-5` — staggered fade-up entrance animations
- `.tx-row` / `.tx-card-row` — transaction row with colored left accent bar
- `.birik-logo` — animated brick-stack logo with staggered `brickSlide` on load + `logoPulse` hover

Body background uses two radial gradients (brand-tinted top-left + warm gold bottom-right) over `--bg` for atmospheric depth. Shadow tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (separately tuned for light/dark).

Google Fonts are preconnected and preloaded in `index.html` to minimize first-render flicker on slow connections.

### Backend API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | — | Register (sends verification email) |
| GET | `/auth/verify` | — | Verify email via token |
| POST | `/auth/login` | — | Login → returns JWT + user |
| POST | `/auth/forgot-password` | — | Send reset email |
| POST | `/auth/reset-password` | — | Reset password with token |
| GET | `/auth/me` | JWT | Get current user profile |
| PUT | `/auth/profile` | JWT | Update username / currency |
| GET | `/transactions` | JWT | List user's transactions |
| POST | `/transactions` | JWT | Create transaction |
| PUT | `/transactions/:id` | JWT | Update transaction |
| DELETE | `/transactions/:id` | JWT | Delete transaction |
| POST | `/transactions/import` | JWT | AI statement import — upload PDF/image (multipart), returns `{ transactions }` with `?preview=true` |
| POST | `/transactions/import/bulk` | JWT | Save previewed transactions in bulk |
| GET | `/subscriptions` | JWT | List user's subscriptions |
| POST | `/subscriptions` | JWT | Create subscription |
| PUT | `/subscriptions/:id` | JWT | Update subscription |
| DELETE | `/subscriptions/:id` | JWT | Delete subscription |
| GET | `/budgets` | JWT | List user's budgets |
| PUT | `/budgets` | JWT | Upsert budget by category — body `{ category, amount }` |
| DELETE | `/budgets/:id` | JWT | Delete budget |
| GET | `/goals` | JWT | List savings goals |
| POST | `/goals` | JWT | Create goal |
| PUT | `/goals/:id` | JWT | Update goal |
| DELETE | `/goals/:id` | JWT | Delete goal |
| GET | `/recurring` | JWT | List recurring rules |
| POST | `/recurring` | JWT | Create recurring rule |
| PUT | `/recurring/:id` | JWT | Update recurring rule (incl. pause/resume via `is_active`) |
| DELETE | `/recurring/:id` | JWT | Delete recurring rule (already-materialized transactions are kept) |
| GET | `/rates` | — | Exchange rate lookup `?from=X&to=Y` — 24h server-side cache via Frankfurter API |
| GET | `/admin/users` | x-admin-secret | List all users |

### Email (Resend)

`sendEmail({ to, subject, html, from })` helper in `server.js` wraps the Resend SDK (`@resend/node`). All transactional email (verification, password reset, link emails) goes through it. If `RESEND_API_KEY` is unset, falls back to Nodemailer SMTP — but this fails on Railway because outbound SMTP is blocked. Always use Resend in production.

### AI Statement Import

`parseWithAI()` in `server.js` uses `claude-haiku-4-5` via `ANTHROPIC_API_KEY`. Falls back to regex-based `parseGenericStatement()` / `parseZiraatStatement()` / `parseYapiKrediStatement()` if AI unavailable.

**Turkish installment (taksit) rule:** Lines like `"MERCHANT 2.198,00 TL İşlemin 2/3 Taksidi 732,66"` — the number after `Taksidi` is the actual charge (732,66), not the larger total (2.198,00).

### Subscriptions

- Brand icons via Google Favicon API: `https://www.google.com/s2/favicons?domain={domain}&sz=64`
- `SERVICE_DOMAIN` map in `Subscriptions.jsx` matches service names to domains; longest match wins
- Falls back to emoji if domain unknown or image fails to load
- Monthly total normalises weekly/yearly amounts: weekly × 52 / 12, yearly / 12
- **Auto-charge:** Per-row `auto_charge` boolean. When ON, `materializeDueSubscriptions(userId)` (called inside `GET /transactions` alongside `materializeDueRecurring`) walks each subscription where `auto_charge = TRUE AND is_active = TRUE AND next_billing_date <= today`, INSERTs an expense transaction (category mapped via backend `SUB_TO_TX_CAT`), advances `next_billing_date` per `billing_cycle`, and stamps `last_charged_date`. 60-iteration safety cap. Off = tracking-only; user must press "Add as expense" manually.
- **Bill reminders:** Per-row `reminder_days` (3 | 7 | 14 | null). `sendSubscriptionReminders()` runs on server start and every hour via `setInterval`; fires once per calendar day (`_lastReminderDate` guard). Queries subscriptions where `(next_billing_date - reminder_days days) = today` and sends a branded HTML email via Resend to each affected user.
- **Overlap with Recurring:** Branded services live in Subscriptions (with auto_charge ON for hands-off logging). Recurring is for non-branded periodic items (rent, salary, gym). The Recurring form warns if the description matches an existing subscription name to prevent double-counting.

### Budgets

- One budget per user per category (enforced by `UNIQUE(user_id, category)`)
- Spending computed client-side: filter `transactions` where `type === 'expense'` and `date.slice(0,7) === current YYYY-MM`
- Progress bar color: green (< 80%), yellow (80–100%), red (> 100%)
- `salary` category is excluded from the category dropdown (income-only category)

### Recurring Transactions

- **Lazy materialization:** No cron. Inside `GET /transactions`, `materializeDueRecurring(userId)` walks each active rule whose `next_run_date <= today`, INSERTs a real transaction for each due occurrence, advances `next_run_date` (with monthly day-of-month snapping to month length), and updates `last_run_date`. A 60-occurrence safety cap prevents runaway loops.
- **Frequency:** `weekly` | `monthly` | `yearly`. Monthly rules carry `day_of_period` (1–31).
- **End date:** Optional. Materialization stops walking once `cursor > end_date`.
- **Pause/Resume:** Toggle `is_active` via `PUT /recurring/:id`.
- **Delete:** Removes the rule only — already-materialized transactions stay in the user's history.
- **UI entry point:** "Recurring" pill button in the TransactionForm header next to "Import Statement". Opens `Recurring.jsx` modal (list + form).

### Savings Goals

- One `goals` table row per goal; no category restriction
- `saved_amount` updated by the user manually (edit the goal to log new savings)
- Progress bar: brand color → turns green at 100%; shows remaining amount and percentage
- Dashboard widget: shows top 3 goals with mini progress bars; "See all →" navigates to Goals tab
- `monthsActive` helper in `Subscriptions.jsx` uses `Math.max(1, m)` (not `m+1`) to avoid off-by-one when subscription hasn't yet completed its second billing cycle

### Spending Trends (Analytics)

- Compares current calendar month vs previous calendar month using `transactions` already loaded in `App`
- "Top movers" = top 3 categories by absolute change in spent amount (this month − last month)
- Hidden when no expenses exist in either month

### CSV Export (TransactionList)

- Client-side only — no backend involvement
- Exports the currently filtered list (respects type + category filters)
- UTF-8 BOM prepended for Excel; standard CSV escaping for quotes/commas/newlines
- Filename: `transactions-YYYY-MM-DD.csv`

### TransactionList Filters

Beyond type + category filter pills, the list supports:
- **Search** — case-insensitive match on description
- **Date range** — `from` / `to` date inputs
- **Sort** — by date (newest/oldest) or amount (high/low)
- **Locale-aware dates** — formatted via `Intl.DateTimeFormat` using current `lang` (`en` / `tr`)

### Branding

- Name: **Birik** (formerly "Finance Tracker"). Strings come from `i18n.jsx` `appName` key.
- Logo: animated M-mark at `public/birik.svg` (also inlined in `App.jsx`, `LandingPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`). The `.birik-logo` class drives stroke-draw on load + pulse-glow on hover.
- Favicon: `/birik.svg`
