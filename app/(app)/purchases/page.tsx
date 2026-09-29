import { listPurchases } from "@/lib/repo/operations";
import { listGrns } from "@/lib/repo/grns";
import { listProducts, listSuppliers } from "@/lib/repo/masters";
import { PageHeader } from "@/components/shared/page-header";
import { PurchasesTable } from "@/components/modules/purchases-table";

export const dynamic = "force-dynamic";

export default function PurchasesPage() {
  const purchases = listPurchases();
  const suppliers = listSuppliers();
  const products = listProducts();
  const grns = listGrns();
  return (
    <>
      <PageHeader
        title="Purchases"
        description="Quarry, fuel, power and spares bills — raw stone drops straight into stock."
      />
      <PurchasesTable rows={purchases} suppliers={suppliers} products={products} grns={grns} />
    </>
  );
}
