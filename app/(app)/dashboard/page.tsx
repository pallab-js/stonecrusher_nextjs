import {
  getExpenseBreakdown,
  getKpis,
  getProductionTrend,
  getSalesPurchaseTrend,
  getStockBreakdown,
  getTopCustomers,
  hasAnyData,
} from "@/lib/repo/analytics";
import { getSettings } from "@/lib/repo/masters";
import { daysAgo } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Dashboard } from "@/components/modules/dashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const settings = getSettings();
  const empty = !hasAnyData();
  const kpis = getKpis();
  const productionTrend = getProductionTrend(30);
  const stock = getStockBreakdown();
  const salesPurchases = getSalesPurchaseTrend(6);
  const expenses = getExpenseBreakdown(daysAgo(90));
  const topCustomers = getTopCustomers(6, daysAgo(180));

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${settings.unit_name ?? "Stone crusher unit"} · ${today}`}
      />
      <Dashboard
        kpis={kpis}
        productionTrend={productionTrend}
        stock={stock}
        salesPurchases={salesPurchases}
        expenses={expenses}
        topCustomers={topCustomers}
        empty={empty}
      />
    </>
  );
}
