"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { n, nAll, opt, optN, s } from "@/lib/form-helpers";
import { deleteProduction, saveProduction, saveManualTx, deleteManualTx } from "@/lib/repo/operations";

const productionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  shift: z.enum(["morning", "evening", "night"]),
  line: z.string().trim().min(1),
  raw_consumed: z.number().min(0),
  run_hours: z.number().min(0).max(24),
  down_hours: z.number().min(0).max(24),
  status: z.enum(["running", "stopped", "maintenance"]),
  notes: z.string().optional(),
});

export async function saveProductionAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("operator");
  const parsed = productionSchema.safeParse({
    date: s(formData, "date"),
    shift: s(formData, "shift"),
    line: s(formData, "line") || "Line 1",
    raw_consumed: n(formData, "raw_consumed"),
    run_hours: n(formData, "run_hours"),
    down_hours: n(formData, "down_hours"),
    status: s(formData, "status") || "running",
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const productIds = nAll(formData, "out_product");
  const quantities = nAll(formData, "out_qty");
  const outputs = productIds
    .map((product_id, i) => ({ product_id, qty: quantities[i] ?? 0 }))
    .filter((o) => o.product_id > 0 && o.qty > 0);

  const id = optN(formData, "id");
  saveProduction(id, { ...parsed.data, outputs });
  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return ok(id == null ? "Shift entry saved" : "Shift entry updated");
}

export async function deleteProductionAction(formData: FormData): Promise<void> {
  await requireRole("operator");
  const id = optN(formData, "id");
  if (id == null) return;
  deleteProduction(id);
  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

const manualTxSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  product_id: z.number().positive("Choose a product"),
  dir: z.enum(["in", "out"]),
  qty: z.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

export async function saveManualTxAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("operator");
  const parsed = manualTxSchema.safeParse({
    date: s(formData, "date"),
    product_id: optN(formData, "product_id"),
    dir: s(formData, "dir"),
    qty: n(formData, "qty"),
    notes: opt(formData, "notes") ?? undefined,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  saveManualTx(parsed.data);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return ok("Stock adjusted");
}

export async function deleteManualTxAction(formData: FormData): Promise<void> {
  await requireRole("operator");
  const id = optN(formData, "id");
  if (id == null) return;
  deleteManualTx(id);
  revalidatePath("/inventory");
}
