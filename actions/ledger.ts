"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { n, opt, optN, s } from "@/lib/form-helpers";
import { deletePurchase, savePurchase } from "@/lib/repo/operations";
import { deleteExpense, saveExpense } from "@/lib/repo/operations";

/* ── Purchases ─────────────────────────────────────────── */

const purchaseSchema = z.object({
  bill_no: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  supplier_id: z.number().nullable(),
  category: z.enum([
    "raw_stone",
    "fuel",
    "spare_parts",
    "electricity",
    "maintenance",
    "transport",
    "other",
  ]),
  product_id: z.number().nullable(),
  description: z.string().optional(),
  qty: z.number().nullable(),
  unit: z.string().optional(),
  rate: z.number().nullable(),
  amount: z.number().min(0, "Amount is required"),
  paid_amount: z.number().min(0),
  notes: z.string().optional(),
});

export async function savePurchaseAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const category = s(formData, "category");
  const parsed = purchaseSchema.safeParse({
    bill_no: opt(formData, "bill_no") ?? undefined,
    date: s(formData, "date"),
    supplier_id: optN(formData, "supplier_id"),
    category,
    product_id: optN(formData, "product_id"),
    description: opt(formData, "description") ?? undefined,
    qty: optN(formData, "qty"),
    unit: opt(formData, "unit") ?? undefined,
    rate: optN(formData, "rate"),
    amount: n(formData, "amount"),
    paid_amount: n(formData, "paid_amount"),
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  if (parsed.data.amount <= 0) return err("Enter the bill amount");
  if (parsed.data.category === "raw_stone" && parsed.data.qty && !parsed.data.product_id) {
    return err("Choose the raw stone product to add it to stock");
  }

  const id = optN(formData, "id");
  savePurchase(id, parsed.data);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return ok(id == null ? "Purchase recorded" : "Purchase updated");
}

export async function deletePurchaseAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  deletePurchase(id);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

/* ── Expenses ──────────────────────────────────────────── */

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  category: z.enum(["payroll", "admin", "transport", "repair", "misc"]),
  payee: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  mode: z.enum(["cash", "upi", "bank"]),
  notes: z.string().optional(),
});

export async function saveExpenseAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("accountant");
  const parsed = expenseSchema.safeParse({
    date: s(formData, "date"),
    category: s(formData, "category"),
    payee: opt(formData, "payee") ?? undefined,
    amount: n(formData, "amount"),
    mode: s(formData, "mode") || "cash",
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const id = optN(formData, "id");
  saveExpense(id, parsed.data);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return ok(id == null ? "Expense added" : "Expense updated");
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = optN(formData, "id");
  if (id == null) return;
  deleteExpense(id);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
