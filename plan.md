Here is Claude's plan:  
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
Expense Tracker App — Implementation Plan

Context

Building a full-stack expense tracking app on top of a fresh Next.js 16.1.6 scaffold. The  
 app requires Google OAuth authentication, PostgreSQL persistence via Prisma, a brutalist  
 electric-blue design system with dark/light mode, and three main views: Dashboard,  
 Timeline/History, and Analytics with charts.

---

Prerequisites (Manual Setup Required Before Coding)

1.  PostgreSQL: Have a local or cloud PostgreSQL instance running. Create a database named
    expense_tracker_dev.
2.  Google OAuth Credentials: Create a project in Google Cloud Console → APIs & Services →
    OAuth 2.0 → Web Client. Add http://localhost:3000/api/auth/callback/google as an authorized
    redirect URI.
3.  .env.local file at project root:
    DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/expense_tracker_dev"
    AUTH_SECRET="<run: openssl rand -base64 32>"
    AUTH_GOOGLE_ID="<from Google Cloud Console>"
    AUTH_GOOGLE_SECRET="<from Google Cloud Console>"
    NEXTAUTH_URL="http://localhost:3000"

---

Packages to Install

npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client \
 react-hook-form @hookform/resolvers zod \
 recharts \
 next-themes \
 date-fns

npm install --save-dev tsx

---

Database Schema (prisma/schema.prisma)

NextAuth required models: User, Account, Session, VerificationToken

App models:

- Category: id, name, emoji, color (hex), isDefault, userId, createdAt — linked to User,
  @@unique([userId, name])
- Expense: id, amount (Decimal 10,2), description?, merchant?, date, userId, categoryId,
  createdAt, updatedAt — @@index([userId, date]), @@index([userId, categoryId])
- User extended with seedLoaded Boolean @default(false) — flags whether mock data has been
  seeded

---

File Structure

prisma/
schema.prisma
seed.ts # Global dev reset seed (uses tsx)

app/
globals.css # MODIFY: Tailwind v4 @theme tokens, @custom-variant dark,
brutalist utils
layout.tsx # MODIFY: ThemeProvider + SessionProvider,
suppressHydrationWarning
favicon.ico
(auth)/
login/page.tsx # Public: Google OAuth sign-in page
(app)/
layout.tsx # Auth guard: await auth() → redirect if no session; Sidebar +
TopBar shell
page.tsx # Dashboard: stats, recent expenses, quick-add FAB
history/page.tsx # Timeline: grouped by day, filters via URL params, show-more
pagination
analytics/page.tsx # Charts + metrics: date range via URL params
api/
auth/[...nextauth]/route.ts # NextAuth v5 handler

components/
providers/
ThemeProvider.tsx # Client: next-themes ThemeProvider (attribute="class",
defaultTheme="system")
SessionProvider.tsx # Client: NextAuth SessionProvider
layout/
Sidebar.tsx # Server: nav links, user info, sign-out
TopBar.tsx # Client: mobile hamburger + theme toggle
NavLink.tsx # Client: usePathname() for active state
ThemeToggle.tsx # Client: useTheme() sun/moon toggle
dashboard/
StatCard.tsx # Server: metric card (label, value, icon, trend)
RecentExpenses.tsx # Server: last 5 expenses
QuickAddButton.tsx # Client: opens ExpenseModal
EmptyState.tsx # Server: SVG illustration + CTA
expenses/
ExpenseModal.tsx # Client: portal modal (add/edit mode)
ExpenseForm.tsx # Client: react-hook-form + zodResolver
ExpenseCard.tsx # Client: single row with edit/delete buttons
ExpenseGroup.tsx # Server: day header + daily total + list of ExpenseCards
DeleteConfirmDialog.tsx # Client: confirm before delete
ShowMoreButton.tsx # Client: increments page URL param
history/
HistoryFilters.tsx # Client: category multiselect + debounced search → URL params
HistoryList.tsx # Server: renders ExpenseGroup array
analytics/
DateRangePicker.tsx # Client: This week / month / 3mo / custom → URL params
MetricsRow.tsx # Server: 4 StatCards (total, avg, top category, trend)
SpendingBarChart.tsx # Client: Recharts BarChart (daily/weekly spending)
SpendingLineChart.tsx # Client: Recharts LineChart (cumulative trend)
CategoryDonutChart.tsx # Client: Recharts PieChart with innerRadius
CategoryBreakdownTable.tsx # Server: category % table
categories/
CategoryBadge.tsx # Server: colored emoji pill
ManageCategoriesModal.tsx # Client: add/delete custom categories
ui/
Button.tsx Input.tsx Select.tsx Modal.tsx Badge.tsx Skeleton.tsx Spinner.tsx

