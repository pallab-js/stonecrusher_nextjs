"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Delete, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserLite {
  id: number;
  name: string;
  username: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  operator: "Operator",
  accountant: "Accounts",
};

export function LoginForm({ users }: { users: UserLite[] }) {
  const [selected, setSelected] = useState<UserLite | null>(
    users.length === 1 ? users[0] : null
  );
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
      setPin("");
      formRef.current?.querySelector<HTMLInputElement>('input[name="pin"]')?.focus();
    }
  }, [state]);

  if (!selected) {
    return (
      <div className="rounded-xl bg-surface/80 p-6 ring-1 ring-white/10 backdrop-blur">
        <h2 className="display mb-1 text-lg text-white">Who&apos;s signing in?</h2>
        <p className="mb-4 text-sm text-muted-foreground">Select your account</p>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelected(u)}
              className="flex items-center gap-3 rounded-md bg-canvas/70 px-4 py-3 text-left ring-1 ring-white/5 transition hover:bg-accent hover:ring-blurple/60"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-blurple text-sm font-bold text-white">
                {u.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {u.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABEL[u.role] ?? u.role} · @{u.username}
                </span>
              </span>
            </button>
          ))}
          {users.length === 0 && (
            <p className="rounded-md bg-canvas/70 px-4 py-3 text-sm text-muted-foreground">
              No users yet — load demo data from Settings after signing in as admin.
            </p>
          )}
        </div>
      </div>
    );
  }

  const press = (digit: string) => {
    setPin((p) => (p.length >= 6 ? p : p + digit));
  };

  return (
    <div className="rounded-xl bg-surface/80 p-6 ring-1 ring-white/10 backdrop-blur">
      <button
        type="button"
        onClick={() => {
          setSelected(null);
          setPin("");
        }}
        className="mb-4 text-xs font-medium text-cyan transition hover:underline"
      >
        ← Change user
      </button>

      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-blurple text-sm font-bold text-white">
          {selected.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{selected.name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[selected.role] ?? selected.role}</p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col items-center">
        <input type="hidden" name="username" value={selected.username} />
        <input type="hidden" name="pin" value={pin} />

        <div className="mb-5 flex gap-3" aria-label={`${pin.length} digits entered`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={
                "size-3.5 rounded-full transition " +
                (i < pin.length ? "bg-green shadow-[0_0_12px_rgba(53,237,126,0.7)]" : "bg-white/15")
              }
            />
          ))}
        </div>

        <div className="grid w-full max-w-[16rem] grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <KeyBtn key={d} onClick={() => press(d)}>
              {d}
            </KeyBtn>
          ))}
          <KeyBtn onClick={() => setPin("")}>C</KeyBtn>
          <KeyBtn onClick={() => press("0")}>0</KeyBtn>
          <KeyBtn onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Backspace">
            <Delete className="size-4" />
          </KeyBtn>
        </div>

        <Button
          type="submit"
          disabled={pending || pin.length < 4}
          className="mt-5 h-11 w-full max-w-[16rem] rounded-md bg-green text-base font-bold text-black hover:bg-green/90"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Unlock"}
        </Button>
      </form>
    </div>
  );
}

function KeyBtn({
  children,
  onClick,
  ...rest
}: React.ComponentProps<"button"> & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-13 items-center justify-center rounded-md bg-canvas/80 py-3 text-lg font-semibold text-white ring-1 ring-white/10 transition hover:bg-accent hover:ring-blurple/60 active:translate-y-px"
      {...rest}
    >
      {children}
    </button>
  );
}
