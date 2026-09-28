import { listSales } from "@/lib/repo/operations";
import { listCustomers, listProducts } from "@/lib/repo/masters";
import { PageHeader } from "@/components/shared/page-header";
import { SalesTable } from "@/components/modules/sales-table";

export const dynamic = "force-dynamic";

export default function SalesPage() {
  const sales = listSales();
  const customers = listCustomers();
  const products = listProducts();
  return (
    <>
      <PageHeader
        title="Sales & Dispatch"
        description="Invoices with vehicle details — stock is deducted from inventory automatically."
      />
      <SalesTable rows={sales} products={products} customers={customers} />
    </>
  );
}
