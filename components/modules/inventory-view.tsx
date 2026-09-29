"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Boxes, PackageSearch, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import type { ProductRow } from "@/lib/repo/masters";
import type { TxRow } from "@/lib/repo/operations";
import { saveProductAction } from "@/actions/masters";
import { saveManualTxAction, deleteManualTxAction } from "@/actions/production";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, NumberField, SelectField, TextField } from "@/components/shared/fields";
import { fmtDate, humanize, qty, today, tonnes } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_OPTIONS = [
  { value: "raw", label: "Raw stone" },
  { value: "aggregate", label: "Aggregate" },
  { value: "byproduct", label: "Byproduct" },
];

const DIR_OPTIONS = [
  { value: "in", label: "Stock in" },
  { value: "out", label: "Stock out" },
];

const DIR_STYLE: Record<string, string> = {
  in: "bg-green/15 text-green ring-green/30",
  out: "bg-magenta/15 text-magenta ring-magenta/30",
};

export function InventoryView({
  rows,
  txs,
  products,
}: {
  rows: ProductRow[];
  txs: TxRow[];
  products: ProductRow[];
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [preselectedProductId, setPreselectedProductId] = useState<number | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.kind.toLowerCase().includes(q) ||
      (r.size_grade ?? "").toLowerCase().includes(q)
    );
  });

  const maxStock = Math.max(...rows.map((r) => r.stock), 1);
  const recent = txs.slice(0, 15);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search products…" />
        <div className="flex flex-wrap items-center gap-2">
          <EntityDialog
            key={editing?.id ?? "new"}
            title={editing ? "Edit Product" : "Add Product"}
            description="Master record used across production, sales and purchases"
            open={productOpen}
            onOpenChange={(o) => {
              if (o) setEditing(null);
              setProductOpen(o);
            }}
            action={saveProductAction}
            submitLabel={editing ? "Update" : "Add product"}
            triggerLabel="Add Product"
          >
            <ProductFields editing={editing} />
          </EntityDialog>
          <EntityDialog
            key={preselectedProductId ?? "any"}
            title="Adjust Stock"
            description="Manual correction outside production, invoices and purchases"
            open={adjustOpen}
            onOpenChange={(o) => {
              if (o) setPreselectedProductId(null);
              setAdjustOpen(o);
            }}
            action={saveManualTxAction}
            submitLabel="Adjust stock"
            triggerLabel="Adjust Stock"
            triggerClassName="inline-flex h-9 items-center gap-1.5 rounded-md bg-surface px-3.5 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-accent"
          >
            <AdjustFields preselectedProductId={preselectedProductId} products={products} />
          </EntityDialog>
          <Link
            href="/inventory/ledger"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-surface px-3.5 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-accent"
          >
            <BookOpen className="size-4" /> Stock ledger
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={rows.length === 0 ? "No products yet" : "No matches"}
          description={
            rows.length === 0
              ? "Add raw stone and graded aggregates to start tracking stock."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const percent = Math.max(4, Math.min(100, (Math.max(p.stock, 0) / maxStock) * 100));
            return (
              <div key={p.id} className="rounded-xl bg-surface p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blurple/15 px-2 py-0.5 text-xs font-bold text-blurple">{p.code}</span>
                  <span className="text-xs text-muted-foreground">{humanize(p.kind)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-7 text-muted-foreground hover:text-white"
                    onClick={() => {
                      setEditing(p);
                      setProductOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-2 font-semibold text-white">{p.name}</p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="stat-number text-3xl text-white">{qty(p.stock)}</span>
                  <span className="text-sm text-muted-foreground">t</span>
                </p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-canvas">
                  <div
                    className={cn("h-1.5 rounded-full", p.stock > 0 ? "bg-green" : "bg-destructive")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">₹{p.rate}/t</span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/inventory/ledger?product=${p.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-canvas/80 px-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-white/10 transition hover:text-white"
                    >
                      Ledger
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-blurple/15 px-2.5 text-xs font-semibold text-blurple transition hover:bg-blurple/25"
                      onClick={() => {
                        setPreselectedProductId(p.id);
                        setAdjustOpen(true);
                      }}
                    >
                      <SlidersHorizontal className="size-3.5" /> Adjust
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h2 className="display mb-3 text-base text-white">Recent stock movements</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No stock movements yet"
            description="Production shifts, invoices and purchases will show up here."
          />
        ) : (
          <div className="rounded-xl bg-surface ring-1 ring-white/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Direction</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(t.date)}</TableCell>
                    <TableCell className="text-white">{t.product_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                          DIR_STYLE[t.dir]
                        )}
                      >
                        {t.dir === "in" ? "IN" : "OUT"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">{tonnes(t.qty)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      <span className="block">{humanize(t.ref_type)}</span>
                      {t.notes && <span className="block text-xs text-muted-foreground">{t.notes}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.ref_type === "manual" ? (
                        <ConfirmButton
                          title="Delete adjustment?"
                          description={`${t.product_name} — ${tonnes(t.qty)} will be reversed from stock.`}
                          trigger={
                            <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                              <Trash2 className="size-3.5" />
                            </span>
                          }
                          triggerClassName="inline-flex"
                          onConfirm={async () => {
                            const fd = new FormData();
                            fd.set("id", String(t.id));
                            await deleteManualTxAction(fd);
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

function ProductFields({ editing }: { editing: ProductRow | null }) {
  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Code"
          name="code"
          defaultValue={editing?.code ?? ""}
          required
          placeholder="20MM"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
          }}
        />
        <TextField label="Name" name="name" defaultValue={editing?.name ?? ""} required placeholder="20 mm aggregate" />
        <SelectField label="Kind" name="kind" value={editing?.kind ?? "raw"} options={KIND_OPTIONS} />
        <TextField label="Size grade" name="size_grade" defaultValue={editing?.size_grade ?? ""} placeholder="20 mm" />
        <TextField label="Unit" name="unit" defaultValue={editing?.unit ?? "tonne"} required />
        <NumberField label="Rate ₹/t" name="rate" min={0} defaultValue={editing?.rate ?? 0} />
        <NumberField label="Opening stock (t)" name="opening_stock" defaultValue={editing?.opening_stock ?? 0} />
      </div>
    </>
  );
}

function AdjustFields({
  preselectedProductId,
  products,
}: {
  preselectedProductId: number | null;
  products: ProductRow[];
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField label="Date" name="date" defaultValue={today()} required />
        <SelectField
          label="Product"
          name="product_id"
          value={preselectedProductId != null ? String(preselectedProductId) : undefined}
          options={products.map((p) => ({ value: String(p.id), label: p.name }))}
          placeholder="Select product…"
        />
        <SelectField label="Direction" name="dir" value="in" options={DIR_OPTIONS} />
        <NumberField label="Quantity (t)" name="qty" min={0} defaultValue={0} />
      </div>
      <TextField label="Notes" name="notes" defaultValue="" placeholder="Reason for adjustment…" />
    </>
  );
}
