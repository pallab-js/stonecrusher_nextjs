import type { StatementDoc } from "@/lib/repo/statements";
import type { UnitProfile } from "@/lib/repo/masters";
import { fmtDate, inr, withRunningBalance } from "@/lib/format";

export function StatementSheet({ doc, unit }: { doc: StatementDoc; unit: UnitProfile }) {
  const billed = doc.rows.reduce((s, r) => s + r.debit, 0);
  const paid = doc.rows.reduce((s, r) => s + r.credit, 0);
  const rows = withRunningBalance(doc.opening, doc.rows);
  const isCustomer = doc.kind === "customer";

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
          <p className="display text-lg tracking-wide">
            {isCustomer ? "ACCOUNT STATEMENT" : "SUPPLIER STATEMENT"}
          </p>
          <p className="mt-1 text-[11px] text-neutral-600">As on {fmtDate(new Date().toISOString().slice(0, 10))}</p>
          <p className="mt-1 text-[11px] text-neutral-600">
            {doc.entry_count} {isCustomer ? "invoices" : "bills"} on record
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-4 text-[11px]">
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
            {isCustomer ? "Statement of account" : "Account of supplier"}
          </p>
          <p className="text-sm font-bold">{doc.party}</p>
          {doc.address && <p className="text-neutral-600">{doc.address}</p>}
          {doc.phone && <p className="text-neutral-600">{doc.phone}</p>}
          {doc.gstin && (
            <p className="mt-0.5 text-neutral-600">
              GSTIN <span className="font-semibold text-black">{doc.gstin}</span>
            </p>
          )}
        </div>
        <dl className="space-y-1 text-[11px]">
          <Line label="Opening balance" value={inr(doc.opening)} />
          <Line label={isCustomer ? "Total invoiced" : "Total billed"} value={inr(billed)} />
          <Line label={isCustomer ? "Payments received" : "Amount paid"} value={inr(paid)} />
          <Line label="Closing balance" value={inr(doc.closing)} bold />
        </dl>
      </section>

      <section className="py-4">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black text-left text-[10px] tracking-widest uppercase">
              <th className="py-1.5 pr-2">Date</th>
              <th className="py-1.5 pr-2">Reference</th>
              <th className="py-1.5 pr-2 text-right">Debit</th>
              <th className="py-1.5 pr-2 text-right">Credit</th>
              <th className="py-1.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-300">
              <td className="py-1.5 pr-2" colSpan={4}>
                Opening balance brought forward
              </td>
              <td className="py-1.5 text-right font-semibold">{inr(doc.opening)}</td>
            </tr>
            {rows.map((r, i) => (
              <tr key={`${r.ref}-${i}`} className="border-b border-neutral-200">
                <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="py-1.5 pr-2">
                  <span className="font-semibold">{r.ref}</span>
                  <span className="ml-1 text-neutral-500">{r.label}</span>
                </td>
                <td className="py-1.5 pr-2 text-right">{r.debit > 0 ? inr(r.debit) : "—"}</td>
                <td className="py-1.5 pr-2 text-right">{r.credit > 0 ? inr(r.credit) : "—"}</td>
                <td className="py-1.5 text-right font-semibold">{inr(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td className="py-2 pr-2 font-bold" colSpan={2}>
                Closing balance
              </td>
              <td className="py-2 pr-2 text-right font-bold">{inr(billed)}</td>
              <td className="py-2 pr-2 text-right font-bold">{inr(paid)}</td>
              <td className="py-2 text-right font-bold">{inr(doc.closing)}</td>
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && (
          <p className="py-6 text-center text-[11px] text-neutral-500">No transactions on this account yet.</p>
        )}
      </section>

      <footer className="flex items-end justify-between border-t border-neutral-300 pt-4 text-[10px] text-neutral-500">
        <p>
          Generated by StoneOps · {unit.name} · {fmtDate(new Date().toISOString().slice(0, 10))}
        </p>
        <p className="text-center">
          Authorised signatory
          <span className="mt-6 block border-t border-black pt-1">For {unit.name}</span>
        </p>
      </footer>
    </article>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={bold ? "font-bold" : "font-semibold"}>{value}</dd>
    </div>
  );
}
