import { notFound } from "next/navigation";
import { getInvoiceDoc } from "@/lib/repo/operations";
import { getUnitProfile } from "@/lib/repo/masters";
import { InvoiceSheet } from "@/components/print/invoice-sheet";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const saleId = Number(id);
  const sale = Number.isFinite(saleId) ? getInvoiceDoc(saleId) : null;
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <PrintToolbar backHref="/sales" backLabel="Back to invoices" />
      <InvoiceSheet sale={sale} unit={getUnitProfile()} />
    </div>
  );
}
