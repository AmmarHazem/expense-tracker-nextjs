# Expense Tracker

A full-stack expense tracking app built with Next.js 16, Google OAuth, PostgreSQL, and a brutalist electric-blue design system.

## Features

- **Google OAuth** — sign in with your Google account
- **Dashboard** — monthly stats, recent expenses, quick-add FAB
- **History** — expenses grouped by day, filterable by category and keyword search
- **Analytics** — bar chart, cumulative line chart, category donut chart, and breakdown table
- **Categories** — 7 default categories + create your own custom ones
- **Dark / Light mode** — system-aware, toggleable
- **AED currency** — all amounts displayed in UAE Dirhams
- **Mock data** — ~40 realistic expenses auto-seeded on first login

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (Google OAuth) |
| Database | PostgreSQL + Prisma 7 |
| DB Adapter | `@prisma/adapter-pg` |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Theme | next-themes |

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a cloud instance)
- A Google Cloud project with OAuth 2.0 credentials

## Setup

**1. Clone and install dependencies**

```bash
git clone <repo-url>
cd expense-tracker
npm install
```

**2. Create `.env.local`**

```bash
cp .env.example .env.local
```

Fill in your values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/expense_tracker"
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
```

**3. Set up Google OAuth credentials**

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID** → Web application
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Secret into `.env.local`

**4. Run the database migration**

```bash
npx prisma migrate dev --name init
```

**5. Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with Google and mock data will be seeded automatically on first login.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:seed      # Reset all data (users re-seed on next login)
npm run db:studio    # Open Prisma Studio to inspect the database
```

## Project Structure

```
app/
  (auth)/login/        # Public sign-in page
  (app)/               # Auth-guarded shell (Sidebar + TopBar)
    page.tsx           # Dashboard
    history/           # Timeline view
    analytics/         # Charts view
    categories/        # Category management
  api/auth/            # NextAuth route handler
components/
  ui/                  # Button, Input, Modal, Badge, Skeleton, Spinner
  layout/              # Sidebar, TopBar, NavLink, ThemeToggle
  dashboard/           # StatCard, RecentExpenses, QuickAddButton, EmptyState
  expenses/            # ExpenseCard, ExpenseForm, ExpenseModal, ExpenseGroup
  analytics/           # Charts, MetricsRow, DateRangePicker, CategoryBreakdownTable
  categories/          # CategoryBadge, ManageCategoriesModal
actions/               # Server Actions (expenses, categories, analytics)
lib/
  auth.ts              # NextAuth config + seed callback
  prisma.ts            # Singleton Prisma client (pg adapter)
  seed-user.ts         # Per-user first-login mock data seed
schemas/               # Zod validation schemas
types/                 # TypeScript types
prisma/
  schema.prisma        # Database schema
  seed.ts              # Global dev reset seed
```

## Default Categories

| Category | Emoji | Color |
|---|---|---|
| Food | 🍔 | `#FF6B6B` |
| Transport | 🚗 | `#4ECDC4` |
| Housing | 🏠 | `#45B7D1` |
| Entertainment | 🎮 | `#F7DC6F` |
| Health | 💊 | `#A8D5A2` |
| Shopping | 🛍️ | `#C39BD3` |
| Travel | ✈️ | `#F0A500` |

## PDF import execution

The upload route schedules `processImport` after returning a job ID. The import
module normalizes deterministic and AI extraction into signed statement
transactions, imports only debits, and prefers the user's latest merchant
category mapping over category suggestions. Missing default categories are filled
in without replacing existing categories.

Expense insertion, category repair, and successful job completion share one
PostgreSQL transaction. A conditional job transition prevents repeated or
concurrent execution of the same job from inserting expenses twice. Separate
uploads are separate jobs; this does not detect duplicates across uploads.
Failed jobs are terminal. If recording an error also fails, it is logged and the
job can remain processing; this workflow does not add durable retries.

### Import integration tests

Use a disposable PostgreSQL database, never the app's database. The tests require
`TEST_DATABASE_URL`, apply the checked-in migrations to a unique schema, and
remove that schema afterward. Tests control AI extraction and usually PDF text,
with one synthetic PDF exercising the real text adapter. No live AI request is made.

```bash
docker run --detach --rm --name expense-import-test-db \
  -e POSTGRES_PASSWORD=import-test -e POSTGRES_DB=import_test \
  -p 127.0.0.1:55439:5432 postgres:17-alpine
# Wait until PostgreSQL is ready, then run:
TEST_DATABASE_URL=postgresql://postgres:import-test@127.0.0.1:55439/import_test npm run test:imports
docker stop expense-import-test-db
```

The suite covers extraction selection, merchant category precedence, partial
category catalogues, invalid input, terminal jobs, concurrent execution, separate
uploads, and rollback when either expense insertion or completion fails.

### History pagination browser regression tests

`npm run test:history` tests the actual production build through gstack browse.
It starts a separate app on port 3102, creates a temporary user with 520 expenses
(including 260 matching search/category filters), and removes its user and data
afterward. It requires a disposable local database whose name ends in
`_history_test`; it never uses the app's `DATABASE_URL`.

```bash
npm run build
docker run --detach --rm --name history-pagination-test-db \
  -e POSTGRES_PASSWORD=history-test -e POSTGRES_DB=expense_history_test \
  -p 127.0.0.1:55440:5432 postgres:17-alpine
# Wait for PostgreSQL to be ready. Point BROWSE_BIN at your installed gstack
# browse executable, or an executable script that runs its source CLI.
BROWSE_BIN="$HOME/.agents/skills/gstack/browse/dist/browse" \
  TEST_DATABASE_URL=postgresql://postgres:history-test@127.0.0.1:55440/expense_history_test \
  npm run test:history
docker stop history-pagination-test-db
```

The suite asserts that page 12 survives hydration and repeated refreshes, then
checks filtered deep links, Show More, the final page, Back/Forward, search focus,
category changes, Clear, and cancellation of pending searches. Rebuild before
rerunning after source changes. Set `HISTORY_TEST_PORT` if port 3102 is occupied.
