import { listProducts } from "@/lib/repo/masters";
import { listTransactions } from "@/lib/repo/operations";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryView } from "@/components/modules/inventory-view";

export const dynamic = "force-dynamic";

export default function InventoryPage() {
  const products = listProducts();
  const txs = listTransactions();
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Live stock of raw stone and graded aggregates — updates with every production shift, invoice and purchase."
      />
      <InventoryView rows={products} txs={txs} products={products} />
    </>
  );
}
