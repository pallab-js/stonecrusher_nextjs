import { getDb } from "@/lib/db";

export interface StatementLine {
  date: string;
  ref: string;
  label: string;
  debit: number;
  credit: number;
}

export interface StatementDoc {
  party_id: number;
  party: string;
  kind: "customer" | "supplier";
  address: string | null;
  phone: string | null;
  gstin: string | null;
  opening: number;
  rows: StatementLine[];
  closing: number;
  entry_count: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function getCustomerStatement(customerId: number): StatementDoc | null {
  const db = getDb();
  const customer = db
    .prepare("SELECT id, name, address, phone, gstin, opening_balance FROM customers WHERE id = ?")
    .get(customerId) as
    | { id: number; name: string; address: string | null; phone: string | null; gstin: string | null; opening_balance: number }
    | undefined;
  if (!customer) return null;

  const rows = db
    .prepare(
      `SELECT date, invoice_no, total, paid_amount FROM sales
       WHERE customer_id = ? ORDER BY date ASC, id ASC`
    )
    .all(customerId) as { date: string; invoice_no: string; total: number; paid_amount: number }[];

  const lines: StatementLine[] = rows.map((r) => ({
    date: r.date,
    ref: r.invoice_no,
    label: "Invoice",
    debit: r2(r.total),
    credit: r2(r.paid_amount),
  }));

  return finalize(customer, "customer", customer.opening_balance, lines);
}

export function getSupplierStatement(supplierId: number): StatementDoc | null {
  const db = getDb();
  const supplier = db
    .prepare("SELECT id, name, address, phone, gstin FROM suppliers WHERE id = ?")
    .get(supplierId) as
    | { id: number; name: string; address: string | null; phone: string | null; gstin: string | null }
    | undefined;
  if (!supplier) return null;

  const rows = db
    .prepare(
      `SELECT date, bill_no, amount, paid_amount FROM purchases
       WHERE supplier_id = ? ORDER BY date ASC, id ASC`
    )
    .all(supplierId) as { date: string; bill_no: string | null; amount: number; paid_amount: number }[];

  const lines: StatementLine[] = rows.map((r) => ({
    date: r.date,
    ref: r.bill_no ?? "Bill",
    label: "Purchase bill",
    debit: r2(r.amount),
    credit: r2(r.paid_amount),
  }));

  return finalize(supplier, "supplier", 0, lines);
}

function finalize(
  party: { id: number; name: string; address: string | null; phone: string | null; gstin: string | null },
  kind: "customer" | "supplier",
  opening: number,
  rows: StatementLine[]
): StatementDoc {
  const closing = r2(
    opening + rows.reduce((sum, r) => sum + r.debit - r.credit, 0)
  );
  return {
    party_id: party.id,
    party: party.name,
    kind,
    address: party.address,
    phone: party.phone,
    gstin: party.gstin,
    opening: r2(opening),
    rows,
    closing,
    entry_count: rows.length,
  };
}
