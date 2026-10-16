"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { homePath, verifyPin, type Role } from "@/lib/auth";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; success?: string } | null;

const loginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
});

const MAX_FAILS = 5; // failures allowed before a lockout kicks in
const LOCK_SECONDS = 60; // base lockout window; grows with each overflow failure

interface AttemptRow {
  fails: number;
  locked_until: string | null;
}

/** Milliseconds remaining on an active lockout, or 0 if not locked. */
function lockRemainingMs(row: AttemptRow | undefined): number {
  if (!row?.locked_until) return 0;
  const until = Date.parse(row.locked_until);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, until - Date.now());
}

function registerFailure(db: ReturnType<typeof getDb>, username: string): void {
  const row = db
    .prepare("SELECT fails, locked_until FROM login_attempts WHERE username = ?")
    .get(username) as AttemptRow | undefined;
  const fails = (row?.fails ?? 0) + 1;
  // Once over the threshold, lock for a window that grows with each extra miss.
  const lockedUntil =
    fails >= MAX_FAILS
      ? new Date(Date.now() + LOCK_SECONDS * 1000 * (fails - MAX_FAILS + 1)).toISOString()
      : null;
  db.prepare(
    `INSERT INTO login_attempts (username, fails, locked_until, last_attempt)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(username) DO UPDATE SET fails = excluded.fails,
       locked_until = excluded.locked_until, last_attempt = excluded.last_attempt`
  ).run(username, fails, lockedUntil);
}

function clearFailures(db: ReturnType<typeof getDb>, username: string): void {
  db.prepare("DELETE FROM login_attempts WHERE username = ?").run(username);
}

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { error: "Enter your username and a 4–6 digit PIN." };

  const db = getDb();
  const username = parsed.data.username;

  // Reject early if this account is currently locked out.
  const attempt = db
    .prepare("SELECT fails, locked_until FROM login_attempts WHERE username = ?")
    .get(username) as AttemptRow | undefined;
  const remaining = lockRemainingMs(attempt);
  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    return { error: `Too many attempts. Try again in ${secs} second${secs === 1 ? "" : "s"}.` };
  }

  const user = db
    .prepare("SELECT id, name, username, role, pin_hash FROM users WHERE username = ? AND active = 1")
    .get(username) as
    | { id: number; name: string; username: string; role: Role; pin_hash: string }
    | undefined;

  if (!user || !verifyPin(parsed.data.pin, user.pin_hash)) {
    registerFailure(db, username);
    await new Promise((r) => setTimeout(r, 250));
    return { error: "Incorrect PIN. Try again." };
  }

  clearFailures(db, username);
  await setSessionCookie({
    uid: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });
  redirect(homePath(user.role));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
