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
  const user = db
    .prepare("SELECT id, name, username, role, pin_hash FROM users WHERE username = ? AND active = 1")
    .get(parsed.data.username) as
    | { id: number; name: string; username: string; role: Role; pin_hash: string }
    | undefined;

  if (!user || !verifyPin(parsed.data.pin, user.pin_hash)) {
    await new Promise((r) => setTimeout(r, 250));
    return { error: "Incorrect PIN. Try again." };
  }

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
