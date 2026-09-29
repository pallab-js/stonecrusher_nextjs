import { getDb } from "@/lib/db";

export interface ReportSummary {
  production: number;
  raw: number;
  sales: number;
  invoices: number;
  purchases: number;
  expenses: number;
  net: number;
  receivables: number;
}

export interface NameSum {
  name: string;
  value: number;
  qty: number;
  count: number;
}

export interface MonthRow {
  month: string;
  output: number;
  raw: number;
  sales: number;
}

export interface InventoryRow {
  code: string;
  name: string;
  stock: number;
  rate: number;
  value: number;
}

function filterSql(from: string | null, alias = "date"): { sql: string; params: string[] } {
  if (!from) return { sql: "", params: [] };
  return { sql: ` WHERE ${alias} >= ?`, params: [from] };
}

export function getReportData(from: string | null) {
  const db = getDb();

  const production =
    (db
      .prepare(
        `SELECT COALESCE(SUM(po.qty), 0) AS v FROM production_output po
         JOIN production p ON p.id = po.production_id${from ? " WHERE p.date >= ?" : ""}`
      )
      .get(...(from ? [from] : [])) as { v: number }).v ?? 0;

  const raw =
    (db
      .prepare(`SELECT COALESCE(SUM(raw_consumed), 0) AS v FROM production${filterSql(from).sql}`)
      .get(...filterSql(from).params) as { v: number }).v ?? 0;

  const salesRow = db
    .prepare(`SELECT COALESCE(SUM(total), 0) AS sales, COUNT(*) AS c${""} FROM sales${filterSql(from).sql}`)
    .get(...filterSql(from).params) as { sales: number; c: number };

  const purchases =
    (db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS v FROM purchases${filterSql(from).sql}`)
      .get(...filterSql(from).params) as { v: number }).v ?? 0;

  const expenses =
    (db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS v FROM expenses${filterSql(from).sql}`)
      .get(...filterSql(from).params) as { v: number }).v ?? 0;

  const receivables =
    (db.prepare(`SELECT COALESCE(SUM(total - paid_amount), 0) AS v FROM sales WHERE status != 'paid'`).get() as {
      v: number;
    }).v ?? 0;

  const summary: ReportSummary = {
    production,
    raw,
    sales: salesRow.sales,
    invoices: salesRow.c,
    purchases,
    expenses,
    net: salesRow.sales - purchases - expenses,
    receivables,
  };

  const productionByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', p.date) AS month,
        COALESCE((SELECT SUM(po.qty) FROM production_output po WHERE po.production_id = p.id), 0) AS output,
        SUM(p.raw_consumed) AS raw
       FROM production p${from ? " WHERE p.date >= ?" : ""}
       GROUP BY month ORDER BY month DESC LIMIT 12`
    )
    .all(...(from ? [from] : [])) as MonthRow[];

  const salesByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month, SUM(total) AS sales FROM sales${filterSql(from).sql}
       GROUP BY month ORDER BY month DESC LIMIT 12`
    )
    .all(...filterSql(from).params) as { month: string; sales: number }[];

  const salesByMonthMap = new Map(salesByMonth.map((r) => [r.month, r.sales]));
  const months: MonthRow[] = productionByMonth.map((r) => ({
    ...r,
    sales: salesByMonthMap.get(r.month) ?? 0,
  }));

  const salesByCustomer = db
    .prepare(
      `SELECT c.name AS name, COUNT(DISTINCT s.id) AS count, SUM(s.total) AS value,
        COALESCE((SELECT SUM(si.qty) FROM sale_items si WHERE si.sale_id = s.id), 0) AS qty
       FROM sales s JOIN customers c ON c.id = s.customer_id${from ? " WHERE s.date >= ?" : ""}
       GROUP BY c.id ORDER BY value DESC`
    )
    .all(...(from ? [from] : [])) as NameSum[];

  const purchasesByCategory = db
    .prepare(
      `SELECT category AS name, SUM(amount) AS value, COUNT(*) AS count, 0 AS qty
       FROM purchases${filterSql(from).sql} GROUP BY category ORDER BY value DESC`
    )
    .all(...filterSql(from).params) as NameSum[];

  const expensesByCategory = db
    .prepare(
      `SELECT category AS name, SUM(amount) AS value, COUNT(*) AS count, 0 AS qty
       FROM expenses${filterSql(from).sql} GROUP BY category ORDER BY value DESC`
    )
    .all(...filterSql(from).params) as NameSum[];

  const inventory = (
    db
      .prepare(
        `SELECT p.code, p.name, p.rate,
          p.opening_stock + COALESCE((
            SELECT SUM(CASE WHEN t.dir = 'in' THEN t.qty ELSE -t.qty END)
            FROM inventory_tx t WHERE t.product_id = p.id), 0) AS stock
         FROM products p WHERE p.active = 1 ORDER BY p.kind, p.code`
      )
      .all() as (Omit<InventoryRow, "value"> & { stock: number })[]
  ).map((r) => ({ ...r, value: Math.max(0, r.stock) * r.rate }));

  return { summary, months, salesByCustomer, purchasesByCategory, expensesByCategory, inventory };
}

