"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import type { ExpenseRow } from "@/lib/repo/operations";
import { saveExpenseAction, deleteExpenseAction } from "@/actions/ledger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, NumberField, SelectField, TextAreaField, TextField } from "@/components/shared/fields";
import { fmtDate, humanize, inr, today } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "payroll", label: "Payroll" },
  { value: "admin", label: "Admin & office" },
  { value: "transport", label: "Transport" },
  { value: "repair", label: "Repairs & maintenance" },
  { value: "misc", label: "Miscellaneous" },
];

const MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank transfer" },
];

const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
};

export function ExpensesTable({ rows }: { rows: ExpenseRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTotal = rows
    .filter((r) => r.date.startsWith(month))
    .reduce((sum, r) => sum + r.amount, 0);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.category.toLowerCase().includes(q) ||
      (r.payee ?? "").toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Search expenses…" />
          <div className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-white/10">
            <span className="block text-[10px] tracking-widest text-muted-foreground uppercase">
              This month
            </span>
            <span className="text-sm font-semibold text-white">{inr(monthTotal)}</span>
          </div>
        </div>
        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? "Edit Expense" : "New Expense"}
          description="Day-to-day spending outside purchases"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveExpenseAction}
          submitLabel={editing ? "Update" : "Add expense"}
          triggerLabel="Add Expense"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label="Date" name="date" defaultValue={editing?.date ?? today()} required />
            <SelectField
              label="Category"
              name="category"
              value={editing?.category ?? "payroll"}
              options={CATEGORY_OPTIONS}
            />
            <TextField label="Payee" name="payee" defaultValue={editing?.payee ?? ""} placeholder="Who was paid" />
            <NumberField label="Amount ₹" name="amount" defaultValue={editing?.amount ?? 0} required min={0} />
            <SelectField
              label="Mode"
              name="mode"
              value={editing?.mode ?? "cash"}
              options={MODE_OPTIONS}
            />
          </div>
          <TextAreaField label="Notes" name="notes" defaultValue={editing?.notes ?? ""} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={rows.length === 0 ? "No expenses yet" : "No matches"}
          description={
            rows.length === 0
              ? "Add your first expense to start tracking day-to-day spending."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Payee</TableHead>
                <TableHead className="hidden md:table-cell">Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</TableCell>
                  <TableCell className="text-white">{humanize(r.category)}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{r.payee ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className="bg-white/5 text-muted-foreground ring-1 ring-white/10">
                      {MODE_LABELS[r.mode] ?? humanize(r.mode)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(r.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-white"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmButton
                        title="Delete expense?"
                        description={`This removes the ${humanize(r.category)} entry${r.payee ? ` for ${r.payee}` : ""} permanently.`}
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          await deleteExpenseAction(fd);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
