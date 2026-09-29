"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "./guard";
import { err, ok, type FormState } from "@/lib/form-state";
import { getDb } from "@/lib/db";
import { n, s } from "@/lib/form-helpers";
import { setSetting } from "@/lib/repo/masters";
import { hashPin, verifyPin, type Role } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { clearAllData, loadDemoData } from "@/lib/seed";
import { importBackup } from "@/lib/backup";

/* ── Demo data ─────────────────────────────────────────── */

export async function runLoadDemoData(): Promise<string> {
  await requireRole("admin");
  const r = loadDemoData();
  revalidatePath("/", "layout");
  return `Demo data loaded — ${r.production} shifts, ${r.sales} invoices, ${r.payments} receipts, ${r.purchases} bills, ${r.expenses} expenses across 10 months.`;
}

export async function runClearData(): Promise<string> {
  await requireRole("admin");
  clearAllData();
  revalidatePath("/", "layout");
  return "All operational data cleared (users & unit settings kept).";
}

/* ── Unit settings ─────────────────────────────────────── */

export async function saveUnitSettingsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("admin");
  const name = s(formData, "unit_name");
  if (name.length < 2) return err("Unit name is required");
  setSetting("unit_name", name);
  setSetting("unit_location", s(formData, "unit_location"));
  setSetting("unit_address", s(formData, "unit_address"));
  setSetting("unit_gstin", s(formData, "unit_gstin"));
  setSetting("unit_phone", s(formData, "unit_phone"));
  setSetting("unit_lat", s(formData, "unit_lat"));
  setSetting("unit_lng", s(formData, "unit_lng"));
  setSetting("invoice_prefix", s(formData, "invoice_prefix") || "INV");
  setSetting("gst_rate", s(formData, "gst_rate") || "5");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return ok("Unit settings saved");
}

/* ── PIN change ────────────────────────────────────────── */

export async function changePinAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) return err("Not signed in");
  const current = s(formData, "current_pin");
  const next = s(formData, "new_pin");
  const confirm = s(formData, "confirm_pin");

  if (!/^\d{4,6}$/.test(next)) return err("New PIN must be 4–6 digits");
  if (next !== confirm) return err("New PINs do not match");
  if (next === current) return err("New PIN must differ from the current one");

  const db = getDb();
  const user = db.prepare("SELECT pin_hash FROM users WHERE id = ?").get(session.uid) as
    | { pin_hash: string }
    | undefined;
  if (!user || !verifyPin(current, user.pin_hash)) return err("Current PIN is incorrect");

  db.prepare("UPDATE users SET pin_hash = ? WHERE id = ?").run(hashPin(next), session.uid);
  return ok("PIN changed successfully");
}

/* ── User management ───────────────────────────────────── */

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  username: z.string().trim().min(2, "Username is required"),
  role: z.enum(["admin", "operator", "accountant"]),
});

export async function saveUserAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("admin");
  const id = n(formData, "id") || null;
  const parsed = userSchema.safeParse({
    name: s(formData, "name"),
    username: s(formData, "username").toLowerCase(),
    role: s(formData, "role"),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const pin = s(formData, "pin");

  const db = getDb();
  const dup = db
    .prepare("SELECT id FROM users WHERE username = ? AND id IS NOT ?")
    .get(parsed.data.username, id ?? -1) as { id: number } | undefined;
  if (dup) return err("Username is already taken");

  if (id == null) {
    if (!/^\d{4,6}$/.test(pin)) return err("PIN must be 4–6 digits");
    db.prepare(
      "INSERT INTO users (name, username, role, pin_hash) VALUES (?, ?, ?, ?)"
    ).run(parsed.data.name, parsed.data.username, parsed.data.role, hashPin(pin));
  } else {
    if (pin && !/^\d{4,6}$/.test(pin)) return err("PIN must be 4–6 digits");
    db.prepare("UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?").run(
      parsed.data.name,
      parsed.data.username,
      parsed.data.role,
      id
    );
    if (pin) {
      db.prepare("UPDATE users SET pin_hash = ? WHERE id = ?").run(hashPin(pin), id);
    }
  }
  revalidatePath("/settings");
  return ok(id == null ? "User created" : "User updated");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = n(formData, "id") || null;
  if (id == null) return;
  const session = await getSession();
  if (session?.uid === id) return;

  const db = getDb();
  const admins = db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1")
    .get() as { c: number };
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as
    | { role: Role }
    | undefined;
  if (target?.role === "admin" && admins.c <= 1) return;

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  revalidatePath("/settings");
}

/* ── Backup restore ────────────────────────────────────── */

export async function importBackupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("admin");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return err("Choose a backup file first");
  try {
    const text = await file.text();
    const { imported } = importBackup(text);
    revalidatePath("/", "layout");
    const total = Object.values(imported).reduce((a, b) => a + b, 0);
    return ok(`Backup restored — ${total} records imported.`);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not read that file");
  }
}
