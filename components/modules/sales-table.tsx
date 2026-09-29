"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, ReceiptText, Trash2, Pencil, IndianRupee } from "lucide-react";
import Link from "next/link";
import type { ProductRow, CustomerRow } from "@/lib/repo/masters";
import type { PaymentRow, SaleRow } from "@/lib/repo/operations";
import { saveSaleAction, deleteSaleAction } from "@/actions/sales";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, NumberField, SelectField, TextAreaField, TextField } from "@/components/shared/fields";
import { fmtDate, inr, today, tonnes } from "@/lib/format";
import { PaymentDialog } from "@/components/modules/payment-dialog";
import { cn } from "@/lib/utils";

interface ItemDraft {
  key: number;
  product_id: string;
  qty: string;
  rate: string;
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green/15 text-green ring-green/30",
  partial: "bg-magenta/15 text-magenta ring-magenta/30",
  unpaid: "bg-destructive/15 text-red-400 ring-red-400/30",
};

let keyCounter = 1;

export function SalesTable({
  rows,
  products,
  customers,
  payments,
}: {
  rows: SaleRow[];
  products: ProductRow[];
  customers: CustomerRow[];
  payments: PaymentRow[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<SaleRow | null>(null);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      r.invoice_no.toLowerCase().includes(q) ||
      (r.customer_name ?? "").toLowerCase().includes(q) ||
      (r.vehicle_no ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={query} onChange={setQuery} placeholder="Invoice, customer, vehicle…" />
          <div className="flex gap-1 rounded-md bg-surface p-1 ring-1 ring-white/10">
            {["all", "unpaid", "partial", "paid"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold capitalize transition",
                  statusFilter === s ? "bg-blurple text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? `Invoice ${editing.invoice_no}` : "New Invoice"}
          description="Line items are dispatched from stock automatically"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveSaleAction}
          submitLabel={editing ? "Update invoice" : "Create invoice"}
          triggerLabel="New Invoice"
        >
          <InvoiceFields editing={editing} products={products} customers={customers} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={rows.length === 0 ? "No invoices yet" : "No matches"}
          description={
            rows.length === 0
              ? "Create your first invoice — stock is deducted automatically."
              : "Try a different search or status filter."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Dispatch</TableHead>
                <TableHead className="text-right">Tonnage</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold text-white">{r.invoice_no}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{fmtDate(r.date)}</TableCell>
                  <TableCell className="text-white">{r.customer_name ?? "—"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {r.vehicle_no ? `${r.vehicle_no}${r.transporter ? ` · ${r.transporter}` : ""}` : r.transporter ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{tonnes(r.items.reduce((s, i) => s + i.qty, 0))}</TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(r.total)}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn("rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1", STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Payments for ${r.invoice_no}`}
                        onClick={() => setPaying(r)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-white"
                      >
                        <IndianRupee className="size-3.5" />
                      </button>
                      <Link
                        href={`/sales/print/${r.id}`}
                        target="_blank"
                        aria-label={`Print invoice ${r.invoice_no}`}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-white"
                      >
                        <Printer className="size-3.5" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-white"
                        aria-label={`Edit ${r.invoice_no}`}
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmButton
                        title="Delete invoice?"
                        description={`${r.invoice_no} will be removed and its stock movements reversed.`}
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          await deleteSaleAction(fd);
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

      <PaymentDialog
        sale={paying}
        receipts={paying ? payments.filter((p) => p.sale_id === paying.id) : []}
        open={paying != null}
        onOpenChange={(o) => {
          if (!o) setPaying(null);
        }}
      />
    </>
  );
}

function InvoiceFields({
  editing,
  products,
  customers,
}: {
  editing: SaleRow | null;
  products: ProductRow[];
  customers: CustomerRow[];
}) {
  const [items, setItems] = useState<ItemDraft[]>(
    editing
      ? editing.items.map((i) => ({
          key: keyCounter++,
          product_id: String(i.product_id),
          qty: String(i.qty),
          rate: String(i.rate),
        }))
      : [{ key: keyCounter++, product_id: "", qty: "", rate: "" }]
  );
  const [discount, setDiscount] = useState(editing ? String(editing.discount) : "0");
  const [tax, setTax] = useState(editing ? String(editing.tax) : "0");
  const [paid, setPaid] = useState(editing ? String(editing.paid_amount) : "0");

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
    const d = Number(discount) || 0;
    const t = Number(tax) || 0;
    const total = Math.max(0, subtotal - d + t);
    return { subtotal, total, balance: total - (Number(paid) || 0) };
  }, [items, discount, tax, paid]);

  const setItem = (key: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Customer"
          name="customer_id"
          value={editing?.customer_id != null ? String(editing.customer_id) : undefined}
          options={customers.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Select customer…"
        />
        <DateField label="Invoice date" name="date" defaultValue={editing?.date ?? today()} required />
        <TextField label="Vehicle no." name="vehicle_no" defaultValue={editing?.vehicle_no ?? ""} placeholder="AS-01-XY-1234" />
        <TextField label="Transporter" name="transporter" defaultValue={editing?.transporter ?? ""} placeholder="Own fleet / hired" />
      </div>

      <div className="rounded-lg bg-canvas/60 p-3 ring-1 ring-white/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Line items</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md bg-blurple/15 text-xs font-semibold text-blurple hover:bg-blurple/25"
            onClick={() => setItems((l) => [...l, { key: keyCounter++, product_id: "", qty: "", rate: "" }])}
          >
            <Plus className="size-3.5" /> Add row
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_4.5rem_5rem_5.5rem_1.75rem] gap-2 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span>Product</span>
          <span className="text-right">Qty (t)</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
          <span />
        </div>

        <div className="grid gap-2">
          {items.map((item) => {
            const amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
            return (
              <div key={item.key} className="grid grid-cols-[1fr_4.5rem_5rem_5.5rem_1.75rem] items-center gap-2">
                <SelectField
                  label=""
                  name="item_product"
                  value={item.product_id || undefined}
                  options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                  placeholder="Product…"
                  onChange={(v) => {
                    const p = products.find((x) => String(x.id) === v);
                    setItem(item.key, { product_id: v, rate: p ? String(p.rate) : item.rate });
                  }}
                />
                <input
                  type="number"
                  name="item_qty"
                  step="any"
                  min="0"
                  value={item.qty}
                  onChange={(e) => setItem(item.key, { qty: e.target.value })}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-input bg-canvas/60 px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                  type="number"
                  name="item_rate"
                  step="any"
                  min="0"
                  value={item.rate}
                  onChange={(e) => setItem(item.key, { rate: e.target.value })}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-input bg-canvas/60 px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <span className="text-right text-sm font-semibold text-white">{inr(amount)}</span>
                <button
                  type="button"
                  onClick={() => setItems((l) => (l.length > 1 ? l.filter((i) => i.key !== item.key) : l))}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove row"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Discount ₹" name="discount" step="any" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        <NumberField label="Tax ₹" name="tax" step="any" min={0} value={tax} onChange={(e) => setTax(e.target.value)} />
        <NumberField label="Amount received ₹" name="paid_amount" step="any" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} />
      </div>

      <div className="rounded-lg bg-canvas/60 px-3 py-2.5 text-sm ring-1 ring-white/5">
        <Row label="Subtotal" value={inr(totals.subtotal)} />
        <Row label="Total payable" value={inr(totals.total)} strong />
        <Row
          label="Balance due"
          value={inr(Math.max(0, totals.balance))}
          accent={totals.balance > 0.01}
        />
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={editing?.notes ?? ""} placeholder="Optional remarks…" />
    </>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", strong ? "text-white" : "text-foreground", accent && "text-green")}>
        {value}
      </span>
    </div>
  );
}
