import { getDb } from "@/lib/db";
import { recomputeOrderStatus } from "@/lib/repo/orders";
import { r2, paymentStatus, formatDocNo, isShortStock, sumMoney, lineAmount, invoiceTotal, addMoney, subMoneyClamped } from "@/lib/money";

export { formatDocNo };

/* ── Types ─────────────────────────────────────────────── */

export interface ProductionOutput {
  product_id: number;
  qty: number;
}

export interface ProductionRow {
  id: number;
  date: string;
  shift: "morning" | "evening" | "night";
  line: string;
  raw_consumed: number;
  raw_product_id: number | null;
  run_hours: number;
  down_hours: number;
  status: "running" | "stopped" | "maintenance";
  notes: string | null;
  outputs: { product_id: number; name: string; qty: number }[];
  total_output: number;
}

export interface SaleItemInput {
  product_id: number;
  qty: number;
  rate: number;
}

export interface SaleRow {
  id: number;
  invoice_no: string;
  date: string;
  customer_id: number | null;
  customer_name: string | null;
  vehicle_no: string | null;
  transporter: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  status: "unpaid" | "partial" | "paid";
  order_id: number | null;
  notes: string | null;
  items: (SaleItemInput & { name: string; amount: number })[];
}

export interface PurchaseRow {
  id: number;
  bill_no: string | null;
  date: string;
  supplier_id: number | null;
  supplier_name: string | null;
  category: string;
  product_id: number | null;
  product_name: string | null;
  description: string | null;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  amount: number;
  paid_amount: number;
  status: "unpaid" | "partial" | "paid";
  grn_id: number | null;
  grn_no: string | null;
  notes: string | null;
}

export interface ExpenseRow {
  id: number;
  date: string;
  category: string;
  payee: string | null;
  amount: number;
  mode: string;
  notes: string | null;
}

export interface TxRow {
  id: number;
  date: string;
  product_id: number;
  product_name: string;
  dir: "in" | "out";
  qty: number;
  ref_type: string;
  ref_id: number | null;
  notes: string | null;
}

/* ── Atomic document numbering ─────────────────────────── */

/**
 * Allocate the next document number *inside the active transaction*, reading and
 * bumping the counter atomically so concurrent inserts (double-submit, two tabs)
 * can never read the same value. Must be called from within a `db.transaction`.
 */
export function allocateDocNo(
  db: ReturnType<typeof getDb>,
  prefixKey: string,
  counterKey: string,
  defaultPrefix: string
): string {
  const prefixRow = db.prepare("SELECT value FROM settings WHERE key = ?").get(prefixKey) as
    | { value: string }
    | undefined;
  const counterRow = db.prepare("SELECT value FROM settings WHERE key = ?").get(counterKey) as
    | { value: string }
    | undefined;
  const prefix = prefixRow?.value || defaultPrefix;
  const next = Number(counterRow?.value || "1") || 1;
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(counterKey, String(next + 1));
  return formatDocNo(prefix, next);
}

/* ── Production ────────────────────────────────────────── */

