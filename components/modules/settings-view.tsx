"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { UserRow } from "@/lib/repo/masters";
import type { SessionUser } from "@/lib/auth";
import {
  changePinAction,
  deleteUserAction,
  importBackupAction,
  runClearData,
  runLoadDemoData,
  saveUnitSettingsAction,
  saveUserAction,
} from "@/actions/settings";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SelectField, TextField } from "@/components/shared/fields";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface p-6 ring-1 ring-white/10">
      <h2 className="display text-lg text-white">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function useForm(action: (prev: FormState, formData: FormData) => Promise<FormState>) {
  const wrappedAction = async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const result = await action(_prev, formData);
    if (result?.success) toast.success(result.success);
    else if (result?.error) toast.error(result.error);
    return result;
  };
  const [, formAction, pending] = useActionState<FormState, FormData>(wrappedAction, null);
  return { formAction, pending };
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-magenta/15 text-magenta ring-magenta/30",
  operator: "bg-blurple/15 text-blurple ring-blurple/30",
  accountant: "bg-green/15 text-green ring-green/30",
};

export function SettingsView({
  settings,
  users,
  me,
}: {
  settings: Record<string, string>;
  users: UserRow[];
  me: SessionUser;
}) {
  const unitForm = useForm(saveUnitSettingsAction);
  const pinForm = useForm(changePinAction);
  const [pendingLoad, startTransition] = useTransition();

  const loadDemo = () =>
    startTransition(async () => {
      try {
        const msg = await runLoadDemoData();
        toast.success(msg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load demo data");
      }
    });

  const clearData = () =>
    startTransition(async () => {
      try {
        const msg = await runClearData();
        toast.success(msg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not clear data");
      }
    });

  return (
    <div className="grid max-w-5xl gap-6">
      <Section
        title="Unit profile"
        description="Shown on the dashboard, invoices and reports."
      >
        <form action={unitForm.formAction} className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <TextField label="Unit name" name="unit_name" defaultValue={settings.unit_name ?? ""} required />
          <TextField label="Location" name="unit_location" defaultValue={settings.unit_location ?? ""} />
          <TextField label="Base latitude" name="unit_lat" defaultValue={settings.unit_lat ?? ""} inputMode="decimal" />
          <TextField label="Base longitude" name="unit_lng" defaultValue={settings.unit_lng ?? ""} inputMode="decimal" />
          <TextField label="Invoice prefix" name="invoice_prefix" defaultValue={settings.invoice_prefix ?? "INV"} />
          <TextField label="GST rate %" name="gst_rate" defaultValue={settings.gst_rate ?? "5"} inputMode="decimal" />
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={unitForm.pending}
              className="rounded-md bg-blurple font-semibold text-white hover:bg-blurple/90"
            >
              {unitForm.pending && <Loader2 className="size-4 animate-spin" />}
              Save unit profile
            </Button>
          </div>
        </form>
      </Section>

      <Section title="My security" description="Change your sign-in PIN. 4–6 digits.">
        <form action={pinForm.formAction} className="grid max-w-md gap-4">
          <TextField
            label="Current PIN"
            name="current_pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New PIN" name="new_pin" type="password" inputMode="numeric" autoComplete="new-password" required />
            <TextField label="Repeat new PIN" name="confirm_pin" type="password" inputMode="numeric" autoComplete="new-password" required />
          </div>
          <div>
            <Button
              type="submit"
              disabled={pinForm.pending}
              className="rounded-md bg-blurple font-semibold text-white hover:bg-blurple/90"
            >
              {pinForm.pending && <Loader2 className="size-4 animate-spin" />}
              Change PIN
            </Button>
          </div>
        </form>
      </Section>

      <Section
        title="Users & roles"
        description="Admin: everything · Operator: production, inventory, maps · Accounts: sales, purchases, expenses, reports."
      >
        <div className="mb-4">
          <EntityDialog
            title="Add user"
            description="New operator or accounts login"
            triggerLabel="Add user"
            action={saveUserAction}
          >
            <input type="hidden" name="id" value="" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" name="name" required />
              <TextField label="Username" name="username" required autoComplete="off" />
              <SelectField
                label="Role"
                name="role"
                options={[
                  { value: "operator", label: "Operator" },
                  { value: "accountant", label: "Accounts" },
                  { value: "admin", label: "Admin" },
                ]}
                value="operator"
              />
              <TextField label="PIN (4–6 digits)" name="pin" inputMode="numeric" required autoComplete="off" />
            </div>
          </EntityDialog>
        </div>

        <div className="rounded-xl bg-canvas/60 ring-1 ring-white/5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-white">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                  <TableCell>
                    <span className={`rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${ROLE_BADGE[u.role] ?? ""}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EntityDialog
                        key={`edit-${u.id}`}
                        title="Edit user"
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-white">
                            <Pencil className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        submitLabel="Update"
                        action={saveUserAction}
                      >
                        <input type="hidden" name="id" value={u.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField label="Full name" name="name" defaultValue={u.name} required />
                          <TextField label="Username" name="username" defaultValue={u.username} required autoComplete="off" />
                          <SelectField
                            label="Role"
                            name="role"
                            value={u.role}
                            options={[
                              { value: "operator", label: "Operator" },
                              { value: "accountant", label: "Accounts" },
                              { value: "admin", label: "Admin" },
                            ]}
                          />
                          <TextField
                            label="Reset PIN (optional)"
                            name="pin"
                            inputMode="numeric"
                            placeholder="Leave blank to keep"
                            autoComplete="off"
                          />
                        </div>
                      </EntityDialog>
                      <ConfirmButton
                        title={`Remove ${u.name}?`}
                        description={
                          u.id === me.uid
                            ? "You cannot remove your own account."
                            : "This login will be deleted permanently."
                        }
                        disabled={u.id === me.uid}
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15 disabled:opacity-40">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(u.id));
                          await deleteUserAction(fd);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        title="Data"
        description="Everything lives in a local SQLite file — nothing leaves this machine. Export a JSON backup to copy data between machines."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmButton
            title="Load demo / seed data?"
            description="Replaces ALL current data with ~10 months of realistic demo production, sales, purchases and expenses. Users and unit settings are kept."
            confirmLabel="Load demo data"
            variant="default"
            trigger={
              <span className="inline-flex h-11 items-center gap-2 rounded-md bg-green px-5 text-sm font-bold text-black transition hover:bg-green/90">
                {pendingLoad && <Loader2 className="size-4 animate-spin" />}
                Load demo / seed data
              </span>
            }
            triggerClassName="inline-flex"
            onConfirm={loadDemo}
          />

          <ConfirmButton
            title="Clear all data?"
            description="Deletes every product, customer, invoice, shift, purchase and expense. This cannot be undone — export a backup first."
            confirmLabel="Clear everything"
            trigger={
              <span className="inline-flex h-11 items-center gap-2 rounded-md bg-surface px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-accent">
                Clear all data
              </span>
            }
            triggerClassName="inline-flex"
            onConfirm={clearData}
          />

          <a
            href="/api/backup"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-surface px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-accent"
            download
          >
            Export backup (.json)
          </a>

          <EntityDialog
            title="Restore backup"
            description="Import a StoneOps JSON backup. Current data will be replaced."
            triggerLabel="Restore backup…"
            action={importBackupAction}
            submitLabel="Restore"
            triggerClassName="inline-flex h-11 items-center gap-1.5 rounded-md bg-surface px-5 text-sm font-semibold text-white ring-1 ring-white/10 outline-none transition hover:bg-accent"
          >
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Backup file</span>
              <input
                type="file"
                name="file"
                accept="application/json,.json"
                className="flex h-9 w-full cursor-pointer items-center rounded-lg border border-input bg-canvas/60 px-2.5 text-sm file:mr-3 file:border-0 file:bg-transparent file:font-medium file:text-foreground"
              />
            </div>
          </EntityDialog>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Storage: <code className="text-cyan">./data/stonecrusher.db</code> · {users.length} user
          account{users.length === 1 ? "" : "s"} on this unit.
        </p>
      </Section>
    </div>
  );
}
