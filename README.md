# StoneOps — Stone Crusher Unit Operations

A local-first, offline Next.js dashboard that runs all day-to-day operations of a single stone crusher unit: production shifts, inventory, sales & dispatch, purchases, expenses, customers/suppliers, plant + location maps, analytics and reports.

Everything lives in a local SQLite file (`./data/stonecrusher.db`). Nothing leaves the machine — no cloud, no network calls at runtime.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (base-ui variant)
- **SQLite** via `better-sqlite3` (WAL, file-backed)
- **Recharts** for graphs, **d3-geo + world-atlas** for offline SVG maps
- **jose** JWT session cookie + scrypt PIN hashing

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run start      # serve the production build
```

## Signing in

Bootstrap users are created on first run with PIN `1234`:

| User       | Username   | Role       | Access                                                 |
| ---------- | ---------- | ---------- | ------------------------------------------------------ |
| Admin      | `admin`    | admin      | Everything (incl. Settings)                            |
| Plant Operator | `operator` | operator | Dashboard, Production, Inventory, Maps, Reports        |
| Accounts   | `accounts` | accountant | Dashboard, Sales, Purchases, Expenses, Customers, Suppliers, Reports |

Sign in by picking a user on the login screen and entering their 4-digit PIN. Users, PINs and roles are managed in **Settings → Users & Roles**.

## Modules

- **Dashboard** — KPI cards (today's output, MTD tonnage, stock on ground, revenue, receivables, downtime) plus production trend, stock mix, sales vs purchases and expense mix charts.
- **Production** — daily shift log: raw stone consumed, output by product, downtime, operator notes.
- **Inventory** — stock on ground by product with running balances, additions and consumption.
- **Sales & Dispatch** — multi-line invoices with vehicle/transporter details, tax, amount received and payment status; dispatches decrement stock automatically.
- **Purchases** — raw stone, spares, fuel and other bills with payment status.
- **Expenses** — day-to-day site expenses by category.
- **Customers / Suppliers** — masters with contact details and credit terms.
- **Maps** — offline SVG **Plant map** (crusher flow: hopper → jaw → cone → screens → stockpile yard) and **Location map** (customer/receivables bubbles on an India outline). No tile servers, works fully offline.
- **Reports** — period tabs (MTD / last month / this year / all) with production, sales, purchases and expense tables plus CSV export.
- **Settings** — unit profile, change PIN, user management, **Load demo / seed data**, clear data, export/restore JSON backup (`/api/backup`).

## Demo data

**Settings → Data → Load demo / seed data** generates ~10 months of deterministic sample data (7 products, 15 customers with real coordinates, 10 suppliers, ~585 shifts, ~587 invoices, ~183 purchase bills, ~68 expenses) in about 400 ms. **Clear all data** resets everything.

## Architecture notes

- `lib/schema.ts` DDL + `lib/db.ts` (connection, `ensureColumns` migrations)
- `lib/repo/*` query layer; `actions/*` server actions (validated, wrapped for `useActionState`)
- `lib/auth.ts` + `lib/session.ts` + `proxy.ts` route gating per role
- `components/modules/*` page bodies; `components/shared/*` dialog/table/form primitives
- Design tokens and the full UI kit live in `app/globals.css` (spec: `DESIGN.md`)
