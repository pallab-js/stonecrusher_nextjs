import { getDb } from "@/lib/db";
import { daysAgo } from "@/lib/format";

export interface Kpis {
  todayProduction: number;
  monthProduction: number;
  monthRaw: number;
  stockValue: number;
  totalStock: number;
  receivables: number;
  monthRevenue: number;
  monthProfit: number;
  monthDowntime: number;
  openInvoices: number;
}

export function getKpis(): Kpis {
  const db = getDb();
  const today = daysAgo(0);
  const monthStart = today.slice(0, 8) + "01";

  const todayProduction =
    (db
      .prepare(
        `SELECT COALESCE(SUM(po.qty), 0) AS v FROM production_output po
         JOIN production p ON p.id = po.production_id WHERE p.date = ?`
      )
      .get(today) as { v: number }).v ?? 0;

  const monthProduction =
    (db
      .prepare(
        `SELECT COALESCE(SUM(po.qty), 0) AS v FROM production_output po
         JOIN production p ON p.id = po.production_id WHERE p.date >= ?`
      )
      .get(monthStart) as { v: number }).v ?? 0;

  const monthRaw =
    (db
      .prepare(`SELECT COALESCE(SUM(raw_consumed), 0) AS v FROM production WHERE date >= ?`)
      .get(monthStart) as { v: number }).v ?? 0;

  const monthDowntime =
    (db
      .prepare(`SELECT COALESCE(SUM(down_hours), 0) AS v FROM production WHERE date >= ?`)
      .get(monthStart) as { v: number }).v ?? 0;

  const stock = db
    .prepare(
      `SELECT p.rate,
        p.opening_stock + COALESCE((
          SELECT SUM(CASE WHEN t.dir = 'in' THEN t.qty ELSE -t.qty END)
          FROM inventory_tx t WHERE t.product_id = p.id), 0) AS s
       FROM products p WHERE p.active = 1`
    )
    .all() as { rate: number; s: number }[];

  const stockValue = stock.reduce((sum, r) => sum + Math.max(0, r.s) * r.rate, 0);
  const totalStock = stock.reduce((sum, r) => sum + Math.max(0, r.s), 0);

  const receivables =
    (db
      .prepare(`SELECT COALESCE(SUM(total - paid_amount), 0) AS v FROM sales WHERE status != 'paid'`)
      .get() as { v: number }).v ?? 0;

  const openInvoices =
    (db.prepare(`SELECT COUNT(*) AS c FROM sales WHERE status != 'paid'`).get() as { c: number }).c ?? 0;

  const monthRevenue =
    (db.prepare(`SELECT COALESCE(SUM(total), 0) AS v FROM sales WHERE date >= ?`).get(monthStart) as {
      v: number;
    }).v ?? 0;

  const monthPurchases =
    (db.prepare(`SELECT COALESCE(SUM(amount), 0) AS v FROM purchases WHERE date >= ?`).get(monthStart) as {
      v: number;
    }).v ?? 0;

  const monthExpenses =
    (db.prepare(`SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE date >= ?`).get(monthStart) as {
      v: number;
    }).v ?? 0;

  return {
    todayProduction,
    monthProduction,
    monthRaw,
    stockValue,
    totalStock,
    receivables,
    monthRevenue,
    monthProfit: monthRevenue - monthPurchases - monthExpenses,
    monthDowntime,
    openInvoices,
  };
}

export interface TrendPoint {
  date: string;
  output: number;
  raw: number;
}

export function getProductionTrend(days = 30): TrendPoint[] {
  const db = getDb();
  const from = daysAgo(days - 1);
  const rows = db
    .prepare(
      `SELECT p.date,
        COALESCE((SELECT SUM(po.qty) FROM production_output po WHERE po.production_id = p.id), 0) AS output,
        SUM(p.raw_consumed) AS raw
       FROM production p WHERE p.date >= ? GROUP BY p.date ORDER BY p.date`
    )
    .all(from) as TrendPoint[];

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    out.push(byDate.get(date) ?? { date, output: 0, raw: 0 });
  }
  return out;
}

export interface Slice {
  name: string;
  value: number;
}

