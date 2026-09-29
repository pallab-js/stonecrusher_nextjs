import { getDb } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────── */

export type GrnStatus = "received" | "billed" | "cancelled";

export interface GrnItemInput {
  product_id: number;
  qty: number;
  rate: number;
}

export interface GrnItemRow extends GrnItemInput {
  id: number;
  grn_id: number;
  code: string;
  name: string;
}

export interface GrnRow {
  id: number;
  grn_no: string;
  date: string;
  supplier_id: number | null;
  supplier_name: string | null;
  vehicle_no: string | null;
  challan_no: string | null;
  status: GrnStatus;
  notes: string | null;
  items: GrnItemRow[];
  total_qty: number;
  value: number;
  purchase_id: number | null;
  purchase_bill: string | null;
}

export interface GrnInput {
  date: string;
  supplier_id: number | null;
  vehicle_no?: string;
  challan_no?: string;
  notes?: string;
  items: GrnItemInput[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function nextGrnNo(prefix: string, next: number): string {
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/* ── Read ──────────────────────────────────────────────── */

export function listGrns(limit = 500): GrnRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT g.*, s.name AS supplier_name, p.id AS purchase_id, p.bill_no AS purchase_bill
       FROM grns g
       LEFT JOIN suppliers s ON s.id = g.supplier_id
       LEFT JOIN purchases p ON p.grn_id = g.id
       ORDER BY g.date DESC, g.id DESC LIMIT ?`
    )
    .all(limit) as (Omit<GrnRow, "items" | "total_qty" | "value"> & {
    supplier_name: string | null;
    purchase_id: number | null;
    purchase_bill: string | null;
  })[];

  const itemsStmt = db.prepare(
    `SELECT gi.id, gi.grn_id, gi.product_id, gi.qty, gi.rate, pr.code, pr.name
     FROM grn_items gi
     JOIN products pr ON pr.id = gi.product_id
     WHERE gi.grn_id = ? ORDER BY gi.id`
  );

  return rows.map((row) => {
    const items = itemsStmt.all(row.id) as GrnItemRow[];
    return {
      ...row,
      items,
      total_qty: r2(items.reduce((s, i) => s + i.qty, 0)),
      value: r2(items.reduce((s, i) => s + i.qty * i.rate, 0)),
    };
  });
}

export function getGrn(id: number): GrnRow | null {
  return listGrns().find((g) => g.id === id) ?? null;
}

/* ── Write ─────────────────────────────────────────────── */

function writeGrnStock(grnId: number, input: GrnInput, grnNo: string) {
  const db = getDb();
  db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'grn' AND ref_id = ?").run(grnId);
  const insert = db.prepare(
    `INSERT INTO inventory_tx (date, product_id, dir, qty, ref_type, ref_id, notes)
     VALUES (?, ?, 'in', ?, 'grn', ?, ?)`
  );
  const label = `Goods receipt ${grnNo}${input.challan_no ? ` · challan ${input.challan_no}` : ""}`;
  for (const item of input.items) {
    if (item.product_id > 0 && item.qty > 0) {
      insert.run(input.date, item.product_id, r2(item.qty), grnId, label);
    }
  }
}

export function saveGrn(id: number | null, input: GrnInput, grnNo: string): number {
  const db = getDb();
  const run = db.transaction(() => {
    let grnId: number;
    if (id == null) {
      const info = db
        .prepare(
          `INSERT INTO grns (grn_no, date, supplier_id, vehicle_no, challan_no, status, notes)
           VALUES (?, ?, ?, ?, ?, 'received', ?)`
        )
        .run(
          grnNo,
          input.date,
          input.supplier_id,
          input.vehicle_no || null,
          input.challan_no || null,
          input.notes ?? null
        );
      grnId = Number(info.lastInsertRowid);
    } else {
      grnId = id;
      const existing = db.prepare("SELECT grn_no, status FROM grns WHERE id = ?").get(id) as
        | { grn_no: string; status: GrnStatus }
        | undefined;
      if (!existing) throw new Error("GRN not found");
      if (existing.status === "billed") throw new Error("This GRN is already billed");
      db.prepare(
        `UPDATE grns SET date = ?, supplier_id = ?, vehicle_no = ?, challan_no = ?, notes = ?
         WHERE id = ?`
      ).run(
        input.date,
        input.supplier_id,
        input.vehicle_no || null,
        input.challan_no || null,
        input.notes ?? null,
        id
      );
      grnNo = existing.grn_no;
      db.prepare("DELETE FROM grn_items WHERE grn_id = ?").run(grnId);
    }

    const insertItem = db.prepare(
      "INSERT INTO grn_items (grn_id, product_id, qty, rate) VALUES (?, ?, ?, ?)"
    );
    for (const item of input.items) {
      if (item.product_id > 0 && item.qty > 0) {
        insertItem.run(grnId, item.product_id, r2(item.qty), r2(item.rate));
      }
    }
    writeGrnStock(grnId, input, grnNo);
    return grnId;
  });
  return run() as number;
}

export function deleteGrn(id: number): boolean {
  const db = getDb();
  const grn = db.prepare("SELECT status FROM grns WHERE id = ?").get(id) as
    | { status: GrnStatus }
    | undefined;
  if (!grn) return false;
  if (grn.status === "billed") return false;
  db.prepare("DELETE FROM inventory_tx WHERE ref_type = 'grn' AND ref_id = ?").run(id);
  db.prepare("DELETE FROM grn_items WHERE grn_id = ?").run(id);
  db.prepare("DELETE FROM grns WHERE id = ?").run(id);
  return true;
}

export function setGrnStatus(id: number, status: GrnStatus): void {
  getDb().prepare("UPDATE grns SET status = ? WHERE id = ?").run(status, id);
}
