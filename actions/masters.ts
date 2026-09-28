"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { getDb } from "@/lib/db";
import { n, opt, optN, s } from "@/lib/form-helpers";

/* ── Customers ─────────────────────────────────────────── */

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  contact: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  address: z.string().trim().optional(),
  state: z.string().trim().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export async function saveCustomerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const id = optN(formData, "id");
  const parsed = customerSchema.safeParse({
    name: s(formData, "name"),
    contact: opt(formData, "contact"),
    phone: opt(formData, "phone"),
    gstin: opt(formData, "gstin"),
    address: opt(formData, "address"),
    state: opt(formData, "state"),
    lat: optN(formData, "lat"),
    lng: optN(formData, "lng"),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const db = getDb();
  if (id == null) {
    db.prepare(
      `INSERT INTO customers (name, contact, phone, gstin, address, state, lat, lng, opening_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(d.name, d.contact || null, d.phone || null, d.gstin || null, d.address || null, d.state || null, d.lat ?? null, d.lng ?? null, n(formData, "opening_balance"));
  } else {
    db.prepare(
      `UPDATE customers SET name = ?, contact = ?, phone = ?, gstin = ?, address = ?, state = ?,
       lat = ?, lng = ?, opening_balance = ? WHERE id = ?`
    ).run(d.name, d.contact || null, d.phone || null, d.gstin || null, d.address || null, d.state || null, d.lat ?? null, d.lng ?? null, n(formData, "opening_balance"), id);
  }
  revalidatePath("/customers");
  return ok(id == null ? "Customer added" : "Customer updated");
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  const db = getDb();
  const used = db.prepare("SELECT COUNT(*) AS c FROM sales WHERE customer_id = ?").get(id) as { c: number };
  if (used.c > 0) {
    db.prepare("UPDATE customers SET active = 0 WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  }
  revalidatePath("/customers");
}

/* ── Suppliers ─────────────────────────────────────────── */

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  category: z.enum(["raw_stone", "fuel", "spare", "electricity", "transport", "service", "other"]),
  contact: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export async function saveSupplierAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const id = optN(formData, "id");
  const parsed = supplierSchema.safeParse({
    name: s(formData, "name"),
    category: s(formData, "category"),
    contact: opt(formData, "contact"),
    phone: opt(formData, "phone"),
    gstin: opt(formData, "gstin"),
    address: opt(formData, "address"),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const db = getDb();
  if (id == null) {
    db.prepare(
      `INSERT INTO suppliers (name, category, contact, phone, gstin, address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(d.name, d.category, d.contact || null, d.phone || null, d.gstin || null, d.address || null);
  } else {
    db.prepare(
      `UPDATE suppliers SET name = ?, category = ?, contact = ?, phone = ?, gstin = ?, address = ? WHERE id = ?`
    ).run(d.name, d.category, d.contact || null, d.phone || null, d.gstin || null, d.address || null, id);
  }
  revalidatePath("/suppliers");
  return ok(id == null ? "Supplier added" : "Supplier updated");
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  const db = getDb();
  const used = db.prepare("SELECT COUNT(*) AS c FROM purchases WHERE supplier_id = ?").get(id) as { c: number };
  if (used.c > 0) {
    db.prepare("UPDATE suppliers SET active = 0 WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  }
  revalidatePath("/suppliers");
}

/* ── Products ──────────────────────────────────────────── */

const productSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(2, "Name is required"),
  kind: z.enum(["raw", "aggregate", "byproduct"]),
  size_grade: z.string().trim().optional(),
  unit: z.string().trim().min(1),
  rate: z.number().min(0),
  opening_stock: z.number(),
});

export async function saveProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const id = optN(formData, "id");
  const parsed = productSchema.safeParse({
    code: s(formData, "code").toUpperCase(),
    name: s(formData, "name"),
    kind: s(formData, "kind"),
    size_grade: opt(formData, "size_grade"),
    unit: s(formData, "unit") || "tonne",
    rate: Math.max(0, n(formData, "rate")),
    opening_stock: n(formData, "opening_stock"),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const db = getDb();
  const dup = db
    .prepare("SELECT id FROM products WHERE code = ? AND id IS NOT ?")
    .get(d.code, id ?? -1) as { id: number } | undefined;
  if (dup) return err(`Code ${d.code} is already used`);

  if (id == null) {
    db.prepare(
      `INSERT INTO products (code, name, kind, size_grade, unit, rate, opening_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(d.code, d.name, d.kind, d.size_grade || null, d.unit, d.rate, d.opening_stock);
  } else {
    db.prepare(
      `UPDATE products SET code = ?, name = ?, kind = ?, size_grade = ?, unit = ?, rate = ? WHERE id = ?`
    ).run(d.code, d.name, d.kind, d.size_grade || null, d.unit, d.rate, id);
  }
  revalidatePath("/inventory");
  return ok(id == null ? "Product added" : "Product updated");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  const db = getDb();
  const used = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) +
              (SELECT COUNT(*) FROM production_output WHERE product_id = ?) +
              (SELECT COUNT(*) FROM inventory_tx WHERE product_id = ?) AS c`
    )
    .get(id, id, id) as { c: number };
  if (used.c > 0) {
    db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
  }
  revalidatePath("/inventory");
}