export function listProduction(limit = 500): ProductionRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM production ORDER BY date DESC, CASE shift WHEN 'morning' THEN 0 WHEN 'evening' THEN 1 ELSE 2 END LIMIT ?`
    )
    .all(limit) as Omit<ProductionRow, "outputs" | "total_output">[];

  const outputsStmt = db.prepare(
    `SELECT po.product_id, p.name, po.qty FROM production_output po
     JOIN products p ON p.id = po.product_id WHERE po.production_id = ?`
  );

  return rows.map((row) => {
    const outputs = outputsStmt.all(row.id) as {
      product_id: number;
      name: string;
      qty: number;
    }[];
    return {
      ...row,
      outputs,
      total_output: outputs.reduce((s, o) => s + o.qty, 0),
    };
  });
}

export interface ProductionInput {
  date: string;
  shift: string;
  line: string;
  raw_consumed: number;
  raw_product_id?: number | null;
  run_hours: number;
  down_hours: number;
  status: string;
  notes?: string;
  outputs: ProductionOutput[];
}

function writeProductionStock(productionId: number, input: ProductionInput) {
  const db = getDb();
  db.prepare(
    "DELETE FROM inventory_tx WHERE ref_type = 'production' AND ref_id = ?"
  ).run(productionId);

  const insertTx = db.prepare(
    `INSERT INTO inventory_tx (date, product_id, dir, qty, ref_type, ref_id, notes)
     VALUES (?, ?, ?, ?, 'production', ?, ?)`
  );

  for (const out of input.outputs) {
    if (out.qty > 0) {
      insertTx.run(input.date, out.product_id, "in", r2(out.qty), productionId, "Production output");
    }
  }

  if (input.raw_consumed > 0) {
    let rawId = input.raw_product_id ?? null;
    if (rawId == null) {
      const raw = db
        .prepare("SELECT id FROM products WHERE kind = 'raw' AND active = 1 ORDER BY id LIMIT 1")
        .get() as { id: number } | undefined;
      rawId = raw?.id ?? null;
    }
    if (rawId != null) {
      insertTx.run(
        input.date,
        rawId,
        "out",
        r2(input.raw_consumed),
        productionId,
        "Raw stone consumed"
      );
    }
  }
}

export function saveProduction(id: number | null, input: ProductionInput): number {
  const db = getDb();
  const run = db.transaction(() => {
    let productionId: number;
    if (id == null) {
      const info = db
        .prepare(
          `INSERT INTO production (date, shift, line, raw_consumed, raw_product_id, run_hours, down_hours, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.date,
          input.shift,
          input.line,
          r2(input.raw_consumed),
          input.raw_product_id ?? null,
          input.run_hours,
          input.down_hours,
          input.status,
          input.notes ?? null
        );
      productionId = Number(info.lastInsertRowid);
    } else {
      productionId = id;
      db.prepare(
        `UPDATE production SET date = ?, shift = ?, line = ?, raw_consumed = ?, raw_product_id = ?, run_hours = ?,
         down_hours = ?, status = ?, notes = ? WHERE id = ?`
      ).run(
        input.date,
        input.shift,
        input.line,
        r2(input.raw_consumed),
        input.raw_product_id ?? null,
        input.run_hours,
        input.down_hours,
        input.status,
        input.notes ?? null,
        id
      );
    }

    db.prepare("DELETE FROM production_output WHERE production_id = ?").run(productionId);
    const insertOutput = db.prepare(
      "INSERT INTO production_output (production_id, product_id, qty) VALUES (?, ?, ?)"
    );
    for (const out of input.outputs) {
      if (out.qty > 0) insertOutput.run(productionId, out.product_id, r2(out.qty));
    }

    writeProductionStock(productionId, input);
    return productionId;
  });
  return run() as number;
}

export function deleteProduction(id: number): void {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'production' AND ref_id = ?").run(id);
    db.prepare("DELETE FROM production WHERE id = ?").run(id);
  });
  run();
}

/* ── Sales ─────────────────────────────────────────────── */

