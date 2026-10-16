import fs from "node:fs";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role, SessionUser } from "@/lib/auth";

import { dataDir } from "@/lib/paths";

export const SESSION_COOKIE = "stoneops_session";
const SESSION_DAYS = 7;

const SECRET_FILE = path.join(dataDir(), "session-secret");

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const existing = fs.readFileSync(SECRET_FILE, "utf8").trim();
      if (existing.length < 32) {
        throw new Error("Session secret file is too short to be trustworthy");
      }
      cachedSecret = new TextEncoder().encode(existing);
      return cachedSecret;
    }
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    const secret = crypto.randomUUID() + crypto.randomUUID();
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    cachedSecret = new TextEncoder().encode(secret);
    return cachedSecret;
  } catch (e) {
    // Fail closed: never sign or verify sessions with a guessable key. A missing
    // or unreadable secret is an environment problem the operator must fix.
    throw new Error(
      `Cannot establish a session secret at ${SECRET_FILE}. ` +
        `Check that the data directory is writable. (${e instanceof Error ? e.message : String(e)})`
    );
  }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.uid !== "number" ||
      typeof payload.name !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      name: payload.name,
      username: payload.username,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