export function getStockBreakdown(): Slice[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.name,
        MAX(0, p.opening_stock + COALESCE((
          SELECT SUM(CASE WHEN t.dir = 'in' THEN t.qty ELSE -t.qty END)
          FROM inventory_tx t WHERE t.product_id = p.id), 0)) AS value
       FROM products p WHERE p.active = 1 AND p.kind != 'raw'
       ORDER BY value DESC`
    )
    .all() as Slice[];
  return rows;
}

export interface MonthPoint {
  month: string;
  sales: number;
  purchases: number;
}

export function getSalesPurchaseTrend(months = 6): MonthPoint[] {
  const db = getDb();
  const sales = db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month, SUM(total) AS sales FROM sales
       GROUP BY month ORDER BY month DESC LIMIT ?`
    )
    .all(months) as { month: string; sales: number }[];
  const purchases = db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS purchases FROM purchases
       GROUP BY month ORDER BY month DESC LIMIT ?`
    )
    .all(months) as { month: string; purchases: number }[];

  const map = new Map<string, MonthPoint>();
  for (const s of sales) map.set(s.month, { month: s.month, sales: s.sales, purchases: 0 });
  for (const p of purchases) {
    const entry = map.get(p.month) ?? { month: p.month, sales: 0, purchases: 0 };
    entry.purchases = p.purchases;
    map.set(p.month, entry);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function getExpenseBreakdown(from: string): Slice[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT category AS name, SUM(amount) AS value FROM expenses
       WHERE date >= ? GROUP BY category ORDER BY value DESC`
    )
    .all(from) as Slice[];
}

export interface TopCustomer {
  name: string;
  value: number;
  qty: number;
}

export function getTopCustomers(limit = 6, from: string): TopCustomer[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.name AS name, SUM(s.total) AS value,
        COALESCE((SELECT SUM(si.qty) FROM sale_items si WHERE si.sale_id = s.id
                  GROUP BY si.sale_id), 0) AS qty
       FROM sales s JOIN customers c ON c.id = s.customer_id
       WHERE s.date >= ? GROUP BY c.id ORDER BY value DESC LIMIT ?`
    )
    .all(from, limit) as TopCustomer[];
}

export interface ShiftStat {
  shift: string;
  avg: number;
}

export function getShiftStats(from: string): ShiftStat[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.shift,
        COALESCE(SUM((SELECT SUM(po.qty) FROM production_output po WHERE po.production_id = p.id)), 0)
          / NULLIF(COUNT(DISTINCT p.date), 0) AS avg
       FROM production p WHERE p.date >= ? GROUP BY p.shift`
    )
    .all(from) as ShiftStat[];
  return rows;
}

export interface CategorySum {
  name: string;
  value: number;
}

export function getPurchaseByCategory(from: string): CategorySum[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT category AS name, SUM(amount) AS value FROM purchases
       WHERE date >= ? GROUP BY category ORDER BY value DESC`
    )
    .all(from) as CategorySum[];
}

export interface MonthlyProduction {
  month: string;
  output: number;
}

export function getMonthlyProduction(months = 6): MonthlyProduction[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', p.date) AS month, COALESCE(SUM(po.qty), 0) AS output
       FROM production p JOIN production_output po ON po.production_id = p.id
       GROUP BY month ORDER BY month DESC LIMIT ?`
    )
    .all(months) as MonthlyProduction[];
  return rows.sort((a, b) => a.month.localeCompare(b.month));
}

export function hasAnyData(): boolean {
  const db = getDb();
  for (const t of ["production", "sales", "products"]) {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number };
    if (row.c > 0) return true;
  }
  return false;
}

export interface TodaySummary {
  shifts: number;
  raw: number;
  output: number;
  run_hours: number;
  down_hours: number;
  statuses: string[];
}

export function getTodaySummary(): TodaySummary {
  const db = getDb();
  const today = daysAgo(0);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS shifts, COALESCE(SUM(raw_consumed), 0) AS raw,
        COALESCE(SUM(run_hours), 0) AS run_hours, COALESCE(SUM(down_hours), 0) AS down_hours
       FROM production WHERE date = ?`
    )
    .get(today) as { shifts: number; raw: number; run_hours: number; down_hours: number };
  const output =
    (db
      .prepare(
        `SELECT COALESCE(SUM(po.qty), 0) AS v FROM production_output po
         JOIN production p ON p.id = po.production_id WHERE p.date = ?`
      )
      .get(today) as { v: number }).v ?? 0;
  const statuses = (
    db.prepare("SELECT DISTINCT status FROM production WHERE date = ?").all(today) as {
      status: string;
    }[]
  ).map((r) => r.status);
  return { ...row, output, statuses };
}
