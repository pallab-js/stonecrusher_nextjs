"use client";

import { useState } from "react";
import { Factory, Plus, Pencil, Trash2 } from "lucide-react";
import type { ProductionRow } from "@/lib/repo/operations";
import type { ProductRow } from "@/lib/repo/masters";
import { saveProductionAction, deleteProductionAction } from "@/actions/production";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField, NumberField, SelectField, TextAreaField, TextField } from "@/components/shared/fields";
import { fmtDate, qty, shiftLabel, today, tonnes } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OutputDraft {
  key: number;
  product_id: string;
  qty: string;
}

const SHIFT_STYLE: Record<string, string> = {
  morning: "bg-green/15 text-green ring-green/30",
  evening: "bg-magenta/15 text-magenta ring-magenta/30",
  night: "bg-blurple/15 text-blurple ring-blurple/30",
};

const STATUS_STYLE: Record<string, string> = {
  running: "bg-green/15 text-green ring-green/30",
  stopped: "bg-destructive/15 text-red-400 ring-red-400/30",
  maintenance: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

const SHIFT_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "maintenance", label: "Maintenance" },
];

let keyCounter = 1;

export function ProductionTable({ rows, products }: { rows: ProductionRow[]; products: ProductRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProductionRow | null>(null);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthRows = rows.filter((r) => r.date.startsWith(month));
  const monthTotal = monthRows.reduce((sum, r) => sum + r.total_output, 0);
  const monthRaw = monthRows.reduce((sum, r) => sum + r.raw_consumed, 0);

  const split = new Map<number, { name: string; qty: number }>();
  for (const row of monthRows) {
    for (const out of row.outputs) {
      const entry = split.get(out.product_id) ?? { name: out.name, qty: 0 };
      entry.qty += out.qty;
      split.set(out.product_id, entry);
    }
  }
  const productSplit = [...split.values()].sort((a, b) => b.qty - a.qty);
  const yieldPct = monthRaw > 0 ? Math.round((monthTotal / monthRaw) * 100) : 0;

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.date.includes(q) ||
      r.line.toLowerCase().includes(q) ||
      (r.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Search date, line, notes…" />
          <div className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-white/10">
            <span className="text-sm font-semibold text-white">This month: {tonnes(monthTotal)}</span>
          </div>
          <div className="rounded-lg bg-surface px-3 py-1.5 ring-1 ring-white/10">
            <span className="text-sm font-semibold text-white">
              Raw {tonnes(monthRaw)} · yield {yieldPct}%
            </span>
          </div>
        </div>
        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? "Edit Shift Entry" : "Log Shift Entry"}
          description="Raw stone in, graded aggregates out — output lands in stock instantly"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveProductionAction}
          submitLabel={editing ? "Update entry" : "Save shift"}
          triggerLabel="Log Shift"
        >
          <ShiftFields editing={editing} products={products} />
        </EntityDialog>
      </div>

      {productSplit.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Product-wise this month
          </span>
          {productSplit.map((p) => (
            <span
              key={p.name}
              className="rounded-pill bg-surface px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/10"
            >
              {p.name} <span className="text-muted-foreground">·</span> {tonnes(p.qty)}
            </span>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Factory}
          title={rows.length === 0 ? "No shift entries yet" : "No matches"}
          description={
            rows.length === 0
              ? "Log your first crushing shift to start tracking raw stone and output."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="hidden sm:table-cell">Line</TableHead>
                <TableHead className="text-right">Raw (t)</TableHead>
                <TableHead className="hidden md:table-cell">Run / Downtime</TableHead>
                <TableHead>Output</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.date)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                        SHIFT_STYLE[r.shift]
                      )}
                    >
                      {shiftLabel(r.shift)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-white sm:table-cell">{r.line}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{tonnes(r.raw_consumed)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                    {r.run_hours}h / {r.down_hours}h
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        {r.outputs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          r.outputs.map((o) => (
                            <span key={o.product_id} className="block truncate text-xs text-muted-foreground">
                              {o.name} · {qty(o.qty)} t
                            </span>
                          ))
                        )}
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-white">
                        {tonnes(r.total_output)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1",
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
                        className="size-8 text-muted-foreground hover:text-white"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmButton
                        title="Delete shift entry?"
                        description={`${fmtDate(r.date)} · ${shiftLabel(r.shift)} — its stock movements will be reversed.`}
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          await deleteProductionAction(fd);
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

function ShiftFields({ editing, products }: { editing: ProductionRow | null; products: ProductRow[] }) {
  const [outputs, setOutputs] = useState<OutputDraft[]>(
    editing && editing.outputs.length > 0
      ? editing.outputs.map((o) => ({
          key: keyCounter++,
          product_id: String(o.product_id),
          qty: String(o.qty),
        }))
      : [{ key: keyCounter++, product_id: "", qty: "" }]
  );

  const setOutput = (key: number, patch: Partial<OutputDraft>) =>
    setOutputs((list) => list.map((o) => (o.key === key ? { ...o, ...patch } : o)));

  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField label="Date" name="date" defaultValue={editing?.date ?? today()} required />
        <SelectField label="Shift" name="shift" value={editing?.shift ?? "morning"} options={SHIFT_OPTIONS} />
        <TextField label="Line" name="line" defaultValue={editing?.line ?? "Line 1"} required placeholder="Line 1" />
        <SelectField
          label="Status"
          name="status"
          value={editing?.status ?? "running"}
          options={STATUS_OPTIONS}
        />
        <NumberField
          label="Raw stone consumed (t)"
          name="raw_consumed"
          min={0}
          defaultValue={editing?.raw_consumed ?? 0}
        />
        <NumberField label="Run hours" name="run_hours" min={0} max={24} defaultValue={editing?.run_hours ?? 0} />
        <NumberField label="Downtime hours" name="down_hours" min={0} max={24} defaultValue={editing?.down_hours ?? 0} />
      </div>

      <div className="rounded-lg bg-canvas/60 p-3 ring-1 ring-white/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Outputs</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md bg-blurple/15 text-xs font-semibold text-blurple hover:bg-blurple/25"
            onClick={() => setOutputs((l) => [...l, { key: keyCounter++, product_id: "", qty: "" }])}
          >
            <Plus className="size-3.5" /> Add output
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_5.5rem_1.75rem] gap-2 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span>Product</span>
          <span className="text-right">Qty (t)</span>
          <span />
        </div>

        <div className="grid gap-2">
          {outputs.map((out) => (
            <div key={out.key} className="grid grid-cols-[1fr_5.5rem_1.75rem] items-center gap-2">
              <SelectField
                label=""
                name="out_product"
                value={out.product_id || undefined}
                options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                placeholder="Product…"
                onChange={(v) => setOutput(out.key, { product_id: v })}
              />
              <input
                type="number"
                name="out_qty"
                step="any"
                min="0"
                value={out.qty}
                onChange={(e) => setOutput(out.key, { qty: e.target.value })}
                placeholder="0"
                className="h-9 w-full rounded-lg border border-input bg-canvas/60 px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <button
                type="button"
                onClick={() => setOutputs((l) => (l.length > 1 ? l.filter((o) => o.key !== out.key) : l))}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                aria-label="Remove output row"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <TextAreaField label="Notes" name="notes" defaultValue={editing?.notes ?? ""} placeholder="Optional remarks…" />
    </>
  );
}
