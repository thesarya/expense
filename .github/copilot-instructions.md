# Copilot Instructions for Aaryavart Expense Tracker

## Project Overview
- **Purpose:** Expense & inventory management for Aaryavart Centre, designed for non-technical staff and admins.
- **Tech Stack:** React 18, Tailwind CSS, Firebase (Auth, Firestore, Storage), jsPDF, SheetJS, Recharts, Lucide React.
- **UI:** Mobile-first, role-based dashboards (Staff/Admin), modern design, brand colors.

## Architecture & Data Flow
- **Frontend:**
  - Main entry: `src/App.js`, routes in `src/components/`
  - Context: `src/contexts/AuthContext.js` for authentication and role logic
  - Firebase config: `src/firebase/config.js`
  - Staff/Admin dashboards: `StaffDashboard.js`, `AdminDashboard.js`
  - Expense/Inventory logic: `ExpenseEntry.js`, `InventoryEntry.js`, `ExpenseTable.js`
- **Backend:**
  - Firebase Firestore: `expenses`, `inventory`, `test` collections
  - Auth users: `lucknow@aaryavart.org`, `gorakhpur@aaryavart.org`, `admin@aaryavart.org`
  - Security rules: see README for dev/prod rules

## Developer Workflows
- **Start dev server:** `npm start` (uses `react-scripts start`)
- **Build for production:** `npm run build`
- **Firebase deploy:** `npm run build` then `firebase deploy`
- **Populate categories/items:** See `scripts/populateCategoriesAndItems.js`
- **Testing Firebase:** Use the "Firebase Test" tab in admin dashboard

## Project-Specific Patterns
- **Role-based UI:** Route protection via `ProtectedRoute.js`, context-driven rendering
- **Expense categories/items:** Defined in `ExpenseEntry.js` (`expenseCategories` object)
- **Brand colors:** Custom palette in `tailwind.config.js`
- **Centre logic:** Centres array in `Login.js`, logic in `AuthContext.js`
- **WhatsApp integration:** Alerts for expenses/low stock, manual/auto triggers
- **PDF/Excel export:** Reports via jsPDF/SheetJS in `Reports.js`
- **Charts:** Analytics via Recharts in dashboard components

## External Integrations
- **Firebase:** Auth, Firestore, Storage
- **WhatsApp:** Group alerts via link/button

## Conventions & Tips
- **Add new categories/items:** Edit `expenseCategories` in `ExpenseEntry.js`
- **Add new centres:** Update centres in `Login.js`, add user in Firebase Auth, update context logic
- **Security:** Use protected routes and Firebase rules for data isolation
- **Troubleshooting:** Use Firebase Test tab, check browser console, update security rules as needed

## Key Files & Directories
- `src/components/` – UI components, dashboards, entry forms
- `src/contexts/AuthContext.js` – Auth and role logic
- `src/firebase/config.js` – Firebase setup
- `scripts/` – Utility scripts
- `tailwind.config.js` – Styling and brand colors

---
**For questions or unclear patterns, review the README or ask for clarification.**
