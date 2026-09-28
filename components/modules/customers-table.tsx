"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import type { CustomerRow } from "@/lib/repo/masters";
import { saveCustomerAction, deleteCustomerAction } from "@/actions/masters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SearchBox } from "@/components/shared/search-box";
import { EmptyState } from "@/components/shared/empty-state";
import { NumberField, TextField } from "@/components/shared/fields";
import { inr, tonnes } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      (r.state ?? "").toLowerCase().includes(q) ||
      (r.contact ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search customers…" />
        <EntityDialog
          key={editing?.id ?? "new"}
          title={editing ? "Edit Customer" : "New Customer"}
          description="Master record used on every invoice"
          open={open}
          onOpenChange={(o) => {
            if (o) setEditing(null);
            setOpen(o);
          }}
          action={saveCustomerAction}
          submitLabel={editing ? "Update" : "Add customer"}
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <TextField label="Name" name="name" defaultValue={editing?.name ?? ""} required placeholder="M/s Agarwal Traders" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Contact person" name="contact" defaultValue={editing?.contact ?? ""} />
            <TextField label="Phone" name="phone" defaultValue={editing?.phone ?? ""} inputMode="tel" />
            <TextField label="GSTIN" name="gstin" defaultValue={editing?.gstin ?? ""} />
            <TextField label="State" name="state" defaultValue={editing?.state ?? ""} />
          </div>
          <TextField label="Address" name="address" defaultValue={editing?.address ?? ""} />
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Latitude" name="lat" step="any" defaultValue={editing?.lat ?? ""} placeholder="26.1445" />
            <NumberField label="Longitude" name="lng" step="any" defaultValue={editing?.lng ?? ""} placeholder="91.7362" />
            <NumberField label="Opening balance ₹" name="opening_balance" step="any" defaultValue={editing?.opening_balance ?? 0} />
          </div>
        </EntityDialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={rows.length === 0 ? "No customers yet" : "No matches"}
          description={
            rows.length === 0
              ? "Add your first customer to start creating invoices."
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
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="text-right">Tonnage</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium text-white">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.state ?? "—"}</span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.phone ?? r.contact ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {r.lat != null && r.lng != null ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{tonnes(r.total_qty)}</TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(r.total_sales)}</TableCell>
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
                        title="Delete customer?"
                        description={
                          r.total_sales > 0
                            ? `${r.name} has invoices — they will be archived (deactivated) instead of deleted.`
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
                          await deleteCustomerAction(fd);
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
