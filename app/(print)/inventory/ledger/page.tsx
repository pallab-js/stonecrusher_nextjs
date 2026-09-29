import { notFound } from "next/navigation";
import { getStockLedger, getStockSummary } from "@/lib/repo/operations";
import { getUnitProfile } from "@/lib/repo/masters";
import { fmtDate, humanize, inr, tonnes } from "@/lib/format";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

export default async function StockLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const productId = product ? Number(product) : null;
  const ledger = productId != null && Number.isFinite(productId) ? getStockLedger(productId) : null;
  if (productId != null && !ledger) notFound();
  const summary = ledger ? null : getStockSummary();
  const unit = getUnitProfile();
  const printed = fmtDate(new Date().toISOString().slice(0, 10));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
      <PrintToolbar backHref="/inventory" backLabel="Back to inventory" />
      <article className="mx-auto max-w-4xl rounded-sm bg-white p-8 text-black shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <h1 className="display text-2xl leading-none">{unit.name}</h1>
            <p className="mt-1.5 text-[11px] text-neutral-600">{unit.address}</p>
          </div>
          <div className="text-right">
            <p className="display text-lg tracking-wide">{ledger ? "STOCK LEDGER" : "STOCK SUMMARY"}</p>
            <p className="mt-1 text-[11px] text-neutral-600">Printed {printed}</p>
          </div>
        </header>

        {ledger ? (
          <>
            <section className="flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-300 py-4 text-[12px]">
              <div>
                <span className="mr-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                  {ledger.code}
                </span>
                <span className="text-sm font-bold">{ledger.name}</span>
              </div>
              <div className="text-neutral-600">
                Closing balance{" "}
                <span className="text-sm font-bold text-black">{tonnes(ledger.closing)}</span> · value{" "}
                <span className="font-bold text-black">{inr(Math.max(0, ledger.closing) * ledger.rate)}</span>
              </div>
            </section>

            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-neutral-100 text-left text-[10px] tracking-widest uppercase">
                  <th className="border border-neutral-300 px-2 py-1.5">Date</th>
                  <th className="border border-neutral-300 px-2 py-1.5">Particulars</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right">In (t)</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right">Out (t)</th>
                  <th className="border border-neutral-300 px-2 py-1.5 text-right">Balance (t)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-neutral-50">
                  <td className="border border-neutral-300 px-2 py-1.5 text-neutral-500">—</td>
                  <td className="border border-neutral-300 px-2 py-1.5 font-semibold">Opening balance</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right" />
                  <td className="border border-neutral-300 px-2 py-1.5 text-right" />
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                    {ledger.opening.toFixed(2)}
                  </td>
                </tr>
                {ledger.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-neutral-300 px-2 py-1.5 whitespace-nowrap text-neutral-600">
                      {fmtDate(row.date)}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5">
                      {humanize(row.ref_type)}
                      {row.notes ? <span className="block text-[10px] text-neutral-500">{row.notes}</span> : null}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right">
                      {row.dir === "in" ? row.qty.toFixed(2) : ""}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right">
                      {row.dir === "out" ? row.qty.toFixed(2) : ""}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                      {row.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {ledger.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-neutral-300 px-2 py-6 text-center text-neutral-500">
                      No movements recorded for this product yet.
                    </td>
                  </tr>
                )}
                <tr className="bg-neutral-100">
                  <td className="border border-neutral-300 px-2 py-1.5" colSpan={2}>
                    <span className="font-bold uppercase">Closing balance</span>
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                    {ledger.rows
                      .filter((r) => r.dir === "in")
                      .reduce((s, r) => s + r.qty, 0)
                      .toFixed(2)}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                    {ledger.rows
                      .filter((r) => r.dir === "out")
                      .reduce((s, r) => s + r.qty, 0)
                      .toFixed(2)}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-bold">
                    {ledger.closing.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <table className="mt-4 w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-neutral-100 text-left text-[10px] tracking-widest uppercase">
                <th className="border border-neutral-300 px-2 py-1.5">Code</th>
                <th className="border border-neutral-300 px-2 py-1.5">Product</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right">Opening</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right">In</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right">Out</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right">Closing</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right">Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(summary ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="border border-neutral-300 px-2 py-1.5 font-bold">{p.code}</td>
                  <td className="border border-neutral-300 px-2 py-1.5">{p.name}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{p.opening.toFixed(2)}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{p.inflow.toFixed(2)}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{p.outflow.toFixed(2)}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                    {p.closing.toFixed(2)}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">
                    {Math.max(0, p.closing) * p.rate > 0 ? inr(Math.max(0, p.closing) * p.rate) : "—"}
                  </td>
                </tr>
              ))}
              {(summary ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-neutral-300 px-2 py-6 text-center text-neutral-500">
                    No products yet — add them in Inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <footer className="mt-6 text-[10px] text-neutral-500">
          Generated by StoneOps · {unit.name} · {printed}
        </footer>
      </article>
    </div>
  );
}
