"use client";

import { useRouter } from "next/navigation";
import type { ReportData } from "@/lib/repo/reports";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { humanize, inr, monthLabel, tonnes } from "@/lib/format";
import { ChartCard } from "@/components/charts/chart-card";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIODS: { value: string; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "all", label: "All time" },
];

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-canvas/80 px-2.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-white/10 transition hover:bg-accent hover:text-white"
    >
      <Download className="size-3" /> {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface p-5 ring-1 ring-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="display text-sm tracking-wide text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ReportsView({
  data,
  period,
}: {
  data: ReportData;
  period: string;
}) {
  const router = useRouter();
  const { summary, months, salesByCustomer, purchasesByCategory, expensesByCategory, inventory } = data;

  const cards: { label: string; value: string; tone?: string }[] = [
    { label: "Production", value: tonnes(summary.production), tone: "text-white" },
    { label: "Raw consumed", value: tonnes(summary.raw), tone: "text-magenta" },
    { label: "Revenue", value: inr(summary.sales), tone: "text-green" },
    { label: "Purchases", value: inr(summary.purchases), tone: "text-blurple" },
    { label: "Expenses", value: inr(summary.expenses), tone: "text-cyan" },
    {
      label: "Net position",
      value: inr(summary.net),
      tone: summary.net >= 0 ? "text-green" : "text-destructive",
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-surface p-1 ring-1 ring-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => router.push(`/reports?period=${p.value}`)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition",
                period === p.value ? "bg-blurple text-white" : "text-muted-foreground hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ExportBtn
          label="Export summary CSV"
          onClick={() =>
            downloadCsv("stoneops-summary.csv", ["Metric", "Value"], [
              ["Production (t)", summary.production],
              ["Raw consumed (t)", summary.raw],
              ["Revenue (₹)", summary.sales],
              ["Invoices", summary.invoices],
              ["Purchases (₹)", summary.purchases],
              ["Expenses (₹)", summary.expenses],
              ["Net (₹)", summary.net],
              ["Receivables (₹)", summary.receivables],
            ])
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface p-4 ring-1 ring-white/10">
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{c.label}</p>
            <p className={cn("stat-number mt-2 text-2xl", c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      <Section
        title="Month-wise performance"
        subtitle="Production, raw consumption and revenue"
        action={
          <ExportBtn
            label="CSV"
            onClick={() =>
              downloadCsv(
                "stoneops-monthly.csv",
                ["Month", "Output (t)", "Raw (t)", "Sales (₹)"],
                months.map((m) => [monthLabel(m.month), m.output, m.raw, m.sales])
              )
            }
          />
        }
      >
        <div className="rounded-lg bg-canvas/50 ring-1 ring-white/5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Month</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Raw in</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No production in this period
                  </TableCell>
                </TableRow>
              )}
              {months.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium text-white">{monthLabel(m.month)}</TableCell>
                  <TableCell className="text-right">{tonnes(m.output)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{tonnes(m.raw)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {m.raw > 0 ? `${Math.round((m.output / m.raw) * 100)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(m.sales)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="Customer leaderboard"
          subtitle="By invoiced value in period"
          action={
            <ExportBtn
              label="CSV"
              onClick={() =>
                downloadCsv(
                  "stoneops-customers.csv",
                  ["Customer", "Invoices", "Qty (t)", "Value (₹)"],
                  salesByCustomer.map((c) => [c.name, c.count, c.qty, c.value])
                )
              }
            />
          }
        >
          <div className="rounded-lg bg-canvas/50 ring-1 ring-white/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Customer</TableHead>
                  <TableHead className="text-right">Inv.</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByCustomer.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No sales in this period
                    </TableCell>
                  </TableRow>
                )}
                {salesByCustomer.slice(0, 12).map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="text-white">{c.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{tonnes(c.qty)}</TableCell>
                    <TableCell className="text-right font-semibold text-white">{inr(c.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <div className="grid gap-5">
          <Section
            title="Purchases by category"
            action={
              <ExportBtn
                label="CSV"
                onClick={() =>
                  downloadCsv(
                    "stoneops-purchases.csv",
                    ["Category", "Bills", "Amount (₹)"],
                    purchasesByCategory.map((c) => [humanize(c.name), c.count, c.value])
                  )
                }
              />
            }
          >
            <ul className="grid gap-2">
              {purchasesByCategory.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">No purchases in period</li>
              )}
              {purchasesByCategory.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-md bg-canvas/50 px-3.5 py-2.5 text-sm ring-1 ring-white/5"
                >
                  <span className="text-white">{humanize(c.name)}</span>
                  <span className="font-semibold text-white">{inr(c.value)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Expenses by category"
            action={
              <ExportBtn
                label="CSV"
                onClick={() =>
                  downloadCsv(
                    "stoneops-expenses.csv",
                    ["Category", "Entries", "Amount (₹)"],
                    expensesByCategory.map((c) => [humanize(c.name), c.count, c.value])
                  )
                }
              />
            }
          >
            <ul className="grid gap-2">
              {expensesByCategory.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">No expenses in period</li>
              )}
              {expensesByCategory.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-md bg-canvas/50 px-3.5 py-2.5 text-sm ring-1 ring-white/5"
                >
                  <span className="text-white">{humanize(c.name)}</span>
                  <span className="font-semibold text-white">{inr(c.value)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Section
        title="Inventory position"
        subtitle="Current stock × rate"
        action={
          <ExportBtn
            label="CSV"
            onClick={() =>
              downloadCsv(
                "stoneops-inventory.csv",
                ["Code", "Product", "Stock (t)", "Rate (₹)", "Value (₹)"],
                inventory.map((i) => [i.code, i.name, i.stock, i.rate, i.value])
              )
            }
          />
        }
      >
        <div className="rounded-lg bg-canvas/50 ring-1 ring-white/5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-widest text-muted-foreground uppercase">Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((i) => (
                <TableRow key={i.code}>
                  <TableCell className="font-bold text-blurple">{i.code}</TableCell>
                  <TableCell className="text-white">{i.name}</TableCell>
                  <TableCell className={cn("text-right", i.stock < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {tonnes(i.stock)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{inr(i.rate)}/t</TableCell>
                  <TableCell className="text-right font-semibold text-white">{inr(i.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <ChartCard title="Receivables" subtitle="Outstanding customer dues (all time)">
        <p className="stat-number text-4xl text-magenta">{inr(summary.receivables)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.invoices} invoice{summary.invoices === 1 ? "" : "s"} in the selected period
        </p>
      </ChartCard>
    </div>
  );
}
