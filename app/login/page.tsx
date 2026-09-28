import { getDb } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const db = getDb();
  const users = db
    .prepare("SELECT id, name, username, role FROM users WHERE active = 1 ORDER BY id")
    .all() as { id: number; name: string; username: string; role: string }[];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-feature bg-blurple shadow-[0_3px_68px_rgba(69,42,124,0.5)]">
            <svg viewBox="0 0 24 24" fill="none" className="size-8" aria-hidden>
              <path
                d="M3 18h18M5 18l3-9 4 5 3-7 4 11"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="display display-md text-white">StoneOps</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stone crusher operations — sign in with your PIN
          </p>
        </div>

        <LoginForm users={users} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Runs 100% locally — your data never leaves this machine.
        </p>
      </div>
    </main>
  );
}