lib/
prisma.ts # Singleton Prisma client (prevents hot-reload exhaustion)
auth.ts # NextAuth v5 config: Google provider, Prisma adapter, signIn callback
seed-user.ts # Per-user first-login seed: creates default categories + ~40 mock
expenses

actions/ # Server Actions ("use server")
expenses.ts # createExpense, updateExpense, deleteExpense, getExpenses
(paginated+filtered)
categories.ts # getUserCategories, createCategory
analytics.ts # getAnalyticsData (aggregated by date range)

types/
expense.ts category.ts analytics.ts index.ts

schemas/
expense.schema.ts # Zod: amount (positive Decimal), categoryId, date, description?,
merchant?
category.schema.ts # Zod: name, emoji, color (hex)

---

Design System (app/globals.css)

@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark \*));

@theme inline {
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
--color-blue-primary: #0066FF;
--color-blue-hover: #0052CC;
--color-background: var(--bg);
--color-surface: var(--surface);
--color-foreground: var(--fg);
--color-border: var(--border);
}

:root { --bg: #F5F5F0; --surface: #FFFFFF; --fg: #0A0A0A; --border: #0A0A0A; }
.dark { --bg: #0A0A0A; --surface: #111111; --fg: #F0F0F0; --border: #F0F0F0; }

Brutalist patterns: border-2 border-border, offset box-shadow (3px 3px 0 var(--border)),
elements physically depress on click (translate-x-[2px] translate-y-[2px]), uppercase
monospace labels, electric blue used only for interactive accents.

Preset Category Colors & Emojis

┌───────────────┬───────┬─────────┐
│ Category │ Emoji │ Color │
├───────────────┼───────┼─────────┤
│ Food │ 🍔 │ #FF6B6B │
├───────────────┼───────┼─────────┤
│ Transport │ 🚗 │ #4ECDC4 │
├───────────────┼───────┼─────────┤
│ Housing │ 🏠 │ #45B7D1 │
├───────────────┼───────┼─────────┤
│ Entertainment │ 🎮 │ #F7DC6F │
├───────────────┼───────┼─────────┤
│ Health │ 💊 │ #A8D5A2 │
├───────────────┼───────┼─────────┤
│ Shopping │ 🛍️ │ #C39BD3
├───────────────┼───────┼─────────┤
│ Travel │ ✈️ │ #F0A500 │
└───────────────┴───────┴─────────┘

---

Architecture Decisions

Concern: Route protection
Decision: Server component layout guard (await auth() in (app)/layout.tsx) — NOT proxy.ts
────────────────────────────────────────
Concern: Mutations
Decision: Server Actions + revalidatePath() — no separate REST API
────────────────────────────────────────
Concern: Filter/search state
Decision: URL search params — bookmarkable, server components can read directly
────────────────────────────────────────
Concern: Dark mode
Decision: next-themes writes .dark class to <html>, Tailwind v4 @custom-variant picks it up
────────────────────────────────────────
Concern: Currency precision
Decision: Decimal(10,2) in Prisma → Intl.NumberFormat("en-AE", { style: "currency",
currency: "AED" })
────────────────────────────────────────
Concern: First-login seed
Decision: signIn NextAuth callback → calls seedUserData(userId) exactly once
────────────────────────────────────────
Concern: Charts
Decision: Recharts (React-native API, SVG-based, dark mode via CSS)

---

Implementation Order

Phase 1 — Foundation

1.  Install all packages
2.  Create prisma/schema.prisma
3.  Run npx prisma migrate dev --name init
4.  Write lib/prisma.ts (singleton)

Phase 2 — Authentication

5.  Write lib/auth.ts (NextAuth v5 + Google + Prisma adapter + signIn seed callback)
6.  Write app/api/auth/[...nextauth]/route.ts
7.  Update app/layout.tsx (ThemeProvider + SessionProvider + suppressHydrationWarning)
8.  Create app/(auth)/login/page.tsx
9.  Create app/(app)/layout.tsx (auth guard + shell)
10. Test: / redirects to /login, Google OAuth works, DB gets rows

Phase 3 — UI Foundation

11. Update app/globals.css (full theme + brutalist utilities)
12. Write all components/ui/ primitives
13. Write components/layout/ (Sidebar, TopBar, NavLink, ThemeToggle)
14. Test: Dark/light toggle, responsive sidebar collapse

Phase 4 — Types, Schemas, Server Actions

15. Write all types, Zod schemas
16. Write server actions (expenses.ts, categories.ts, analytics.ts)
17. Write lib/seed-user.ts with ~40 realistic AED mock expenses spanning 90 days

Phase 5 — Expense CRUD

18. Write CategoryBadge, ExpenseForm, ExpenseModal, ExpenseCard, DeleteConfirmDialog
19. Test: Create, edit, delete expenses via modal

Phase 6 — Dashboard

20. Write StatCard, RecentExpenses, QuickAddButton, EmptyState
21. Write app/(app)/page.tsx
22. Test: Stats display correctly, quick-add works

Phase 7 — History View

23. Write ExpenseGroup, ShowMoreButton, HistoryFilters, HistoryList
24. Write app/(app)/history/page.tsx
25. Test: Grouping by day, category filter, keyword search, show more

Phase 8 — Analytics View

26. Write DateRangePicker, MetricsRow, all 3 chart components, CategoryBreakdownTable
27. Write app/(app)/analytics/page.tsx
28. Test: All chart types, date ranges, metric accuracy

Phase 9 — Custom Categories

29. Write ManageCategoriesModal
30. Add to sidebar
31. Test: Add custom category, appears in expense form

Phase 10 — Polish

32. Add loading.tsx (skeletons) and error.tsx per route
33. Responsive QA (mobile viewport)
34. Dark mode QA across all components
35. Accessibility (aria-labels on icon buttons, focus rings)
36. Update metadata (title: "Expense Tracker")
37. Write global dev prisma/seed.ts

---

Verification

1.  npm run dev → app loads at localhost:3000
2.  Unauthenticated → redirected to /login
3.  Google sign-in → dashboard shows mock data (seeded on first login)
4.  Add expense → appears in dashboard recent list and history
5.  Edit expense → form pre-filled, update reflects immediately
6.  Delete expense → removed with confirmation
7.  History: filter by "Food" → only food expenses shown; search "Carrefour" → matching
    results
8.  Analytics: switch date ranges → charts and metrics update
9.  Add custom category → available in expense form dropdown
10. Toggle dark mode → all surfaces switch correctly, no FOUC
11. Mobile: sidebar collapses to TopBar hamburger, all views scroll correctly
12. npx prisma studio → inspect all tables look correct
    ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

Claude has written up a plan and is ready to execute. Would you like to proceed?

❯ 1. Yes, clear context (21% used) and auto-accept edits (shift+tab) 2. Yes, auto-accept edits 3. Yes, manually approve edits 4. Type here to tell Claude what to change

ctrl-g to edit in Vim · ~/.claude/plans/rippling-sauteeing-bird.md
