"use client";

import { useState } from "react";
import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import type { SupplierRow, ProductRow } from "@/lib/repo/masters";
import type { PurchaseRow } from "@/lib/repo/operations";
import { savePurchaseAction, deletePurchaseAction } from "@/actions/ledger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, NumberField, SelectField, TextAreaField, TextField } from "@/components/shared/fields";
import { daysAgo, fmtDate, humanize, inr, today } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "raw_stone", label: "Raw stone" },
  { value: "fuel", label: "Fuel" },
  { value: "spare_parts", label: "Spare parts" },
  { value: "electricity", label: "Electricity" },
  { value: "maintenance", label: "Maintenance" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green/15 text-green ring-green/30",
  partial: "bg-magenta/15 text-magenta ring-magenta/30",
  unpaid: "bg-destructive/15 text-red-400 ring-red-400/30",
};

export function PurchasesTable({
  rows,
  suppliers,
  products,
}: {
  rows: PurchaseRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [open, setOpen] = useState(false);

  const from30 = daysAgo(29);
  const monthSpend = rows.filter((r) => r.date >= from30).reduce((s, r) => s + r.amount, 0);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      (r.bill_no ?? "").toLowerCase().includes(q) ||
      (r.supplier_name ?? "").toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Bill, supplier, category…" />
          <span className="text-xs text-muted-foreground">
            Last 30 days ·{" "}
            <span className="font-bold text-white">{inr(monthSpend)}</span>
          </span>
        </div>

        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? `Bill ${editing.bill_no ?? `#${editing.id}`}` : "Record Purchase"}
          description="Bills paid or payable — raw stone also feeds inventory"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={savePurchaseAction}
          submitLabel={editing ? "Update bill" : "Record purchase"}
          triggerLabel="Record Purchase"
        >
          <PurchaseFields editing={editing} suppliers={suppliers} products={products} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={rows.length === 0 ? "No purchases yet" : "No matches"}
          description={
            rows.length === 0
              ? "Record quarry, fuel, power and spares bills here."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Date</TableHead>
                <TableHead className="hidden sm:table-cell">Bill</TableHead>
                <TableHead>Supplier / detail</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</TableCell>
                  <TableCell className="hidden font-medium text-white sm:table-cell">{r.bill_no ?? "—"}</TableCell>
                  <TableCell>
                    <span className="text-white">{r.supplier_name ?? "—"}</span>
                    <span className="block max-w-56 truncate text-xs text-muted-foreground">
                      {r.description ?? r.notes ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="rounded-pill bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10">
                      {humanize(r.category)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(r.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{inr(r.paid_amount)}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn("rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1", STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </TableCell>
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
                        title="Delete purchase?"
                        description="The bill and any linked stock movement will be removed."
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          await deletePurchaseAction(fd);
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

function PurchaseFields({
  editing,
  suppliers,
  products,
}: {
  editing: PurchaseRow | null;
  suppliers: SupplierRow[];
  products: ProductRow[];
}) {
  const [category, setCategory] = useState(editing?.category ?? "raw_stone");
  const isRaw = category === "raw_stone";

  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Category"
          name="category"
          value={editing?.category ?? "raw_stone"}
          options={CATEGORIES}
          onChange={setCategory}
        />
        <SelectField
          label="Supplier"
          name="supplier_id"
          value={editing?.supplier_id != null ? String(editing.supplier_id) : undefined}
          options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="Select supplier…"
        />
        <DateField label="Bill date" name="date" defaultValue={editing?.date ?? today()} required />
        <TextField label="Bill no." name="bill_no" defaultValue={editing?.bill_no ?? ""} placeholder="Optional" />
      </div>

      <TextAreaField label="Description" name="description" defaultValue={editing?.description ?? ""} placeholder="e.g. ROM boulders from quarry / diesel refill" />

      {isRaw && (
        <div className="grid gap-4 rounded-lg bg-canvas/60 p-3 ring-1 ring-white/5 sm:grid-cols-3">
          <SelectField
            label="Raw stone product"
            name="product_id"
            value={editing?.product_id != null ? String(editing.product_id) : undefined}
            options={products.filter((p) => p.kind === "raw").map((p) => ({ value: String(p.id), label: p.name }))}
            placeholder="Product…"
          />
          <NumberField label="Quantity (t)" name="qty" step="any" min={0} defaultValue={editing?.qty ?? ""} />
          <NumberField label="Rate (₹/t)" name="rate" step="any" min={0} defaultValue={editing?.rate ?? ""} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Amount ₹" name="amount" step="any" min={0} defaultValue={editing?.amount ?? ""} required />
        <NumberField label="Amount paid ₹" name="paid_amount" step="any" min={0} defaultValue={editing?.paid_amount ?? 0} />
      </div>
      <TextAreaField label="Notes" name="notes" defaultValue={editing?.notes ?? ""} placeholder="Optional remarks…" />
    </>
  );
}