export function listSales(limit = 500): SaleRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*, c.name AS customer_name FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.date DESC, s.id DESC LIMIT ?`
    )
    .all(limit) as (Omit<SaleRow, "items"> & { customer_name: string | null })[];

  const itemsStmt = db.prepare(
    `SELECT si.product_id, si.qty, si.rate, si.amount, p.name
     FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?`
  );

  return rows.map((row) => ({
    ...row,
    items: itemsStmt.all(row.id) as SaleRow["items"],
  }));
}

export interface SaleInput {
  invoice_no?: string;
  date: string;
  customer_id: number | null;
  vehicle_no?: string;
  transporter?: string;
  discount: number;
  tax: number;
  paid_amount: number;
  order_id?: number | null;
  notes?: string;
  items: SaleItemInput[];
}

/** @deprecated use formatDocNo; kept for callers/tests. */
export function nextInvoiceNo(prefix: string, next: number): string {
  return formatDocNo(prefix, next);
}

export function saveSale(
  id: number | null,
  input: SaleInput
): { id: number; invoice_no: string } {
  const db = getDb();
  const run = db.transaction(() => {
    const items = input.items.filter((i) => i.product_id > 0 && i.qty > 0);
    const subtotal = sumMoney(items.map((i) => lineAmount(i.qty, i.rate)));
    const tax = r2(input.tax);
    const discount = r2(input.discount);
    const total = invoiceTotal(subtotal, discount, tax);
    const paid = Math.min(r2(input.paid_amount), total);
    const status = paymentStatus(total, paid);

    let saleId: number;
    let invoiceNo = input.invoice_no;
    let previousOrderId: number | null = null;
    if (id == null) {
      // Allocate the invoice number atomically inside this transaction unless the
      // caller supplied an explicit one (e.g. restore/import).
      if (!invoiceNo) {
        invoiceNo = allocateDocNo(db, "invoice_prefix", "next_invoice_no", "INV");
      }
      const info = db
        .prepare(
          `INSERT INTO sales (invoice_no, date, customer_id, vehicle_no, transporter, subtotal, discount, tax, total, paid_amount, status, order_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          invoiceNo,
          input.date,
          input.customer_id,
          input.vehicle_no || null,
          input.transporter || null,
          subtotal,
          discount,
          tax,
          total,
          paid,
          status,
          input.order_id ?? null,
          input.notes ?? null
        );
      saleId = Number(info.lastInsertRowid);
    } else {
      saleId = id;
      // Never fabricate or overwrite the invoice number on edit: keep whatever
      // is already stored for this sale.
      const existing = db.prepare("SELECT invoice_no, order_id FROM sales WHERE id = ?").get(id) as
        | { invoice_no: string; order_id: number | null }
        | undefined;
      if (!existing) throw new Error("Invoice not found");
      invoiceNo = existing.invoice_no;
      previousOrderId = existing.order_id ?? null;
      db.prepare(
        `UPDATE sales SET date = ?, customer_id = ?, vehicle_no = ?, transporter = ?,
         subtotal = ?, discount = ?, tax = ?, total = ?, paid_amount = ?, status = ?, order_id = ?, notes = ? WHERE id = ?`
      ).run(
        input.date,
        input.customer_id,
        input.vehicle_no || null,
        input.transporter || null,
        subtotal,
        discount,
        tax,
        total,
        paid,
        status,
        input.order_id ?? null,
        input.notes ?? null,
        id
      );
      db.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(saleId);
      db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'sale' AND ref_id = ?").run(saleId);
    }

    const insertItem = db.prepare(
      "INSERT INTO sale_items (sale_id, product_id, qty, rate, amount) VALUES (?, ?, ?, ?, ?)"
    );
    const insertTx = db.prepare(
      `INSERT INTO inventory_tx (date, product_id, dir, qty, ref_type, ref_id, notes)
       VALUES (?, ?, 'out', ?, 'sale', ?, ?)`
    );
    for (const item of items) {
      const amount = lineAmount(item.qty, item.rate);
      insertItem.run(saleId, item.product_id, r2(item.qty), r2(item.rate), amount);
      insertTx.run(input.date, item.product_id, r2(item.qty), saleId, `Invoice ${invoiceNo}`);
    }

    if (input.order_id) recomputeOrderStatus(input.order_id);
    if (previousOrderId && previousOrderId !== input.order_id) recomputeOrderStatus(previousOrderId);
    return { id: saleId, invoice_no: invoiceNo as string };
  });
  return run() as { id: number; invoice_no: string };
}

export function deleteSale(id: number): void {
  const db = getDb();
  const run = db.transaction(() => {
    const order = db.prepare("SELECT order_id FROM sales WHERE id = ?").get(id) as
      | { order_id: number | null }
      | undefined;
    db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'sale' AND ref_id = ?").run(id);
    db.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(id);
    db.prepare("DELETE FROM sales WHERE id = ?").run(id);
    if (order?.order_id) recomputeOrderStatus(order.order_id);
  });
  run();
}

/* ── Purchases ─────────────────────────────────────────── */

