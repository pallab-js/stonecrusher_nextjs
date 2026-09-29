import { notFound } from "next/navigation";
import { getOrder } from "@/lib/repo/orders";
import { getUnitProfile } from "@/lib/repo/masters";
import { OrderSheet } from "@/components/print/order-sheet";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  const order = Number.isFinite(orderId) ? getOrder(orderId) : null;
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <PrintToolbar backHref="/sales" backLabel="Back to orders" />
      <OrderSheet order={order} unit={getUnitProfile()} />
    </div>
  );
}
