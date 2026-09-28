import { listSuppliers } from "@/lib/repo/masters";
import { PageHeader } from "@/components/shared/page-header";
import { SuppliersTable } from "@/components/modules/suppliers-table";

export const dynamic = "force-dynamic";

export default function SuppliersPage() {
  const suppliers = listSuppliers(true);
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Everyone you buy from — quarry owners, fuel dealers, spares and services."
      />
      <SuppliersTable rows={suppliers} />
    </>
  );
}
