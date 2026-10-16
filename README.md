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
npm run test:unit  # fast unit tests for the money/stock/validation helpers
npm run test:e2e   # Playwright end-to-end tests (starts its own dev server)
```

## Tests

**Unit tests** cover the pure money/stock/validation helpers in `lib/money.ts`
and `lib/validate.ts` — integer-paise arithmetic (no float drift), payment
status, stock-availability, GSTIN/phone formats — via Node's built-in test
runner:

```bash
npm run test:unit
```

**End-to-end tests** drive the real app in Chromium against an isolated database
(`STONEOPS_DATA_DIR=data/e2e`, wiped before every run):

```bash
npx playwright install chromium   # first run only
npm run test:e2e
```

Coverage: PIN login / wrong PIN / lock screen, role gating per role,
customer CRUD + validation, demo seed → dashboard charts → reports → maps,
goods-receipt/LPO flows, and data clearing. Every push to `main` runs lint,
typecheck, unit tests, build and the e2e suite via `.github/workflows/ci.yml`
(with `concurrency` so stacked pushes cancel superseded runs).

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
- **Production** — daily shift log: raw stone consumed (against a chosen raw product), output by product, downtime, operator notes.
- **Inventory** — stock on ground by product with running balances, additions and consumption.
- **Sales & Dispatch** — multi-line invoices with vehicle/transporter details, tax, amount received and payment status; dispatches decrement stock automatically and are blocked when they would drive stock negative.
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

### Data integrity & security

- **Atomic numbering** — invoice / LPO / GRN numbers are allocated and the
  counter bumped inside the same transaction as the insert, so concurrent or
  double-submitted saves can never collide on a `UNIQUE` number.
- **Integer-paise money** — all amount arithmetic (line totals, invoice totals,
  running paid amounts, statement balances) is done in integer paise and
  rounded once, so repeated additions never accumulate float drift.
- **Safe restore** — JSON backup import validates every table/column against the
  live schema *before* clearing data, and runs in a single transaction.
- **Auth hardening** — the JWT session secret fails closed if it can't be
  established; PIN logins lock out per user after repeated failures.

## License

[MIT](LICENSE)
