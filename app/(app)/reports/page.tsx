import { getReportData } from "@/lib/repo/reports";
import { daysAgo } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/components/modules/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30" } = await searchParams;
  const days = Number(period);
  const from = period === "all" || !Number.isFinite(days) ? null : daysAgo(days - 1);
  const data = getReportData(from);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Period summaries with one-click CSV export for your accountant."
      />
      <ReportsView data={data} period={period === "all" || !Number.isFinite(days) ? "all" : period} />
    </>
  );
}
