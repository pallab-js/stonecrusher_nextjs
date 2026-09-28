import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "operator" | "accountant";

export interface SessionUser {
  uid: number;
  name: string;
  username: string;
  role: Role;
}

/** Hash a PIN as `scrypt$<salt>$<hash>` (both hex). */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const actual = scryptSync(pin, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

/**
 * Which top-level paths each role may access. `admin` is unrestricted.
 * Home path = first allowed entry (used for redirects).
 */
export const ROLE_PATHS: Record<Role, string[]> = {
  admin: ["*"],
  operator: ["/dashboard", "/production", "/inventory", "/maps", "/reports"],
  accountant: [
    "/dashboard",
    "/sales",
    "/purchases",
    "/expenses",
    "/customers",
    "/suppliers",
    "/reports",
  ],
};

export function homePath(role: Role): string {
  const paths = ROLE_PATHS[role];
  return paths[0] === "*" ? "/dashboard" : paths[0];
}

export function canAccess(role: Role, pathname: string): boolean {
  const paths = ROLE_PATHS[role];
  if (paths.includes("*")) return true;
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