export function listPurchases(limit = 500): PurchaseRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.*, s.name AS supplier_name, pr.name AS product_name, g.grn_no
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN grns g ON g.id = p.grn_id
       ORDER BY p.date DESC, p.id DESC LIMIT ?`
    )
    .all(limit) as PurchaseRow[];
}

export interface PurchaseInput {
  bill_no?: string;
  date: string;
  supplier_id: number | null;
  category: string;
  product_id?: number | null;
  description?: string;
  qty?: number | null;
  unit?: string;
  rate?: number | null;
  amount: number;
  paid_amount: number;
  grn_id?: number | null;
  notes?: string;
}

export function savePurchase(id: number | null, input: PurchaseInput): number {
  const db = getDb();
  const run = db.transaction(() => {
    const amount = r2(input.amount);
    const paid = Math.min(r2(input.paid_amount), amount);
    const status = paymentStatus(amount, paid);

    let purchaseId: number;
    if (id == null) {
      const info = db
        .prepare(
          `INSERT INTO purchases (bill_no, date, supplier_id, category, product_id, description, qty, unit, rate, amount, paid_amount, status, grn_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.bill_no || null,
          input.date,
          input.supplier_id,
          input.category,
          input.product_id,
          input.description || null,
          input.qty ?? null,
          input.unit || null,
          input.rate ?? null,
          amount,
          paid,
          status,
          input.grn_id ?? null,
          input.notes ?? null
        );
      purchaseId = Number(info.lastInsertRowid);
    } else {
      purchaseId = id;
      db.prepare(
        `UPDATE purchases SET bill_no = ?, date = ?, supplier_id = ?, category = ?, product_id = ?,
         description = ?, qty = ?, unit = ?, rate = ?, amount = ?, paid_amount = ?, status = ?,
         grn_id = ?, notes = ? WHERE id = ?`
      ).run(
        input.bill_no || null,
        input.date,
        input.supplier_id,
        input.category,
        input.product_id,
        input.description || null,
        input.qty ?? null,
        input.unit || null,
        input.rate ?? null,
        amount,
        paid,
        status,
        input.grn_id ?? null,
        input.notes ?? null,
        id
      );
      db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'purchase' AND ref_id = ?").run(purchaseId);
    }

    if (input.grn_id) {
      db.prepare("UPDATE grns SET status = 'billed' WHERE id = ?").run(input.grn_id);
    } else if (input.category === "raw_stone" && input.product_id && (input.qty ?? 0) > 0) {
      db.prepare(
        `INSERT INTO inventory_tx (date, product_id, dir, qty, ref_type, ref_id, notes)
         VALUES (?, ?, 'in', ?, 'purchase', ?, ?)`
      ).run(
        input.date,
        input.product_id,
        r2(input.qty ?? 0),
        purchaseId,
        input.bill_no ? `Bill ${input.bill_no}` : "Raw stone purchase"
      );
    }

    return purchaseId;
  });
  return run() as number;
}

export function deletePurchase(id: number): void {
  const db = getDb();
  const run = db.transaction(() => {
    const row = db.prepare("SELECT grn_id FROM purchases WHERE id = ?").get(id) as
      | { grn_id: number | null }
      | undefined;
    db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'purchase' AND ref_id = ?").run(id);
    db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
    if (row?.grn_id) db.prepare("UPDATE grns SET status = 'received' WHERE id = ?").run(row.grn_id);
  });
  run();
}

/* ── Expenses ──────────────────────────────────────────── */

export function listExpenses(limit = 500): ExpenseRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM expenses ORDER BY date DESC, id DESC LIMIT ?")
    .all(limit) as ExpenseRow[];
}

export interface ExpenseInput {
  date: string;
  category: string;
  payee?: string;
  amount: number;
  mode: string;
  notes?: string;
}

export function saveExpense(id: number | null, input: ExpenseInput): number {
  const db = getDb();
  if (id == null) {
    const info = db
      .prepare(
        "INSERT INTO expenses (date, category, payee, amount, mode, notes) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        input.date,
        input.category,
        input.payee || null,
        r2(input.amount),
        input.mode,
        input.notes ?? null
      );
    return Number(info.lastInsertRowid);
  }
  db.prepare(
    "UPDATE expenses SET date = ?, category = ?, payee = ?, amount = ?, mode = ?, notes = ? WHERE id = ?"
  ).run(
    input.date,
    input.category,
    input.payee || null,
    r2(input.amount),
    input.mode,
    input.notes ?? null,
    id
  );
  return id;
}

export function deleteExpense(id: number): void {
  getDb().prepare("DELETE FROM expenses WHERE id = ?").run(id);
}

/* ── Inventory transactions ────────────────────────────── */

export function listTransactions(limit = 200): TxRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, p.name AS product_name FROM inventory_tx t
       JOIN products p ON p.id = t.product_id
       ORDER BY t.date DESC, t.id DESC LIMIT ?`
    )
    .all(limit) as TxRow[];
}

export function saveManualTx(input: {
  date: string;
  product_id: number;
  dir: "in" | "out";
  qty: number;
  notes?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO inventory_tx (date, product_id, dir, qty, ref_type, notes) VALUES (?, ?, ?, ?, 'manual', ?)`
    )
    .run(input.date, input.product_id, input.dir, r2(input.qty), input.notes || null);
}

export function deleteManualTx(id: number): void {
  getDb().prepare("DELETE FROM inventory_tx WHERE id = ? AND ref_type = 'manual'").run(id);
}

/* ── Payments (receipts against invoices) ──────────────── */

