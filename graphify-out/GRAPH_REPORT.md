# Graph Report - stonecrusher_nextjs  (2026-10-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 778 nodes · 2678 edges · 32 communities (26 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efba83b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sales-table.tsx
- settings.ts
- operations.ts
- getDb
- format.ts
- app-shell.tsx
- reports-view.tsx
- components.json
- db.ts
- dependencies
- helpers.ts
- compilerOptions
- package.json
- app/layout.tsx
- confirm-button.tsx
- session.ts
- devDependencies
- cn
- actions/auth.ts
- login-form.tsx
- backup.ts
- scripts
- lib/auth.ts
- geo.ts
- select.tsx
- eslint.config.mjs
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 89 edges
2. `Button()` - 40 edges
3. `inr()` - 39 edges
4. `requireRole()` - 36 edges
5. `err()` - 34 edges
6. `ok()` - 34 edges
7. `react` - 32 edges
8. `next` - 32 edges
9. `fmtDate()` - 31 edges
10. `ConfirmButton()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `SettingsView()` --indirect_call--> `changePinAction()`  [INFERRED]
  components/modules/settings-view.tsx → actions/settings.ts
- `SettingsView()` --indirect_call--> `saveUnitSettingsAction()`  [INFERRED]
  components/modules/settings-view.tsx → actions/settings.ts
- `NavItem` --references--> `Role`  [EXTRACTED]
  components/shell/nav.ts → lib/auth.ts
- `CustomersPage()` --calls--> `CustomersTable()`  [EXTRACTED]
  app/(app)/customers/page.tsx → components/modules/customers-table.tsx
- `CustomersTable()` --calls--> `deleteCustomerAction()`  [EXTRACTED]
  components/modules/customers-table.tsx → actions/masters.ts

## Import Cycles
- None detected.

## Communities (32 total, 6 thin omitted)

### Community 0 - "sales-table.tsx"
Cohesion: 0.09
Nodes (99): CustomersTable(), CATEGORY_OPTIONS, ExpensesTable(), MODE_LABELS, MODE_OPTIONS, GrnFields(), GrnTable(), ItemDraft (+91 more)

### Community 1 - "settings.ts"
Cohesion: 0.10
Nodes (68): requireRole(), deleteExpenseAction(), deletePurchaseAction(), expenseSchema, purchaseSchema, saveExpenseAction(), savePurchaseAction(), customerSchema (+60 more)

### Community 2 - "operations.ts"
Cohesion: 0.06
Nodes (70): addMoney(), applyMovement(), closingStock(), formatDocNo(), fromPaise(), invoiceTotal(), isShortStock(), lineAmount() (+62 more)

### Community 3 - "getDb"
Cohesion: 0.07
Nodes (62): CustomersPage(), dynamic, DashboardPage(), dynamic, dynamic, ExpensesPage(), dynamic, InventoryPage() (+54 more)

### Community 4 - "format.ts"
Cohesion: 0.08
Nodes (39): CustomerStatementPage(), dynamic, dynamic, StockLedgerPage(), dynamic, OrderPrintPage(), dynamic, InvoicePrintPage() (+31 more)

### Community 5 - "app-shell.tsx"
Cohesion: 0.09
Nodes (28): logoutAction(), AppLayout(), PlantMap(), StageDef, StageDetail(), STAGES, Stockpile, AppShell() (+20 more)

### Community 6 - "reports-view.tsx"
Cohesion: 0.09
Nodes (33): dynamic, ReportsPage(), axisProps, CHART_COLORS, ChartCard(), tooltipStyle, Dashboard(), KpiCard() (+25 more)

### Community 7 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "db.ts"
Cohesion: 0.13
Nodes (14): bootstrap(), DB_DIR, DB_PATH, ensureColumns(), globalForDb, migrateInventoryTx(), dataDir(), DEFAULT_SETTINGS (+6 more)

### Community 9 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @base-ui/react, better-sqlite3, class-variance-authority, cn, d3-geo, jose, lucide-react (+11 more)

### Community 10 - "helpers.ts"
Cohesion: 0.22
Nodes (7): PORT, @playwright/test, enterPin(), login(), seedUnit(), selectAccount(), Username

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, react-dom, recharts, shadcn, tailwindcss, @tailwindcss/postcss (+9 more)

### Community 13 - "app/layout.tsx"
Cohesion: 0.17
Nodes (8): hanken, inter, metadata, RootLayout(), Toaster(), TooltipProvider(), next-themes, sonner

### Community 14 - "confirm-button.tsx"
Cohesion: 0.26
Nodes (11): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay() (+3 more)

### Community 15 - "session.ts"
Cohesion: 0.22
Nodes (12): canAccess(), clearSessionCookie(), createSessionToken(), getSecret(), SECRET_FILE, SESSION_COOKIE, setSessionCookie(), verifySessionToken() (+4 more)

### Community 16 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/postcss, tsx, @types/better-sqlite3 (+6 more)

### Community 17 - "cn"
Cohesion: 0.23
Nodes (6): badgeVariants, TabsList(), tabsListVariants, @base-ui/react, class-variance-authority, cn

### Community 18 - "actions/auth.ts"
Cohesion: 0.36
Nodes (8): AttemptRow, clearFailures(), lockRemainingMs(), loginAction(), loginSchema, registerFailure(), homePath(), verifyPin()

### Community 19 - "login-form.tsx"
Cohesion: 0.31
Nodes (7): FormState, KeyBtn(), LoginForm(), ROLE_LABEL, UserLite, dynamic, LoginPage()

### Community 20 - "backup.ts"
Cohesion: 0.33
Nodes (7): GET(), BackupFile, columnsOf(), exportBackup(), importBackup(), tableColumns(), TABLES

### Community 21 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, start, test, test:e2e, test:unit (+1 more)

### Community 22 - "lib/auth.ts"
Cohesion: 0.32
Nodes (5): NAV_ITEMS, NavItem, Role, ROLE_PATHS, SessionUser

### Community 24 - "geo.ts"
Cohesion: 0.29
Nodes (7): Feature, GeoPoint, indiaFeature(), projectionFor(), d3-geo, topojson-client, world-atlas

### Community 27 - "select.tsx"
Cohesion: 0.38
Nodes (3): SelectContent(), SelectScrollDownButton(), SelectScrollUpButton()

### Community 28 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **13 isolated node(s):** `react-dom`, `shadcn`, `tailwindcss`, `@tailwindcss/postcss`, `tsx` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 272 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `format.ts` to `sales-table.tsx`, `settings.ts`, `getDb`, `app-shell.tsx`, `reports-view.tsx`, `package.json`, `app/layout.tsx`, `session.ts`, `actions/auth.ts`, `backup.ts`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `react-dom`, `shadcn`, `tailwindcss` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sales-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09248843894513185 - nodes in this community are weakly interconnected._
- **Why does `react` connect `sales-table.tsx` to `getDb`, `app-shell.tsx`, `reports-view.tsx`, `package.json`, `confirm-button.tsx`, `login-form.tsx`, `card.tsx`, `avatar.tsx`, `popover.tsx`, `select.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `settings.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `getDb()` connect `getDb` to `settings.ts`, `operations.ts`, `format.ts`, `reports-view.tsx`, `db.ts`, `actions/auth.ts`, `login-form.tsx`, `backup.ts`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Should `operations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056943056943056944 - nodes in this community are weakly interconnected._