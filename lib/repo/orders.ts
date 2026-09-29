import { getDb } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────── */

export type OrderStatus = "open" | "partial" | "closed" | "cancelled";

export interface OrderItemInput {
  product_id: number;
  qty: number;
  rate: number;
}

export interface OrderItemRow extends OrderItemInput {
  id: number;
  order_id: number;
  name: string;
  invoiced: number;
  balance: number;
}

export interface OrderRow {
  id: number;
  order_no: string;
  date: string;
  customer_id: number | null;
  customer_name: string | null;
  delivery_date: string | null;
  status: OrderStatus;
  notes: string | null;
  items: OrderItemRow[];
  total_qty: number;
  invoiced_qty: number;
  value: number;
  invoice_count: number;
}

export interface OrderInput {
  date: string;
  customer_id: number | null;
  delivery_date?: string;
  status?: "open" | "cancelled";
  notes?: string;
  items: OrderItemInput[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ── Numbering ─────────────────────────────────────────── */

export function nextOrderNo(prefix: string, next: number): string {
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/* ── Read ──────────────────────────────────────────────── */

export function listOrders(limit = 500): OrderRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.*, c.name AS customer_name FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       ORDER BY o.date DESC, o.id DESC LIMIT ?`
    )
    .all(limit) as (Omit<OrderRow, "items" | "total_qty" | "invoiced_qty" | "value" | "invoice_count"> & {
    customer_name: string | null;
  })[];

  const itemsStmt = db.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.qty, oi.rate, p.name,
       COALESCE((
         SELECT SUM(si.qty) FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.order_id = oi.order_id AND si.product_id = oi.product_id
       ), 0) AS invoiced
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`
  );
  const countStmt = db.prepare(
    "SELECT COUNT(*) AS c FROM sales WHERE order_id = ?"
  );

  return rows.map((row) => {
    const items = (itemsStmt.all(row.id) as (OrderItemRow & { invoiced: number })[]).map((i) => ({
      ...i,
      invoiced: r2(i.invoiced),
      balance: r2(Math.max(0, i.qty - i.invoiced)),
    }));
    const total_qty = r2(items.reduce((s, i) => s + i.qty, 0));
    const invoiced_qty = r2(items.reduce((s, i) => s + i.invoiced, 0));
    return {
      ...row,
      items,
      total_qty,
      invoiced_qty,
      value: r2(items.reduce((s, i) => s + i.qty * i.rate, 0)),
      invoice_count: (countStmt.get(row.id) as { c: number }).c,
    };
  });
}

export function getOrder(id: number): OrderRow | null {
  return listOrders().find((o) => o.id === id) ?? null;
}

/** Orders a customer can still bill against. */
export function openOrders(customerId?: number | null): OrderRow[] {
  return listOrders().filter(
    (o) =>
      o.status !== "cancelled" &&
      o.status !== "closed" &&
      (customerId == null || o.customer_id === customerId)
  );
}

/* ── Status ────────────────────────────────────────────── */

export function recomputeOrderStatus(orderId: number): void {
  const db = getDb();
  const order = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as
    | { status: OrderStatus }
    | undefined;
  if (!order || order.status === "cancelled") return;

  const items = db
    .prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?")
    .all(orderId) as { product_id: number; qty: number }[];
  const invoiced = db
    .prepare(
      `SELECT si.product_id, SUM(si.qty) AS qty FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.order_id = ? GROUP BY si.product_id`
    )
    .all(orderId) as { product_id: number; qty: number }[];

  const byProduct = new Map(invoiced.map((i) => [i.product_id, i.qty]));
  if (items.length === 0) {
    db.prepare("UPDATE orders SET status = 'closed' WHERE id = ?").run(orderId);
    return;
  }
  const done = items.every((i) => (byProduct.get(i.product_id) ?? 0) + 0.01 >= i.qty);
  const some = items.some((i) => (byProduct.get(i.product_id) ?? 0) > 0);
  const status = done ? "closed" : some ? "partial" : "open";
  db.prepare("UPDATE orders SET status = ? WHERE id = ? AND status != 'cancelled'").run(status, orderId);
}

/* ── Write ─────────────────────────────────────────────── */

export function saveOrder(
  id: number | null,
  input: OrderInput,
  orderNo: string
): number {
  const db = getDb();
  const run = db.transaction(() => {
    let orderId: number;
    if (id == null) {
      const info = db
        .prepare(
          `INSERT INTO orders (order_no, date, customer_id, delivery_date, status, notes)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          orderNo,
          input.date,
          input.customer_id,
          input.delivery_date || null,
          input.status ?? "open",
          input.notes ?? null
        );
      orderId = Number(info.lastInsertRowid);
    } else {
      orderId = id;
      db.prepare(
        `UPDATE orders SET date = ?, customer_id = ?, delivery_date = ?, status = ?, notes = ?
         WHERE id = ?`
      ).run(
        input.date,
        input.customer_id,
        input.delivery_date || null,
        input.status ?? "open",
        input.notes ?? null,
        id
      );
      db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
    }

    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, qty, rate) VALUES (?, ?, ?, ?)"
    );
    for (const item of input.items) {
      if (item.product_id > 0 && item.qty > 0) {
        insertItem.run(orderId, item.product_id, r2(item.qty), r2(item.rate));
      }
    }
    recomputeOrderStatus(orderId);
    return orderId;
  });
  return run() as number;
}

export function deleteOrder(id: number): boolean {
  const db = getDb();
  const linked = db.prepare("SELECT COUNT(*) AS c FROM sales WHERE order_id = ?").get(id) as {
    c: number;
  };
  if (linked.c > 0) return false;
  db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
  db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  return true;
}