export interface PaymentRow {
  id: number;
  sale_id: number;
  date: string;
  amount: number;
  mode: "cash" | "upi" | "bank" | "cheque";
  reference: string | null;
  notes: string | null;
}

export function listPayments(saleId?: number): PaymentRow[] {
  const db = getDb();
  const cols = "id, sale_id, date, amount, mode, reference, notes";
  if (saleId != null) {
    return db
      .prepare(`SELECT ${cols} FROM payments WHERE sale_id = ? ORDER BY date DESC, id DESC`)
      .all(saleId) as PaymentRow[];
  }
  return db
    .prepare(`SELECT ${cols} FROM payments ORDER BY date DESC, id DESC LIMIT 2000`)
    .all() as PaymentRow[];
}

export interface PaymentInput {
  date: string;
  amount: number;
  mode: string;
  reference?: string;
  notes?: string;
}

export function getBalance(saleId: number): number {
  const db = getDb();
  const sale = db.prepare("SELECT total, paid_amount FROM sales WHERE id = ?").get(saleId) as
    | { total: number; paid_amount: number }
    | undefined;
  if (!sale) return 0;
  return subMoneyClamped(sale.total, sale.paid_amount);
}

export function recordPayment(saleId: number, input: PaymentInput): number {
  const db = getDb();
  const run = db.transaction(() => {
    const sale = db.prepare("SELECT total, paid_amount FROM sales WHERE id = ?").get(saleId) as
      | { total: number; paid_amount: number }
      | undefined;
    if (!sale) throw new Error("Invoice not found");
    const amount = Math.min(r2(input.amount), subMoneyClamped(sale.total, sale.paid_amount));
    const info = db
      .prepare(
        "INSERT INTO payments (sale_id, date, amount, mode, reference, notes) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(saleId, input.date, amount, input.mode, input.reference || null, input.notes || null);
    const paid = addMoney(sale.paid_amount, amount);
    db.prepare("UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?").run(
      paid,
      paymentStatus(sale.total, paid),
      saleId
    );
    return Number(info.lastInsertRowid);
  });
  return run() as number;
}

export function deletePayment(id: number): void {
  const db = getDb();
  const run = db.transaction(() => {
    const payment = db.prepare("SELECT sale_id, amount FROM payments WHERE id = ?").get(id) as
      | { sale_id: number; amount: number }
      | undefined;
    if (!payment) return;
    db.prepare("DELETE FROM payments WHERE id = ?").run(id);
    const sale = db.prepare("SELECT total, paid_amount FROM sales WHERE id = ?").get(payment.sale_id) as {
      total: number;
      paid_amount: number;
    };
    const paid = subMoneyClamped(sale.paid_amount, payment.amount);
    db.prepare("UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?").run(
      paid,
      paymentStatus(sale.total, paid),
      payment.sale_id
    );
  });
  run();
}

/* ── Invoice document (print views) ────────────────────── */

export interface InvoiceDoc extends SaleRow {
  customer_address: string | null;
  customer_gstin: string | null;
  customer_state: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
}

export function getInvoiceDoc(id: number): InvoiceDoc | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.*, c.name AS customer_name, c.address AS customer_address, c.gstin AS customer_gstin,
        c.state AS customer_state, c.contact AS customer_contact, c.phone AS customer_phone
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`
    )
    .get(id) as (Omit<InvoiceDoc, "items"> & Record<string, unknown>) | undefined;
  if (!row) return null;
  const items = db
    .prepare(
      `SELECT si.product_id, si.qty, si.rate, si.amount, p.name
       FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?`
    )
    .all(id) as InvoiceDoc["items"];
  return { ...(row as unknown as InvoiceDoc), items };
}

export interface PaymentDoc extends PaymentRow {
  invoice_no: string;
  invoice_date: string;
  invoice_total: number;
  paid_amount: number;
  status: "unpaid" | "partial" | "paid";
  customer_name: string | null;
}

export function getPaymentDoc(id: number): PaymentDoc | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.id, p.sale_id, p.date, p.amount, p.mode, p.reference, p.notes,
        s.invoice_no, s.date AS invoice_date, s.total AS invoice_total, s.paid_amount, s.status,
        c.name AS customer_name
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE p.id = ?`
    )
    .get(id) as PaymentDoc | undefined;
  return row ?? null;
}

/* ── Stock ledger (print view) ─────────────────────────── */

export interface LedgerEntry {
  id: number;
  date: string;
  dir: "in" | "out";
  qty: number;
  ref_type: string;
  notes: string | null;
  balance: number;
}

