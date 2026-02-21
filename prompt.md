I want you to build me a fully functional expense tracking app as a next.js app. Here are my specifications:

---

### 🎨 DESIGN & BRANDING

- Color scheme / vibe: dark mode, light mode
- Primary accent color: electric blue
- Font style feel: modern/clean
- Overall aesthetic: brutalist

---

### 💰 CURRENCY & LOCALE

- Currency symbol: AED
- Date format: DD/MM/YYYY

---

### 🗂️ CATEGORIES

Food, Transport, Housing, Entertainment, Health, Shopping, Travel
User should have the ability to add their own custom new categories

- Should each category have a unique color? not necessarily unique but assign a color for each category yes
- Should each category have an emoji/icon? Yes

---

### 📋 LOG NEW EXPENSE — Fields I want:

Required fields (always include these):

- Amount
- Category
- Date

Optional fields

- Description / note
- Merchant / vendor name

---

### 📜 TIMELINE / HISTORY VIEW

- Default sort: [Newest first]
- Grouping: [Group by day]
- Should I be able to filter by category in this view? Yes
- Should I be able to search by keyword? Yes
- Should I be able to edit or delete a past expense? Yes
- Items per page / infinite scroll: add a show more button at the end of the page for user to click and load more items

---

### 📊 ANALYTICS VIEW

- Chart types you want: [All: Bar chart, Line chart, Pi Donut chart]
- Key metrics to show:
  - Total spent in selected range
  - Daily / weekly / monthly average
  - Highest spending category
  - Spending trend over time
  - Category breakdown (% of total)
- Date range options: [This week, This month, Last 3 months, Custom range]

---

### 🗃️ DATA & PERSISTENCE

- Should the app come pre-loaded with sample/mock data? Yes
- Data persistence: [use prisma with postgresql database for storage]

---

### ✨ EXTRA FEATURES

- Dark/light mode toggle
- A summary dashboard as the home/landing view
- Onboarding / empty state illustrations

---

### 📐 LAYOUT PREFERENCE

- Device target: [Fully responsive]

---

### 📊 Authentication

- all user data should be linked to an account
- users have to login using their google account (the only login method is google account for now)
