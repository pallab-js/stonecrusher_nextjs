import { getSession } from "@/lib/session";
import type { Role, SessionUser } from "@/lib/auth";

/** Defense-in-depth guard for server actions (proxy already gates pages). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  if (session.role !== "admin" && !roles.includes(session.role)) {
    throw new Error("Not authorized for this action");
  }
  return session;
}