export interface LedgerDoc {
  id: number;
  code: string;
  name: string;
  opening: number;
  rate: number;
  rows: LedgerEntry[];
  closing: number;
}

/* ── Stock availability ────────────────────────────────── */

/**
 * On-ground stock for a product = opening_stock + Σ(in) − Σ(out) across all
 * inventory transactions. `excludeSaleId` drops that sale's own 'out' rows so an
 * edit is validated against stock *excluding* what the invoice currently holds.
 */
export function availableStock(productId: number, excludeSaleId?: number | null): number {
  const db = getDb();
  const product = db
    .prepare("SELECT opening_stock FROM products WHERE id = ?")
    .get(productId) as { opening_stock: number } | undefined;
  if (!product) return 0;

  const movement = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN dir = 'in' THEN qty ELSE -qty END), 0) AS net
       FROM inventory_tx
       WHERE product_id = ?
         AND NOT (ref_type = 'sale' AND ref_id IS ?)`
    )
    .get(productId, excludeSaleId ?? -1) as { net: number };

  return r2(product.opening_stock + movement.net);
}

export interface StockShortfall {
  product_id: number;
  name: string;
  requested: number;
  available: number;
}

/**
 * Return any line items that would drive stock negative. `excludeSaleId` is the
 * sale being edited (its current 'out' rows are not counted against availability).
 */
export function checkStockAvailability(
  items: { product_id: number; qty: number }[],
  excludeSaleId?: number | null
): StockShortfall[] {
  const db = getDb();
  // Aggregate requested qty per product (a product can appear on multiple lines).
  const wanted = new Map<number, number>();
  for (const it of items) {
    if (it.product_id > 0 && it.qty > 0) {
      wanted.set(it.product_id, r2((wanted.get(it.product_id) ?? 0) + it.qty));
    }
  }

  const shortfalls: StockShortfall[] = [];
  const nameStmt = db.prepare("SELECT name FROM products WHERE id = ?");
  for (const [product_id, requested] of wanted) {
    const available = availableStock(product_id, excludeSaleId);
    if (isShortStock(requested, available)) {
      const row = nameStmt.get(product_id) as { name: string } | undefined;
      shortfalls.push({
        product_id,
        name: row?.name ?? `#${product_id}`,
        requested,
        available,
      });
    }
  }
  return shortfalls;
}

export function getStockLedger(productId: number): LedgerDoc | null {
  const db = getDb();
  const product = db
    .prepare("SELECT id, code, name, opening_stock, rate FROM products WHERE id = ?")
    .get(productId) as { id: number; code: string; name: string; opening_stock: number; rate: number } | undefined;
  if (!product) return null;

  const txs = db
    .prepare(
      "SELECT id, date, dir, qty, ref_type, notes FROM inventory_tx WHERE product_id = ? ORDER BY date ASC, id ASC"
    )
    .all(productId) as Omit<LedgerEntry, "balance">[];

  let balance = product.opening_stock;
  const rows = txs.map((t) => {
    balance = r2(balance + (t.dir === "in" ? t.qty : -t.qty));
    return { ...t, balance };
  });

  return {
    id: product.id,
    code: product.code,
    name: product.name,
    opening: product.opening_stock,
    rate: product.rate,
    rows,
    closing: r2(balance),
  };
}

export interface StockSummaryRow {
  id: number;
  code: string;
  name: string;
  kind: string;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  rate: number;
}

export function getStockSummary(): StockSummaryRow[] {
  const db = getDb();
  const products = db
    .prepare("SELECT id, code, name, kind, opening_stock, rate FROM products WHERE active = 1 ORDER BY kind, code")
    .all() as { id: number; code: string; name: string; kind: string; opening_stock: number; rate: number }[];

  const aggStmt = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN dir = 'in' THEN qty ELSE 0 END), 0) AS inflow,
            COALESCE(SUM(CASE WHEN dir = 'out' THEN qty ELSE 0 END), 0) AS outflow
     FROM inventory_tx WHERE product_id = ?`
  );

  return products.map((p) => {
    const agg = aggStmt.get(p.id) as { inflow: number; outflow: number };
    return {
      ...p,
      opening: p.opening_stock,
      inflow: r2(agg.inflow),
      outflow: r2(agg.outflow),
      closing: r2(p.opening_stock + agg.inflow - agg.outflow),
    };
  });
}
