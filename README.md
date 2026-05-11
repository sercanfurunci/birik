# Birik

A full-stack personal finance app to track income and expenses, manage budgets and subscriptions, set savings goals, and import bank statements with AI — with multi-currency support and a clean bilingual UI.

**Live app → [furunci.tech](https://furunci.tech)**

---

## Features

- **Dashboard** — balance overview, expense donut chart, recent activity, savings goals widget, this-month stats (avg daily spend, days left, top category, all-time savings rate)
- **Transactions** — add, edit, delete income & expenses with category tagging; search, date range filter, sort; CSV export
- **AI Statement Import** — upload a bank statement PDF or photo; AI extracts all transactions automatically
- **Analytics** — 30-day bar chart, stat cards, category breakdown, month-over-month spending trends
- **Budgets** — monthly spending limits per category with progress bars (green / yellow / red)
- **Subscriptions** — track recurring services with brand icons, auto-charge to expenses, bill reminder emails
- **Savings Goals** — create goals with emoji, target amount, optional deadline; progress bar turns green at 100%
- **Recurring Transactions** — schedule income/expense rules that materialize automatically on each visit
- **Multi-currency** — USD, EUR, GBP, TRY, JPY, CAD, AUD, CHF — syncs across devices via live exchange rates
- **Profile** — set display name and preferred currency
- **Auth** — email verification, JWT sessions, forgot/reset password (via Resend)
- **Dark / Light mode** — persisted per device
- **Bilingual** — English and Turkish (TR) throughout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| Auth | JWT, bcrypt |
| Email | Resend HTTPS API |
| AI | Anthropic claude-haiku-4-5 |
| Hosting | Vercel (frontend) + Railway (backend) |

## Local Development

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Resend](https://resend.com) account for transactional email
- An [Anthropic](https://console.anthropic.com) API key for AI statement import

### Frontend

```bash
npm install
```

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev       # http://localhost:5173
npm run build     # production build
npm run lint      # ESLint
```

### Backend

```bash
cd src/backend
npm install
```

Create `src/backend/.env`:

```env
JWT_SECRET=your_jwt_secret
ADMIN_SECRET=your_admin_secret
RESEND_API_KEY=your_resend_api_key
MAIL_FROM=noreply@yourdomain.com
ANTHROPIC_API_KEY=your_anthropic_api_key
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
DB_HOST=your_neon_host
DB_USER=your_db_user
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
```

```bash
node server.js    # http://localhost:3000
```

All tables are created automatically on first start via `CREATE TABLE IF NOT EXISTS`.

## Project Structure

```
src/
├── backend/
│   └── server.js              # Express API — auth, transactions, subscriptions,
│                              #   budgets, goals, recurring, rates, bill reminders
├── App.jsx                    # Root — auth state, tab navigation, theme
├── LandingPage.jsx            # Marketing page with live mock preview
├── Dashboard.jsx              # Donut chart + recent activity + goals widget
├── Analytics.jsx              # Bar chart + stats + spending trends
├── TransactionForm.jsx        # Add transaction form + recurring/import entry points
├── TransactionList.jsx        # Filterable list with edit/delete + CSV export
├── Budgets.jsx                # Monthly budget per category with progress bars
├── Subscriptions.jsx          # Subscription tracker with brand icons + reminder
├── Goals.jsx                  # Savings goals with progress bars
├── Summary.jsx                # Balance + income/expense cards
├── ProfileModal.jsx           # Display name + currency picker
├── currency.jsx               # Currency context + 8 supported currencies
├── i18n.jsx                   # EN/TR translations context
└── App.css                    # Design tokens + custom utility classes
```

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | — | Register + send verification email |
| GET | `/auth/verify` | — | Verify email token |
| POST | `/auth/login` | — | Login → JWT + user |
| POST | `/auth/forgot-password` | — | Send password reset email |
| POST | `/auth/reset-password` | — | Set new password |
| GET | `/auth/me` | JWT | Get current user profile |
| PUT | `/auth/profile` | JWT | Update username / currency |
| GET | `/transactions` | JWT | List transactions (also materializes due recurring + subscriptions) |
| POST | `/transactions` | JWT | Create transaction |
| PUT | `/transactions/:id` | JWT | Update transaction |
| DELETE | `/transactions/:id` | JWT | Delete transaction |
| POST | `/transactions/import` | JWT | AI statement import (PDF/image multipart) |
| POST | `/transactions/import/bulk` | JWT | Save previewed transactions in bulk |
| GET | `/subscriptions` | JWT | List subscriptions |
| POST | `/subscriptions` | JWT | Create subscription |
| PUT | `/subscriptions/:id` | JWT | Update subscription |
| DELETE | `/subscriptions/:id` | JWT | Delete subscription |
| GET | `/budgets` | JWT | List budgets |
| PUT | `/budgets` | JWT | Upsert budget by category |
| DELETE | `/budgets/:id` | JWT | Delete budget |
| GET | `/goals` | JWT | List savings goals |
| POST | `/goals` | JWT | Create goal |
| PUT | `/goals/:id` | JWT | Update goal |
| DELETE | `/goals/:id` | JWT | Delete goal |
| GET | `/recurring` | JWT | List recurring rules |
| POST | `/recurring` | JWT | Create recurring rule |
| PUT | `/recurring/:id` | JWT | Update / pause / resume rule |
| DELETE | `/recurring/:id` | JWT | Delete rule (keeps materialized transactions) |
| GET | `/rates` | — | Exchange rate `?from=X&to=Y` — 24h cache via Frankfurter |
| GET | `/admin/users` | x-admin-secret | List all users |