export type ReportData = ReturnType<typeof getReportData>;

/* ── Receivables ageing ────────────────────────────────── */

export type AgeingKey = "current" | "d16_30" | "d31_60" | "d61_90" | "d90";

export const AGEING_BUCKETS: { key: AgeingKey; label: string; short: string }[] = [
  { key: "current", label: "0–15 days", short: "0–15" },
  { key: "d16_30", label: "16–30 days", short: "16–30" },
  { key: "d31_60", label: "31–60 days", short: "31–60" },
  { key: "d61_90", label: "61–90 days", short: "61–90" },
  { key: "d90", label: "90+ days", short: "90+" },
];

function ageingKey(days: number): AgeingKey {
  if (days <= 15) return "current";
  if (days <= 30) return "d16_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90";
}

export interface AgeingInvoice {
  invoice_no: string;
  date: string;
  customer_id: number | null;
  customer_name: string;
  balance: number;
  days: number;
  bucket: AgeingKey;
}

export interface AgeingCustomer {
  customer_id: number | null;
  customer_name: string;
  invoices: number;
  total: number;
  oldest_days: number;
  buckets: Record<AgeingKey, number>;
}

export interface AgeingReport {
  rows: AgeingInvoice[];
  customers: AgeingCustomer[];
  buckets: { key: AgeingKey; label: string; short: string; total: number; count: number }[];
  total: number;
  overdue: number;
}

export function getAgeing(): AgeingReport {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.invoice_no, s.date, c.id AS customer_id,
        COALESCE(c.name, 'Unassigned') AS customer_name,
        ROUND(s.total - s.paid_amount, 2) AS balance,
        CAST(MAX(0, julianday('now') - julianday(s.date)) AS INTEGER) AS days
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.status != 'paid' AND (s.total - s.paid_amount) > 0.01
       ORDER BY days DESC, s.date DESC`
    )
    .all() as Omit<AgeingInvoice, "bucket">[];

  const withBucket: AgeingInvoice[] = rows.map((r) => ({ ...r, bucket: ageingKey(r.days) }));

  const byCustomer = new Map<number | null, AgeingCustomer>();
  for (const r of withBucket) {
    const key = r.customer_id;
    let entry = byCustomer.get(key);
    if (!entry) {
      entry = {
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        invoices: 0,
        total: 0,
        oldest_days: 0,
        buckets: { current: 0, d16_30: 0, d31_60: 0, d61_90: 0, d90: 0 },
      };
      byCustomer.set(key, entry);
    }
    entry.invoices += 1;
    entry.total = Math.round((entry.total + r.balance) * 100) / 100;
    entry.oldest_days = Math.max(entry.oldest_days, r.days);
    entry.buckets[r.bucket] = Math.round((entry.buckets[r.bucket] + r.balance) * 100) / 100;
  }

  const buckets = AGEING_BUCKETS.map((b) => {
    const matching = withBucket.filter((r) => r.bucket === b.key);
    return {
      ...b,
      total: Math.round(matching.reduce((s, r) => s + r.balance, 0) * 100) / 100,
      count: matching.length,
    };
  });

  const total = Math.round(withBucket.reduce((s, r) => s + r.balance, 0) * 100) / 100;

  return {
    rows: withBucket,
    customers: [...byCustomer.values()].sort((a, b) => b.total - a.total),
    buckets,
    total,
    overdue: withBucket.filter((r) => r.days > 15).reduce((s, r) => s + r.balance, 0),
  };
}
