"use client";

import Link from "next/link";
import { Printer, X } from "lucide-react";
import type { StatementDoc } from "@/lib/repo/statements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, inr, withRunningBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatementDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: StatementDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!doc) return null;

  const printHref = doc.kind === "customer" ? `/customers/statement/${doc.party_id}` : `/suppliers/statement/${doc.party_id}`;
  const billed = doc.rows.reduce((s, r) => s + r.debit, 0);
  const paid = doc.rows.reduce((s, r) => s + r.credit, 0);

  const rows = withRunningBalance(doc.opening, doc.rows);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-hairline bg-surface sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="display text-lg text-white">
            {doc.kind === "customer" ? "Customer statement" : "Supplier statement"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {doc.party} · {doc.entry_count} {doc.kind === "customer" ? "invoices" : "bills"} · closing balance{" "}
            <span className={cn("font-semibold", doc.closing > 0 ? "text-magenta" : "text-green")}>
              {inr(doc.closing)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Opening" value={inr(doc.opening)} />
            <Summary label={doc.kind === "customer" ? "Invoiced" : "Billed"} value={inr(billed)} />
            <Summary label="Received / paid" value={inr(paid)} />
            <Summary label="Closing" value={inr(doc.closing)} accent={doc.closing > 0} />
          </div>

          {rows.length === 0 ? (
            <p className="rounded-lg bg-canvas/60 px-3 py-6 text-center text-sm text-muted-foreground ring-1 ring-white/5">
              Nothing on this account yet.
            </p>
          ) : (
            <div className="rounded-xl bg-canvas/50 ring-1 ring-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.ref}-${i}`}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-white">{r.ref}</span>
                        <span className="block text-xs text-muted-foreground">{r.label}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{inr(r.debit)}</TableCell>
                      <TableCell className="text-right text-green">{r.credit > 0 ? inr(r.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-white">{inr(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-semibold text-muted-foreground transition hover:text-white"
          >
            <X className="size-4" /> Close
          </button>
          <Link
            href={printHref}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green px-4 text-sm font-bold text-black transition hover:bg-green/90"
          >
            <Printer className="size-4" /> Print statement
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-canvas/60 px-3 py-2 ring-1 ring-white/5">
      <span className="block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className={cn("text-sm font-bold", accent ? "text-magenta" : "text-white")}>{value}</span>
    </div>
  );
}
