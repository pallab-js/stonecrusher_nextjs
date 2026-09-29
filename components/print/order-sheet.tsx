import type { OrderRow } from "@/lib/repo/orders";
import type { UnitProfile } from "@/lib/repo/masters";
import { amountInWords, fmtDate, inr, qty, tonnes } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  open: "OPEN",
  partial: "PARTLY BILLED",
  closed: "CLOSED",
  cancelled: "CANCELLED",
};

export function OrderSheet({ order, unit }: { order: OrderRow; unit: UnitProfile }) {
  const orderDate = fmtDate(order.date);
  const remaining = Math.max(0, order.total_qty - order.invoiced_qty);

  return (
    <article className="mx-auto max-w-3xl rounded-sm bg-white p-8 text-black shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <h1 className="display text-2xl leading-none">{unit.name}</h1>
          <p className="mt-1.5 max-w-xs text-[11px] leading-snug text-neutral-600">{unit.address}</p>
          <p className="mt-1 text-[11px] text-neutral-600">
            GSTIN <span className="font-semibold text-black">{unit.gstin}</span>
            {unit.phone ? ` · ${unit.phone}` : null}
          </p>
        </div>
        <div className="text-right">
          <p className="display text-lg tracking-wide">PURCHASE ORDER</p>
          <p className="mt-1 text-[11px] text-neutral-600">Local purchase order (LPO)</p>
          <dl className="mt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">LPO no.</dt>
              <dd className="font-bold">{order.order_no}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Order date</dt>
              <dd className="font-semibold">{orderDate}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Delivery by</dt>
              <dd className="font-semibold">{order.delivery_date ? fmtDate(order.delivery_date) : "—"}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Status</dt>
              <dd className="font-bold">{STATUS_LABEL[order.status] ?? order.status.toUpperCase()}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-4 text-[11px]">
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Raised by</p>
          <p className="text-sm font-bold">{unit.name}</p>
          <p className="text-neutral-600">{unit.location}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Ordered by</p>
          <p className="text-sm font-bold">{order.customer_name ?? "—"}</p>
          <p className="text-neutral-600">Against this LPO, stock is dispatched as invoices are raised.</p>
        </div>
      </section>

      <section className="py-4">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black text-left text-[10px] tracking-widest uppercase">
              <th className="py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">Product</th>
              <th className="py-1.5 pr-2 text-right">Ordered</th>
              <th className="py-1.5 pr-2 text-right">Billed</th>
              <th className="py-1.5 pr-2 text-right">Balance</th>
              <th className="py-1.5 pr-2 text-right">Rate</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} className="border-b border-neutral-200">
                <td className="py-1.5 pr-2 text-neutral-500">{i + 1}</td>
                <td className="py-1.5 pr-2 font-semibold">{item.name}</td>
                <td className="py-1.5 pr-2 text-right">{qty(item.qty)} t</td>
                <td className="py-1.5 pr-2 text-right">{qty(item.invoiced)} t</td>
                <td className="py-1.5 pr-2 text-right font-semibold">{qty(item.balance)} t</td>
                <td className="py-1.5 pr-2 text-right">{inr(item.rate)}</td>
                <td className="py-1.5 text-right font-semibold">{inr(item.qty * item.rate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td className="py-2 pr-2 font-bold" colSpan={2}>
                Total
              </td>
              <td className="py-2 pr-2 text-right font-bold">{tonnes(order.total_qty)}</td>
              <td className="py-2 pr-2 text-right font-bold">{tonnes(order.invoiced_qty)}</td>
              <td className="py-2 pr-2 text-right font-bold">{tonnes(remaining)}</td>
              <td className="py-2 pr-2" />
              <td className="py-2 text-right font-bold">{inr(order.value)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 text-[11px] text-neutral-600">
          <span className="font-semibold text-black">Amount in words: </span>
          {amountInWords(order.value)}
        </p>
        {order.notes && <p className="mt-2 text-[11px] text-neutral-600">Notes: {order.notes}</p>}
      </section>

      <footer className="flex items-end justify-between border-t border-neutral-300 pt-4 text-[10px] text-neutral-500">
        <p>
          Generated by StoneOps · {unit.name} · {orderDate}
        </p>
        <p className="text-center">
          Authorised signatory
          <span className="mt-6 block border-t border-black pt-1">For {unit.name}</span>
        </p>
      </footer>
    </article>
  );
}
