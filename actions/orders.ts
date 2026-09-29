"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { nAll, opt, optN, s } from "@/lib/form-helpers";
import { deleteOrder, nextOrderNo, saveOrder } from "@/lib/repo/orders";
import { deleteGrn, nextGrnNo, saveGrn } from "@/lib/repo/grns";
import { getSettings, setSetting } from "@/lib/repo/masters";

/* ── Customer orders (LPO) ─────────────────────────────── */

const orderSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  customer_id: z.number().positive("Choose a customer"),
  delivery_date: z.string().optional(),
  status: z.enum(["open", "cancelled"]),
  notes: z.string().optional(),
});

export async function saveOrderAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const parsed = orderSchema.safeParse({
    date: s(formData, "date"),
    customer_id: optN(formData, "customer_id"),
    delivery_date: opt(formData, "delivery_date") ?? undefined,
    status: s(formData, "status") || "open",
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const products = nAll(formData, "order_product");
  const quantities = nAll(formData, "order_qty");
  const rates = nAll(formData, "order_rate");
  const items = products
    .map((product_id, i) => ({
      product_id,
      qty: quantities[i] ?? 0,
      rate: rates[i] ?? 0,
    }))
    .filter((i) => i.product_id > 0 && i.qty > 0);
  if (items.length === 0) return err("Add at least one line with product and quantity");

  const id = optN(formData, "id");
  let orderNo = opt(formData, "order_no");
  if (id == null) {
    const settings = getSettings();
    const prefix = settings.order_prefix || "LPO";
    const next = Number(settings.next_order_no || "1");
    orderNo = orderNo || nextOrderNo(prefix, next);
    saveOrder(null, { ...parsed.data, items }, orderNo);
    setSetting("next_order_no", String(next + 1));
  } else {
    saveOrder(id, { ...parsed.data, items }, orderNo || "");
  }

  revalidatePath("/sales");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return ok(id == null ? `Order ${orderNo} created` : "Order updated");
}

export async function deleteOrderAction(formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return err("Order not found");
  const removed = deleteOrder(id);
  if (!removed) return err("Invoices exist against this order — delete them first");
  revalidatePath("/sales");
  revalidatePath("/customers");
  return ok("Order deleted");
}

/* ── Goods receipts (GRN) ──────────────────────────────── */

const grnSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  supplier_id: z.number().positive("Choose a supplier"),
  vehicle_no: z.string().optional(),
  challan_no: z.string().optional(),
  notes: z.string().optional(),
});

export async function saveGrnAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const parsed = grnSchema.safeParse({
    date: s(formData, "date"),
    supplier_id: optN(formData, "supplier_id"),
    vehicle_no: opt(formData, "vehicle_no") ?? undefined,
    challan_no: opt(formData, "challan_no") ?? undefined,
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const products = nAll(formData, "grn_product");
  const quantities = nAll(formData, "grn_qty");
  const rates = nAll(formData, "grn_rate");
  const items = products
    .map((product_id, i) => ({
      product_id,
      qty: quantities[i] ?? 0,
      rate: rates[i] ?? 0,
    }))
    .filter((i) => i.product_id > 0 && i.qty > 0);
  if (items.length === 0) return err("Add at least one received item");

  const id = optN(formData, "id");
  let grnNo = opt(formData, "grn_no");
  try {
    if (id == null) {
      const settings = getSettings();
      const prefix = settings.grn_prefix || "GRN";
      const next = Number(settings.next_grn_no || "1");
      grnNo = grnNo || nextGrnNo(prefix, next);
      saveGrn(null, { ...parsed.data, items }, grnNo);
      setSetting("next_grn_no", String(next + 1));
    } else {
      saveGrn(id, { ...parsed.data, items }, grnNo || "");
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not save the goods receipt");
  }

  const tonnes = items.reduce((sum, i) => sum + i.qty, 0);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return ok(
    id == null
      ? `GRN ${grnNo} recorded — ${Math.round(tonnes * 100) / 100} t added to stock`
      : "Goods receipt updated"
  );
}

export async function deleteGrnAction(formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return err("GRN not found");
  const removed = deleteGrn(id);
  if (!removed) return err("This GRN is billed — delete the bill first");
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  return ok("Goods receipt deleted — stock reversed");
}
