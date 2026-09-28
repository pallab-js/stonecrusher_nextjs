"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import type { SupplierRow } from "@/lib/repo/masters";
import { saveSupplierAction, deleteSupplierAction } from "@/actions/masters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField, TextField } from "@/components/shared/fields";
import { humanize, inr } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "raw_stone", label: "Raw stone" },
  { value: "fuel", label: "Fuel" },
  { value: "spare", label: "Spares" },
  { value: "electricity", label: "Electricity" },
  { value: "transport", label: "Transport" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

export function SuppliersTable({ rows }: { rows: SupplierRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search suppliers…" />
        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? "Edit Supplier" : "New Supplier"}
          description="Master record used on every purchase"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveSupplierAction}
          submitLabel={editing ? "Update" : "Add supplier"}
          triggerLabel="Add Supplier"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <TextField label="Name" name="name" defaultValue={editing?.name ?? ""} required placeholder="M/s Sunrise Quarry" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Category"
              name="category"
              value={editing?.category ?? "raw_stone"}
              options={CATEGORY_OPTIONS}
            />
            <TextField label="Contact person" name="contact" defaultValue={editing?.contact ?? ""} />
            <TextField label="Phone" name="phone" defaultValue={editing?.phone ?? ""} inputMode="tel" />
            <TextField label="GSTIN" name="gstin" defaultValue={editing?.gstin ?? ""} />
          </div>
          <TextField label="Address" name="address" defaultValue={editing?.address ?? ""} />
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={rows.length === 0 ? "No suppliers yet" : "No matches"}
          description={
            rows.length === 0
              ? "Add your first supplier to start recording purchases."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="rounded-xl bg-surface ring-1 ring-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium text-white">{r.name}</span>
                    <Badge className="mt-1 block w-fit bg-blurple/15 text-blurple ring-1 ring-blurple/30">
                      {humanize(r.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.phone ?? r.contact ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(r.total_purchases)}</TableCell>
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
                        title="Delete supplier?"
                        description={
                          r.total_purchases > 0
                            ? `${r.name} has purchases — they will be archived (deactivated) instead of deleted.`
                            : `This removes ${r.name} permanently.`
                        }
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/15">
                            <Trash2 className="size-3.5" />
                          </span>
                        }
                        triggerClassName="inline-flex"
                        onConfirm={async () => {
                          const fd = new FormData();
                          fd.set("id", String(r.id));
                          await deleteSupplierAction(fd);
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
