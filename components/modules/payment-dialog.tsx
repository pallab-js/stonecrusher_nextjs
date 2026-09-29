"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Printer, Trash2 } from "lucide-react";
import type { PaymentRow, SaleRow } from "@/lib/repo/operations";
import { deletePaymentAction, recordPaymentAction } from "@/actions/sales";
import type { FormState } from "@/lib/form-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateField, NumberField, SelectField, TextField } from "@/components/shared/fields";
import { fmtDate, inr, today } from "@/lib/format";
import { cn } from "@/lib/utils";

const MODE_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
];

export function PaymentDialog({
  sale,
  receipts,
  open,
  onOpenChange,
}: {
  sale: SaleRow | null;
  receipts: PaymentRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const wrapped = async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const result = await recordPaymentAction(_prev, formData);
    if (result?.success) {
      toast.success(result.success);
      onOpenChange(false);
    } else if (result?.error) {
      toast.error(result.error);
    }
    return result;
  };
  const [, formAction, pending] = useActionState<FormState, FormData>(wrapped, null);

  if (!sale) return null;
  const balance = Math.max(0, sale.total - sale.paid_amount);

  const remove = async (id: number) => {
    setDeletingId(id);
    try {
      const fd = new FormData();
      fd.set("id", String(id));
      await deletePaymentAction(fd);
      toast.success("Receipt deleted — balance recalculated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete receipt");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-lg text-white">Payments — {sale.invoice_no}</DialogTitle>
          <DialogDescription>
            {sale.customer_name ?? "No customer"} · invoiced {fmtDate(sale.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1 rounded-lg bg-canvas/60 px-3 py-2.5 text-sm ring-1 ring-white/5">
          <Line label="Invoice total" value={inr(sale.total)} />
          <Line label="Received" value={inr(sale.paid_amount)} />
          <Line label="Balance due" value={inr(balance)} accent={balance > 0.01} />
        </div>

        {receipts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">Receipts</p>
            <ul className="grid gap-1.5">
              {receipts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-md bg-canvas/60 px-3 py-2 text-sm ring-1 ring-white/5"
                >
                  <span className="text-muted-foreground">{fmtDate(p.date)}</span>
                  <span className="rounded-pill bg-blurple/15 px-2 py-0.5 text-[11px] font-bold text-blurple uppercase ring-1 ring-blurple/30">
                    {p.mode}
                  </span>
                  {p.reference && <span className="truncate text-xs text-muted-foreground">{p.reference}</span>}
                  <span className="ml-auto font-semibold text-white">{inr(p.amount)}</span>
                  <Link
                    href={`/sales/receipt/${p.id}`}
                    target="_blank"
                    aria-label={`Print receipt for ${inr(p.amount)}`}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-white"
                  >
                    <Printer className="size-3.5" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete receipt for ${inr(p.amount)}`}
                    disabled={deletingId === p.id}
                    onClick={() => void remove(p.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {balance > 0.01 ? (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="sale_id" value={sale.id} />
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Record payment</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label="Date" name="date" defaultValue={today()} required />
              <NumberField
                label={`Amount ₹ (max ${inr(balance)})`}
                name="amount"
                min={0}
                step="any"
                defaultValue={balance}
                required
              />
              <SelectField label="Mode" name="mode" value="upi" options={MODE_OPTIONS} />
              <TextField label="Reference" name="reference" defaultValue="" placeholder="UPI ref / cheque no." />
            </div>
            <TextField label="Notes" name="notes" defaultValue="" placeholder="Optional remark…" />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-green font-bold text-black hover:bg-green/90"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="rounded-md bg-green/10 px-3 py-2.5 text-sm font-semibold text-green">
            Fully paid — nothing due on this invoice.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", accent ? "text-green" : "text-white")}>{value}</span>
    </div>
  );
}
