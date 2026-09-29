"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { n, nAll, opt, optN, s } from "@/lib/form-helpers";
import {
  deletePayment,
  deleteSale,
  getBalance,
  nextInvoiceNo,
  recordPayment,
  saveSale,
} from "@/lib/repo/operations";
import { getSettings, setSetting } from "@/lib/repo/masters";
import { inr } from "@/lib/format";

const saleSchema = z.object({
  invoice_no: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  customer_id: z.number().nullable(),
  vehicle_no: z.string().optional(),
  transporter: z.string().optional(),
  discount: z.number().min(0),
  tax: z.number().min(0),
  paid_amount: z.number().min(0),
  order_id: z.number().nullable(),
  notes: z.string().optional(),
});

export async function saveSaleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const parsed = saleSchema.safeParse({
    invoice_no: opt(formData, "invoice_no") ?? undefined,
    date: s(formData, "date"),
    customer_id: optN(formData, "customer_id"),
    vehicle_no: opt(formData, "vehicle_no") ?? undefined,
    transporter: opt(formData, "transporter") ?? undefined,
    discount: n(formData, "discount"),
    tax: n(formData, "tax"),
    paid_amount: n(formData, "paid_amount"),
    order_id: optN(formData, "order_id"),
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (parsed.data.customer_id == null) return err("Choose a customer");

  const productIds = nAll(formData, "item_product");
  const quantities = nAll(formData, "item_qty");
  const rates = nAll(formData, "item_rate");
  const items = productIds
    .map((product_id, i) => ({
      product_id,
      qty: quantities[i] ?? 0,
      rate: rates[i] ?? 0,
    }))
    .filter((i) => i.product_id > 0 && i.qty > 0);
  if (items.length === 0) return err("Add at least one line item");

  const id = optN(formData, "id");
  let invoiceNo = parsed.data.invoice_no;
  if (id == null) {
    const settings = getSettings();
    const prefix = settings.invoice_prefix || "INV";
    const next = Number(settings.next_invoice_no || "1");
    invoiceNo = invoiceNo || nextInvoiceNo(prefix, next);
    saveSale(null, { ...parsed.data, invoice_no: invoiceNo, items });
    setSetting("next_invoice_no", String(next + 1));
  } else {
    saveSale(id, { ...parsed.data, invoice_no: invoiceNo || "INV-EDIT", items });
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return ok(id == null ? `Invoice ${invoiceNo} created` : "Invoice updated");
}

export async function deleteSaleAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  deleteSale(id);
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

/* ── Payments ──────────────────────────────────────────── */

const paymentSchema = z.object({
  sale_id: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  mode: z.enum(["cash", "upi", "bank", "cheque"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordPaymentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const parsed = paymentSchema.safeParse({
    sale_id: optN(formData, "sale_id"),
    date: s(formData, "date"),
    amount: n(formData, "amount"),
    mode: s(formData, "mode") || "cash",
    reference: opt(formData, "reference") ?? undefined,
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const balance = getBalance(parsed.data.sale_id);
  if (balance <= 0) return err("This invoice is already fully paid");
  if (parsed.data.amount > balance + 0.01) {
    return err(`Amount exceeds balance due of ${inr(balance)}`);
  }

  const paymentId = recordPayment(parsed.data.sale_id, parsed.data);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return ok(`Payment of ${inr(parsed.data.amount)} recorded — receipt #${paymentId}`);
}

export async function deletePaymentAction(formData: FormData): Promise<void> {
  await requireRole("accountant");
  const id = optN(formData, "id");
  if (id == null) return;
  deletePayment(id);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
