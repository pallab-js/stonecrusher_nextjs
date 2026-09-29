"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Pencil, Plus, Printer, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import type { CustomerRow, ProductRow } from "@/lib/repo/masters";
import type { OrderRow } from "@/lib/repo/orders";
import { saveOrderAction, deleteOrderAction } from "@/actions/orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, SelectField, TextAreaField, TextField } from "@/components/shared/fields";
import { fmtDate, inr, qty, today, tonnes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ItemDraft {
  key: number;
  product_id: string;
  qty: string;
  rate: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  partial: "bg-magenta/15 text-magenta ring-magenta/30",
  closed: "bg-green/15 text-green ring-green/30",
  cancelled: "bg-white/10 text-muted-foreground ring-white/15",
};

let keyCounter = 1;

export function OrdersTable({
  rows,
  customers,
  products,
  onInvoice,
}: {
  rows: OrderRow[];
  customers: CustomerRow[];
  products: ProductRow[];
  onInvoice: (order: OrderRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.order_no.toLowerCase().includes(q) ||
      (r.customer_name ?? "").toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="LPO no., customer…" />
          <span className="text-xs text-muted-foreground">
            {rows.filter((r) => r.status === "open" || r.status === "partial").length} open ·{" "}
            {tonnes(rows.reduce((s, r) => s + Math.max(0, r.total_qty - r.invoiced_qty), 0))} yet to bill
          </span>
        </div>

        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? `Order ${editing.order_no}` : "New Order (LPO)"}
          description="Customer purchase order — bill it against one or more invoices"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveOrderAction}
          submitLabel={editing ? "Update order" : "Create order"}
          triggerLabel="New Order"
        >
          <OrderFields editing={editing} customers={customers} products={products} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={rows.length === 0 ? "No customer orders yet" : "No matches"}
          description={
            rows.length === 0
              ? "Log an LPO from a customer, then bill it as stock is dispatched."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">LPO</TableHead>
                <TableHead className="hidden sm:table-cell">Ordered</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Delivery by</TableHead>
                <TableHead>Billing progress</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const pct = r.total_qty > 0 ? Math.min(100, (r.invoiced_qty / r.total_qty) * 100) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold text-white">{r.order_no}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{fmtDate(r.date)}</TableCell>
                    <TableCell className="text-white">{r.customer_name ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {r.delivery_date ? fmtDate(r.delivery_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-36">
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {qty(r.invoiced_qty)} / {qty(r.total_qty)} t
                          </span>
                          <span className="font-semibold text-white">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn("h-full rounded-full", pct >= 99.5 ? "bg-green" : "bg-blurple")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">{inr(r.value)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1",
                          STATUS_STYLE[r.status]
                        )}
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green hover:text-green"
                          aria-label={`Create invoice from ${r.order_no}`}
                          disabled={r.status === "cancelled" || r.status === "closed"}
                          onClick={() => onInvoice(r)}
                        >
                          <Zap className="size-3.5" />
                        </Button>
                        <Link
                          href={`/sales/orders/print/${r.id}`}
                          target="_blank"
                          aria-label={`Print order ${r.order_no}`}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-white"
                        >
                          <Printer className="size-3.5" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-white"
                          aria-label={`Edit ${r.order_no}`}
                          onClick={() => {
                            setEditing(r);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmButton
                          title="Delete order?"
                          description={`${r.order_no} will be removed. Invoices already raised against it are kept.`}
                          trigger={
                            <span
                              aria-label={`Delete ${r.order_no}`}
                              className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15"
                            >
                              <Trash2 className="size-3.5" />
                            </span>
                          }
                          triggerClassName="inline-flex"
                          onConfirm={async () => {
                            const fd = new FormData();
                            fd.set("id", String(r.id));
                            const res = await deleteOrderAction(fd);
                            if (res?.error) toast.error(res.error);
                            else if (res?.success) toast.success(res.success);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

function OrderFields({
  editing,
  customers,
  products,
}: {
  editing: OrderRow | null;
  customers: CustomerRow[];
  products: ProductRow[];
}) {
  const [items, setItems] = useState<ItemDraft[]>(
    editing && editing.items.length > 0
      ? editing.items.map((i) => ({
          key: keyCounter++,
          product_id: String(i.product_id),
          qty: String(i.qty),
          rate: String(i.rate),
        }))
      : [{ key: keyCounter++, product_id: "", qty: "", rate: "" }]
  );

  const setItem = (key: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <input type="hidden" name="order_no" value={editing?.order_no ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Customer"
          name="customer_id"
          value={editing?.customer_id != null ? String(editing.customer_id) : undefined}
          options={customers.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Select customer…"
        />
        <TextField label="LPO no." name="order_no_display" defaultValue={editing?.order_no ?? "Auto-generated"} disabled />
        <DateField label="Order date" name="date" defaultValue={editing?.date ?? today()} required />
        <DateField label="Delivery by" name="delivery_date" defaultValue={editing?.delivery_date ?? ""} />
        {editing && (
          <SelectField
            label="Status"
            name="status"
            value={editing.status === "cancelled" ? "cancelled" : "open"}
            options={[
              { value: "open", label: "Open" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        )}
      </div>

      <div className="rounded-lg bg-canvas/60 p-3 ring-1 ring-white/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Order lines</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md bg-blurple/15 text-xs font-semibold text-blurple hover:bg-blurple/25"
            onClick={() => setItems((l) => [...l, { key: keyCounter++, product_id: "", qty: "", rate: "" }])}
          >
            <Plus className="size-3.5" /> Add line
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
                  name="order_product"
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
                  name="order_qty"
                  step="any"
                  min="0"
                  value={item.qty}
                  onChange={(e) => setItem(item.key, { qty: e.target.value })}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-input bg-canvas/60 px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                  type="number"
                  name="order_rate"
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
                  aria-label="Remove order line"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={editing?.notes ?? ""} placeholder="Optional remarks…" />
    </>
  );
}
