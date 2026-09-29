"use client";

import { useState } from "react";
import { Pencil, Plus, ReceiptText, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import type { SupplierRow, ProductRow } from "@/lib/repo/masters";
import type { GrnRow } from "@/lib/repo/grns";
import { saveGrnAction, deleteGrnAction } from "@/actions/orders";
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
  received: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  billed: "bg-green/15 text-green ring-green/30",
  cancelled: "bg-white/10 text-muted-foreground ring-white/15",
};

let keyCounter = 1;

export function GrnTable({
  rows,
  suppliers,
  products,
  onBill,
}: {
  rows: GrnRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  onBill: (grn: GrnRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<GrnRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.grn_no.toLowerCase().includes(q) ||
      (r.supplier_name ?? "").toLowerCase().includes(q) ||
      (r.vehicle_no ?? "").toLowerCase().includes(q) ||
      (r.challan_no ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="GRN no., supplier, vehicle…" />
          <span className="text-xs text-muted-foreground">
            {rows.filter((r) => r.status === "received").length} awaiting bill ·{" "}
            {tonnes(rows.filter((r) => r.status === "received").reduce((s, r) => s + r.total_qty, 0))} in yard
          </span>
        </div>

        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? `GRN ${editing.grn_no}` : "Record Goods Receipt"}
          description="Quarry delivery received into stock — bill it later"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveGrnAction}
          submitLabel={editing ? "Update receipt" : "Receive stock"}
          triggerLabel="Record GRN"
        >
          <GrnFields editing={editing} suppliers={suppliers} products={products} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={rows.length === 0 ? "No goods receipts yet" : "No matches"}
          description={
            rows.length === 0
              ? "Record each quarry truck as it arrives — stock lands instantly, billing can wait."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">GRN</TableHead>
                <TableHead className="hidden sm:table-cell">Received</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="hidden md:table-cell">Vehicle / challan</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold text-white">{r.grn_no}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{fmtDate(r.date)}</TableCell>
                  <TableCell className="text-white">{r.supplier_name ?? "—"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {r.vehicle_no || r.challan_no ? `${r.vehicle_no ?? "—"} · ${r.challan_no ?? "—"}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-56 space-y-0.5">
                      {r.items.map((i) => (
                        <span key={i.id} className="block truncate text-xs text-muted-foreground">
                          {i.name} · {qty(i.qty)} t
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">{tonnes(r.total_qty)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.value > 0 ? `≈ ₹${Math.round(r.value).toLocaleString("en-IN")}` : "—"}</TableCell>
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
                        aria-label={`Create bill from ${r.grn_no}`}
                        disabled={r.status !== "received"}
                        onClick={() => onBill(r)}
                      >
                        <Zap className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-white"
                        aria-label={`Edit ${r.grn_no}`}
                        disabled={r.status === "billed"}
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmButton
                        title="Delete goods receipt?"
                        description={`${r.grn_no} will be removed and its stock movement reversed.`}
                        trigger={
                          <span
                            aria-label={`Delete ${r.grn_no}`}
                            className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15"
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          const res = await deleteGrnAction(fd);
                          if (res?.error) toast.error(res.error);
                          else if (res?.success) toast.success(res.success);
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

function GrnFields({
  editing,
  suppliers,
  products,
}: {
  editing: GrnRow | null;
  suppliers: SupplierRow[];
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
      <input type="hidden" name="grn_no" value={editing?.grn_no ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Supplier (quarry)"
          name="supplier_id"
          value={editing?.supplier_id != null ? String(editing.supplier_id) : undefined}
          options={suppliers
            .filter((s) => s.category === "raw_stone")
            .map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="Select supplier…"
        />
        <DateField label="Received on" name="date" defaultValue={editing?.date ?? today()} required />
        <TextField
          label="Vehicle no."
          name="vehicle_no"
          defaultValue={editing?.vehicle_no ?? ""}
          placeholder="AS-01-XY-1234"
        />
        <TextField
          label="Challan no."
          name="challan_no"
          defaultValue={editing?.challan_no ?? ""}
          placeholder="Quarry challan"
        />
      </div>

      <div className="rounded-lg bg-canvas/60 p-3 ring-1 ring-white/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Received items
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md bg-blurple/15 text-xs font-semibold text-blurple hover:bg-blurple/25"
            onClick={() => setItems((l) => [...l, { key: keyCounter++, product_id: "", qty: "", rate: "" }])}
          >
            <Plus className="size-3.5" /> Add item
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
                  name="grn_product"
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
                  name="grn_qty"
                  step="any"
                  min="0"
                  value={item.qty}
                  onChange={(e) => setItem(item.key, { qty: e.target.value })}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-input bg-canvas/60 px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <input
                  type="number"
                  name="grn_rate"
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
                  aria-label="Remove received item"
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
