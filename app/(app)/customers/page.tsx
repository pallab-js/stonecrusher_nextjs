import { listCustomers } from "@/lib/repo/masters";
import { PageHeader } from "@/components/shared/page-header";
import { CustomersTable } from "@/components/modules/customers-table";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  const customers = listCustomers(true);
  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you invoice — builders, ready-mix plants, contractors and dealers."
      />
      <CustomersTable rows={customers} />
    </>
  );
}
