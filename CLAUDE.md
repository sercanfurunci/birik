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

Full-stack personal finance app. React 19 + Vite frontend, Express + PostgreSQL (Neon) backend, deployed on Vercel (frontend) + Render (backend).

### Deployment

- **Frontend**: Vercel — auto-deploys from GitHub `main`
- **Backend**: Render — auto-deploys from GitHub `main`, runs `src/backend/server.js`
- **Database**: Neon (PostgreSQL) — connection via `DATABASE_URL` or individual `DB_*` env vars

### Frontend environment variables

```
VITE_API_URL=https://expense-track-starter.onrender.com   # backend base URL
```

### Backend environment variables (Render)

```
JWT_SECRET, ADMIN_SECRET      # auth secrets
MAIL_USER, MAIL_PASS           # Gmail SMTP for verification/reset emails
BACKEND_URL                    # public URL of this backend (for email links)
FRONTEND_URL                   # Vercel frontend URL (for CORS + email links)
DB_HOST, DB_USER, DB_NAME, DB_PASSWORD, DB_PORT   # Neon PostgreSQL
```

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
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
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
```

Tables `subscriptions` and `budgets` auto-create on backend start via `CREATE TABLE IF NOT EXISTS`.

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
    ├── Subscriptions       # subscription tracker: list, add/edit/delete, monthly total, brand icons
    │   ├── SubForm         # add/edit modal
    │   ├── SubDetail       # detail/stats modal
    │   └── DeleteConfirm   # delete confirmation modal
    ├── StatementImportModal # AI-powered bank statement import (PDF/image, drag-and-drop)
    └── ProfileModal        # edit display name + currency picker (8 currencies)
```

### Key design decisions

- **No React Router** — navigation is `authPage` / `activeTab` state in `App.jsx`
- **No global state library** — state flows via props; `CurrencyProvider` and `LangProvider` are the only contexts
- **CSS design tokens** — all colors via CSS variables (`--bg`, `--surface`, `--brand`, `--green`, `--red`, etc.) on `:root` / `.dark`; dark mode toggled by `.dark` class on `<html>`
- **Currency** — stored per user in DB, fetched on every app load via `GET /auth/me` so changes sync across devices without re-login
- **Date normalization** — Neon returns ISO timestamps; use `date.split("T")[0]` before comparing to `YYYY-MM-DD` strings

### i18n

`src/i18n.jsx` — `LangProvider` + `useLang()` hook. Supports `en` and `tr`. All user-visible strings must go through `t("key")`. Add new keys to both `en` and `tr` objects.

### Styling

Tailwind CSS v4 + custom classes in `src/App.css`:
- `.fin-card` — surface card with border
- `.fin-label` — uppercase tracking label
- `.fin-serif` — DM Serif Display
- `.fin-mono` — JetBrains Mono (numbers/amounts)
- `.fin-btn-primary`, `.fin-icon-btn`, `.fin-input`, `.fin-select`
- `.anim-1` through `.anim-5` — staggered fade-up entrance animations
- `.tx-row` / `.tx-card-row` — transaction row with colored left accent bar

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
| GET | `/admin/users` | x-admin-secret | List all users |

### AI Statement Import

`parseWithAI()` in `server.js` uses `claude-haiku-4-5` via `ANTHROPIC_API_KEY`. Falls back to regex-based `parseGenericStatement()` / `parseZiraatStatement()` / `parseYapiKrediStatement()` if AI unavailable.

**Turkish installment (taksit) rule:** Lines like `"MERCHANT 2.198,00 TL İşlemin 2/3 Taksidi 732,66"` — the number after `Taksidi` is the actual charge (732,66), not the larger total (2.198,00).

### Subscriptions

- Brand icons via Google Favicon API: `https://www.google.com/s2/favicons?domain={domain}&sz=64`
- `SERVICE_DOMAIN` map in `Subscriptions.jsx` matches service names to domains; longest match wins
- Falls back to emoji if domain unknown or image fails to load
- Monthly total normalises weekly/yearly amounts: weekly × 52 / 12, yearly / 12

### Budgets

- One budget per user per category (enforced by `UNIQUE(user_id, category)`)
- Spending computed client-side: filter `transactions` where `type === 'expense'` and `date.slice(0,7) === current YYYY-MM`
- Progress bar color: green (< 80%), yellow (80–100%), red (> 100%)
- `salary` category is excluded from the category dropdown (income-only category)

### Spending Trends (Analytics)

- Compares current calendar month vs previous calendar month using `transactions` already loaded in `App`
- "Top movers" = top 3 categories by absolute change in spent amount (this month − last month)
- Hidden when no expenses exist in either month

### CSV Export (TransactionList)

- Client-side only — no backend involvement
- Exports the currently filtered list (respects type + category filters)
- UTF-8 BOM prepended for Excel; standard CSV escaping for quotes/commas/newlines
- Filename: `transactions-YYYY-MM-DD.csv`
