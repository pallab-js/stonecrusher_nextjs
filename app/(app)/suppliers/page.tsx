import { listSuppliers } from "@/lib/repo/masters";
import { getSupplierStatement } from "@/lib/repo/statements";
import { PageHeader } from "@/components/shared/page-header";
import { SuppliersTable } from "@/components/modules/suppliers-table";

export const dynamic = "force-dynamic";

export default function SuppliersPage() {
  const suppliers = listSuppliers(true);
  const statements = Object.fromEntries(
    suppliers.map((s) => [s.id, getSupplierStatement(s.id)]).filter(([, doc]) => doc != null)
  ) as Record<number, NonNullable<ReturnType<typeof getSupplierStatement>>>;
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Everyone you buy from — quarry owners, fuel dealers, spares and services."
      />
      <SuppliersTable rows={suppliers} statements={statements} />
    </>
  );
}
