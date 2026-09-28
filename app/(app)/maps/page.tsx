import { getDb } from "@/lib/db";
import { getTodaySummary } from "@/lib/repo/analytics";
import { listCustomers, listProducts } from "@/lib/repo/masters";
import { indiaOutline, projectPoints } from "@/lib/geo";
import { daysAgo } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlantMap, type Stockpile } from "@/components/maps/plant-map";
import { LocationMap, type LocationPoint } from "@/components/maps/location-map";

export const dynamic = "force-dynamic";

export default function MapsPage() {
  const summary = getTodaySummary();
  const products = listProducts();
  const today = daysAgo(0);

  const todayQtyRows = getDb()
    .prepare(
      `SELECT product_id, SUM(qty) AS q FROM inventory_tx
       WHERE date = ? AND ref_type = 'production' GROUP BY product_id`
    )
    .all(today) as { product_id: number; q: number }[];
  const todayQtyByProduct = new Map(todayQtyRows.map((r) => [r.product_id, r.q]));

  const stockpiles: Stockpile[] = products
    .filter((p) => p.kind !== "raw")
    .map((p) => ({
      code: p.code,
      name: p.name.replace(/^Agg /, ""),
      stock: p.stock,
      rate: p.rate,
      todayQty: todayQtyByProduct.get(p.id) ?? 0,
    }));

  const { path } = indiaOutline();
  const located = listCustomers().filter((c) => c.lat != null && c.lng != null);
  const projected = projectPoints(
    located.map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.lat!,
      lng: c.lng!,
      value: c.total_sales,
      qty: c.total_qty,
      detail: [c.address, c.phone].filter(Boolean).join(" · "),
    }))
  );

  return (
    <>
      <PageHeader
        title="Maps"
        description="Two offline views: the plant process flow and where your dispatches land."
      />
      <Tabs defaultValue="plant">
        <TabsList>
          <TabsTrigger value="plant">Plant process</TabsTrigger>
          <TabsTrigger value="locations">Customer locations</TabsTrigger>
        </TabsList>
        <TabsContent value="plant" className="pt-4">
          <PlantMap summary={summary} stockpiles={stockpiles} />
        </TabsContent>
        <TabsContent value="locations" className="pt-4">
          <LocationMap outline={path} points={projected as LocationPoint[]} />
        </TabsContent>
      </Tabs>
    </>
  );
}
