import type { InvoiceDoc } from "@/lib/repo/operations";
import { amountInWords, fmtDate, inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InvoiceSheet({
  sale,
  unit,
}: {
  sale: InvoiceDoc;
  unit: { name: string; address: string; gstin: string; phone: string; location: string; gstRate: string };
}) {
  const balance = Math.max(0, sale.total - sale.paid_amount);
  const statusLabel = sale.status === "paid" ? "PAID IN FULL" : sale.status === "partial" ? "PART PAYMENT" : "PAYMENT DUE";

  return (
    <article className="mx-auto max-w-3xl rounded-sm bg-white p-8 text-black shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <h1 className="display text-2xl leading-none">{unit.name}</h1>
          <p className="mt-1.5 max-w-xs text-[11px] leading-snug text-neutral-600">
            {unit.address}
            <br />
            {unit.location !== unit.address ? unit.location : null}
          </p>
          <p className="mt-1 text-[11px] text-neutral-600">
            GSTIN <span className="font-semibold text-black">{unit.gstin}</span>
            {unit.phone ? ` · ${unit.phone}` : null}
          </p>
        </div>
        <div className="text-right">
          <p className="display text-lg tracking-wide">TAX INVOICE</p>
          <p className="mt-1 text-[11px] text-neutral-600">Original for recipient</p>
          <dl className="mt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Invoice no.</dt>
              <dd className="font-bold">{sale.invoice_no}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Date</dt>
              <dd className="font-semibold">{fmtDate(sale.date)}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-neutral-500">Status</dt>
              <dd className="font-bold">{statusLabel}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-4 text-[11px]">
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Billed to</p>
          <p className="text-sm font-bold">{sale.customer_name ?? "Cash customer"}</p>
          {sale.customer_address && <p className="text-neutral-600">{sale.customer_address}</p>}
          {sale.customer_contact && <p className="text-neutral-600">Contact: {sale.customer_contact}</p>}
          <p className="mt-0.5 text-neutral-600">
            {sale.customer_gstin ? (
              <>
                GSTIN <span className="font-semibold text-black">{sale.customer_gstin}</span>
                {sale.customer_state ? ` · ${sale.customer_state}` : ""}
              </>
            ) : (
              sale.customer_state ?? ""
            )}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Dispatch details</p>
          <p className="text-neutral-600">
            Vehicle <span className="font-semibold text-black">{sale.vehicle_no ?? "—"}</span>
          </p>
          <p className="text-neutral-600">
            Transporter <span className="font-semibold text-black">{sale.transporter ?? "—"}</span>
          </p>
          <p className="mt-0.5 text-neutral-600">Place of supply: {sale.customer_state ?? unit.location}</p>
        </div>
      </section>

      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-neutral-100 text-left text-[10px] tracking-widest uppercase">
            <th className="border border-neutral-300 px-2 py-1.5">#</th>
            <th className="border border-neutral-300 px-2 py-1.5">Description of goods</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">Qty (t)</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">Rate (₹/t)</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={`${item.product_id}-${i}`}>
              <td className="border border-neutral-300 px-2 py-1.5 text-neutral-500">{i + 1}</td>
              <td className="border border-neutral-300 px-2 py-1.5 font-medium">{item.name}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-right">{item.qty.toFixed(2)}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-right">{item.rate.toFixed(2)}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                {item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 grid grid-cols-2 gap-6">
        <div className="text-[11px]">
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
            Amount in words
          </p>
          <p className="font-semibold">{amountInWords(sale.total)}</p>
          {sale.notes && (
            <p className="mt-3 text-neutral-600">
              <span className="font-semibold text-black">Notes:</span> {sale.notes}
            </p>
          )}
          <p className="mt-4 text-[10px] leading-snug text-neutral-500">
            Terms: Goods once dispatched are not taken back. Payment due within 15 days of invoice date.
            Interest @18% p.a. applies on overdue balances. Subject to local jurisdiction.
          </p>
        </div>

        <div className="text-[12px]">
          <Row label="Subtotal" value={inr(sale.subtotal)} />
          {sale.discount > 0 && <Row label="Discount" value={`− ${inr(sale.discount)}`} />}
          <Row label={`GST @ ${unit.gstRate}%`} value={inr(sale.tax)} />
          <div className="my-1 border-t border-neutral-300" />
          <Row label="Total payable" value={inr(sale.total)} bold />
          <Row label="Amount received" value={inr(sale.paid_amount)} />
          <Row
            label="Balance due"
            value={inr(balance)}
            bold
            highlight={balance > 0.01}
          />
        </div>
      </section>

      <footer className="mt-8 flex items-end justify-between gap-6 text-[11px]">
        <p className="max-w-xs text-neutral-500">
          This is a computer-generated invoice from StoneOps and is valid without a physical signature
          when digitally shared.
        </p>
        <div className="text-center">
          <p className="text-neutral-600">For {unit.name}</p>
          <div className="mt-10 w-44 border-t border-black pt-1 text-[10px] tracking-widest uppercase">
            Authorised signatory
          </div>
        </div>
      </footer>
    </article>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-neutral-600">{label}</span>
      <span className={cn(bold && "font-bold", highlight ? "text-red-600" : "text-black")}>{value}</span>
    </div>
  );
}
