import { getDb } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────── */

export interface ProductRow {
  id: number;
  code: string;
  name: string;
  kind: "raw" | "aggregate" | "byproduct";
  size_grade: string | null;
  unit: string;
  rate: number;
  opening_stock: number;
  active: number;
  stock: number;
}

export interface CustomerRow {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  opening_balance: number;
  active: number;
  total_sales: number;
  total_qty: number;
}

export interface SupplierRow {
  id: number;
  name: string;
  category: string;
  contact: string | null;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  active: number;
  total_purchases: number;
}

export interface UserRow {
  id: number;
  name: string;
  username: string;
  role: "admin" | "operator" | "accountant";
  active: number;
  created_at: string;
}

/* ── Products ──────────────────────────────────────────── */

export function listProducts(includeInactive = false): ProductRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.*,
        p.opening_stock + COALESCE((
          SELECT SUM(CASE WHEN t.dir = 'in' THEN t.qty ELSE -t.qty END)
          FROM inventory_tx t WHERE t.product_id = p.id
        ), 0) AS stock
       FROM products p
       ${includeInactive ? "" : "WHERE p.active = 1"}
       ORDER BY CASE p.kind WHEN 'raw' THEN 0 WHEN 'aggregate' THEN 1 ELSE 2 END, p.code`
    )
    .all() as ProductRow[];
}

export function productOptions(): { value: string; label: string }[] {
  return listProducts().map((p) => ({
    value: String(p.id),
    label: `${p.name}${p.size_grade ? ` (${p.size_grade})` : ""}`,
  }));
}

/* ── Customers ─────────────────────────────────────────── */

export function listCustomers(includeInactive = false): CustomerRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.*,
        COALESCE((SELECT SUM(s.total) FROM sales s WHERE s.customer_id = c.id), 0) AS total_sales,
        COALESCE((SELECT SUM(si.qty) FROM sale_items si JOIN sales s ON s.id = si.sale_id
                  WHERE s.customer_id = c.id), 0) AS total_qty
       FROM customers c
       ${includeInactive ? "" : "WHERE c.active = 1"}
       ORDER BY c.name COLLATE NOCASE`
    )
    .all() as CustomerRow[];
}

export function customerOptions(): { value: string; label: string }[] {
  return listCustomers().map((c) => ({ value: String(c.id), label: c.name }));
}

/* ── Suppliers ─────────────────────────────────────────── */

export function listSuppliers(includeInactive = false): SupplierRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*,
        COALESCE((SELECT SUM(p.amount) FROM purchases p WHERE p.supplier_id = s.id), 0) AS total_purchases
       FROM suppliers s
       ${includeInactive ? "" : "WHERE s.active = 1"}
       ORDER BY s.name COLLATE NOCASE`
    )
    .all() as SupplierRow[];
}

export function supplierOptions(category?: string): { value: string; label: string }[] {
  const db = getDb();
  const rows = (
    category
      ? db
          .prepare(
            "SELECT id, name FROM suppliers WHERE active = 1 AND category = ? ORDER BY name COLLATE NOCASE"
          )
          .all(category)
      : db
          .prepare("SELECT id, name FROM suppliers WHERE active = 1 ORDER BY name COLLATE NOCASE")
          .all()
  ) as { id: number; name: string }[];
  return rows.map((r) => ({ value: String(r.id), label: r.name }));
}

/* ── Settings ──────────────────────────────────────────── */

export function getSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

/* ── Users ─────────────────────────────────────────────── */

export function listUsers(): UserRow[] {
  const db = getDb();
  return db
    .prepare("SELECT id, name, username, role, active, created_at FROM users ORDER BY id")
    .all() as UserRow[];
}
