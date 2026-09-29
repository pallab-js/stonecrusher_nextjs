import { listCustomers } from "@/lib/repo/masters";
import { getCustomerStatement } from "@/lib/repo/statements";
import { PageHeader } from "@/components/shared/page-header";
import { CustomersTable } from "@/components/modules/customers-table";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  const customers = listCustomers(true);
  const statements = Object.fromEntries(
    customers.map((c) => [c.id, getCustomerStatement(c.id)]).filter(([, doc]) => doc != null)
  ) as Record<number, NonNullable<ReturnType<typeof getCustomerStatement>>>;
  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you invoice — builders, ready-mix plants, contractors and dealers."
      />
      <CustomersTable rows={customers} statements={statements} />
    </>
  );
}
