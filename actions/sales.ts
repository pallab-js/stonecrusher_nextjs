"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { n, nAll, opt, optN, s } from "@/lib/form-helpers";
import { deleteSale, nextInvoiceNo, saveSale } from "@/lib/repo/operations";
import { getSettings, setSetting } from "@/lib/repo/masters";

const saleSchema = z.object({
  invoice_no: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  customer_id: z.number().nullable(),
  vehicle_no: z.string().optional(),
  transporter: z.string().optional(),
  discount: z.number().min(0),
  tax: z.number().min(0),
  paid_amount: z.number().min(0),
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
