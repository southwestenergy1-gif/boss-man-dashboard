# 360° CRM Audit — BOSS MAN Dashboard

**Date:** July 2, 2026
**Scope:** Full product audit — code, functionality, rendering, UX, UI/typography, business process fit — walked through as each persona (sales rep, office manager, accountant, owner).

Each finding is marked **[FIXED]** (done in this audit) or **[RECOMMENDED]** (needs a product decision or external work).

---

## 1. Critical bugs (P0)

| # | Finding | Status |
|---|---------|--------|
| 1.1 | **Debt tracker rendered a completely blank page.** `export default function App()` inside a non-module Babel script throws `Unexpected token 'export'` before React ever mounts. Confirmed in a real browser: root element stayed empty. | **[FIXED]** — removed the `export default`; page now renders. |
| 1.2 | **"MTD Revenue" stat card showed "85% vs last week"** — that number was actually *percent of monthly target*, mislabeled as a weekly trend. An owner reading this would think revenue grew 85% in a week. | **[FIXED]** — added a real `revenueTrendPercent` field; trend now reads "vs last month" and target % stays in the subtitle. |
| 1.3 | **Marketing chart: "Leads" bars were invisible.** Leads (values 0–12) were plotted on the same axis as spend ($0–$3,500), so lead bars rendered at ~0 pixels tall. | **[FIXED]** — moved Leads to the right axis (same scale family as ROAS); bars are now visible. |
| 1.4 | **Pipeline Value and Win Rate trends were hardcoded fake numbers** (`trend={8}`, `winRate > 30 ? 5 : -3`). | **[FIXED]** — real per-business trend fields in the data layer. |

## 2. Readability & typography (the "small letters" problem)

| # | Finding | Status |
|---|---------|--------|
| 2.1 | Debt tracker used **8px–11px** text for labels, notes, dates, and log metadata — below any accessibility floor and genuinely unreadable. | **[FIXED]** — new floor is 10px for tiny uppercase labels, 12px for metadata, 14px for body/inputs/buttons. |
| 2.2 | **Debt notes were 11px, dim gray, italic.** These carry critical info ("pay first, no materials = no income"). | **[FIXED]** — notes are now **14px bold**, near-white, in a highlighted gold-tinted box. |
| 2.3 | **Payment/income log rows were cramped** (13px padding, 10px metadata). | **[FIXED]** — 16–18px padding, 12px brighter metadata, larger amounts, more gap between rows. |
| 2.4 | Dim gray (`#5a5a72`, Tailwind `gray-500/600`) on near-black backgrounds failed WCAG contrast (~3:1) across both apps. | **[FIXED]** — bumped to `#9a9ab0` / `slate-300`–`slate-400` (≥7:1 for most text). |
| 2.5 | Dashboard section labels were 12px mono dim-gray; descriptions 12px `gray-600`. | **[FIXED]** — labels now 13px semibold `slate-300`; descriptions 14px `slate-400`; stat values bumped to 3xl. |
| 2.6 | Chart axis ticks and legends were small and dim. | **[FIXED]** — 13px, `#cbd5e1`, with `$Xk` axis formatting. |

## 3. Missing CRM functionality (persona walkthrough)

**Sales rep:** "I got a lead — where do I put it?" There was nowhere. The app was a read-only dashboard.
**[FIXED]** — New **Leads CRM** view (per business):
- Add/delete leads (name, phone, address, source, est. value, stage)
- 7-stage pipeline: New → Contacted → Appointment → Proposal → Contract Signed → Won / Lost
- **Notes** (rendered bold and readable) + **auto-logged activity** (stage changes, creation) with dates and breathing room
- Stage filter chips, open-pipeline and won totals, tap-to-call phone links
- Saved in the browser (localStorage) per business; verified persistence across reload

**Office manager:** Can now see lead statuses and notes. **[RECOMMENDED]** next: appointment/calendar integration, document upload per lead (contracts, utility bills), reminders.

**Accountant:** Profit margin was a hardcoded number that disagreed with the displayed expenses (said 28%, actual math is 32%). **[FIXED]** — margin and net profit are now computed from the actual revenue/expense data, with comma-formatted dollars. **[RECOMMENDED]**: QuickBooks integration for real numbers.

**Owner:** Dashboard claimed **"Live"** with a green dot and "Systems Operational" while showing mock data. **[FIXED]** — honest amber **"Demo Data"** badge and footer; health status now says "connect live APIs to track in real time."

## 4. Code quality

| # | Finding | Status |
|---|---------|--------|
| 4.1 | Dead imports in `BossManDashboard.jsx` (entire recharts import row, `Flame`) and dead computed `totalPipeline` in `LeadsPipeline`. | **[FIXED]** — removed; `totalPipeline` is now actually displayed. |
| 4.2 | `BusinessHealthSection` ran a `setInterval` toggling state every 2s just to pulse a dot — constant unnecessary re-renders. | **[FIXED]** — pure CSS `animate-pulse`. |
| 4.3 | ROAS passed to the chart as a string (`toFixed(1)`). | **[FIXED]** — numeric, formatted in the tooltip. |
| 4.4 | Expense pie chart had no tooltip and no % breakdown. | **[FIXED]** — tooltip with $ and %, legend with amounts, total shown. |
| 4.5 | `package.json` has a `lint` script but ESLint isn't installed. | **[RECOMMENDED]** — add ESLint + config, or remove the script. |
| 4.6 | Bundle is 557 kB (recharts + framer-motion; framer-motion appears unused). | **[RECOMMENDED]** — drop framer-motion, code-split recharts. |
| 4.7 | Buttons lacked `aria-pressed`/focus rings. | **[FIXED]** — business selector, view switcher, and filter chips are keyboard/AT friendly. |

## 5. Docs & process

| # | Finding | Status |
|---|---------|--------|
| 5.1 | README and 00_START_HERE described a business unit ("Aqua Systems") that doesn't exist in the app. | **[FIXED]** — docs now match the code (Home Improvement). |
| 5.2 | Business units are Solar / Construction / Home Improvement, but the stated company focus is **Solar PPA + Landscaping**. | **[RECOMMENDED]** — renaming/adding a business is a 2-minute change in `src/data/mockData.js` (`businessesMetadata`). Decide the final list and I'll wire it. |
| 5.3 | **Privacy:** `public/debt-tracker.html` ships real creditor names, balances, and personal notes as its default data, publicly reachable at `/debt-tracker.html` on the production domain. | **[RECOMMENDED]** — put it behind auth, remove it from the public build, or strip the real defaults. |
| 5.4 | Debt tracker loads React/Babel from unpkg CDNs at runtime and compiles JSX in the browser — slow first paint, breaks if CDN unreachable. | **[RECOMMENDED]** — fold it into the Vite app as a route so it's bundled, fast, and offline-safe. |
| 5.5 | All CRM/debt data lives in each device's localStorage — no sync between phone/office, no backup, no multi-user. | **[RECOMMENDED]** — next big step: a real backend (e.g. Supabase) with auth, shared data, and roles (rep / manager / accounting). This is the bridge from "demo" to "company system." |

## 6. Verification performed

- `npm run build` — clean.
- Real-browser (Chromium) end-to-end pass: dashboard renders with zero console errors across all three businesses; debt tracker renders (was blank before); added a lead, added a note, changed stage, deleted; data persists across reload; leads correctly scoped per business; mobile (390px) layout checked.
