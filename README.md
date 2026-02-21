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
