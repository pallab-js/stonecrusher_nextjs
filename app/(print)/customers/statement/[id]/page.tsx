import { notFound } from "next/navigation";
import { getCustomerStatement } from "@/lib/repo/statements";
import { getUnitProfile } from "@/lib/repo/masters";
import { StatementSheet } from "@/components/print/statement-sheet";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  const doc = Number.isFinite(customerId) ? getCustomerStatement(customerId) : null;
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <PrintToolbar backHref="/customers" backLabel="Back to customers" />
      <StatementSheet doc={doc} unit={getUnitProfile()} />
    </div>
  );
}
