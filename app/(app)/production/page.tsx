import { listProduction } from "@/lib/repo/operations";
import { listProducts } from "@/lib/repo/masters";
import { PageHeader } from "@/components/shared/page-header";
import { ProductionTable } from "@/components/modules/production-table";

export const dynamic = "force-dynamic";

export default function ProductionPage() {
  const rows = listProduction();
  const products = listProducts();
  return (
    <>
      <PageHeader
        title="Production"
        description="Shift-wise crushing log — raw stone in, graded aggregates out. Output writes into stock automatically."
      />
      <ProductionTable rows={rows} products={products} />
    </>
  );
}
