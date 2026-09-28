"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type Kpis,
  type MonthPoint,
  type Slice,
  type TopCustomer,
  type TrendPoint,
} from "@/lib/repo/analytics";
import { ChartCard, CHART_COLORS, axisProps, tooltipStyle } from "@/components/charts/chart-card";
import { fmtDate, humanize, inr, monthLabel, tonnes } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, PackageOpen } from "lucide-react";

function KpiCard({
  label,
  value,
  hint,
  tone = "blurple",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "blurple" | "magenta" | "black" | "surface";
}) {
  const tones = {
    blurple: "bg-blurple text-white",
    magenta: "bg-magenta text-white",
    black: "bg-black text-white ring-1 ring-white/10",
    surface: "bg-surface text-white ring-1 ring-white/10",
  };
  return (
    <div className={"flex flex-col justify-between rounded-feature p-5 " + tones[tone]}>
      <p className="text-[11px] font-bold tracking-[0.14em] uppercase opacity-80">{label}</p>
      <p className="stat-number mt-4 text-4xl">{value}</p>
      {hint && <div className="mt-2 text-xs font-medium opacity-85">{hint}</div>}
    </div>
  );
}

function LegendList({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {data.map((d, i) => (
        <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
          />
          {humanize(d.name)}
          <span className="font-semibold text-white">
            {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Dashboard({
  kpis,
  productionTrend,
  stock,
  salesPurchases,
  expenses,
  topCustomers,
  empty,
}: {
  kpis: Kpis;
  productionTrend: TrendPoint[];
  stock: Slice[];
  salesPurchases: MonthPoint[];
  expenses: Slice[];
  topCustomers: TopCustomer[];
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="mx-auto mt-6 max-w-xl rounded-feature bg-surface p-10 text-center ring-1 ring-white/10">
        <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-feature bg-green text-black">
          <PackageOpen className="size-8" />
        </span>
        <h2 className="display display-md text-white">Welcome to StoneOps</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This unit has no data yet. Load the demo/seed dataset to explore the dashboard with
          a full year of production, sales and expense history — or start entering your own
          shifts.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/settings"
            className="inline-flex h-11 items-center rounded-md bg-green px-6 text-sm font-bold text-black transition hover:bg-green/90"
          >
            Load demo data
          </Link>
          <Link
            href="/production"
            className="inline-flex h-11 items-center rounded-md bg-surface px-6 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-accent"
          >
            Log a shift
          </Link>
        </div>
      </div>
    );
  }

  const trend = productionTrend.map((t) => ({ ...t, label: fmtDate(t.date).slice(0, 6) }));
  const months = salesPurchases.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Today's output"
          value={tonnes(kpis.todayProduction)}
          hint="graded aggregates produced"
          tone="blurple"
        />
        <KpiCard
          label="This month"
          value={tonnes(kpis.monthProduction)}
          hint={`from ${tonnes(kpis.monthRaw)} raw stone`}
          tone="magenta"
        />
        <KpiCard
          label="Stock on ground"
          value={tonnes(kpis.totalStock)}
          hint={`valued at ${inr(kpis.stockValue)}`}
          tone="black"
        />
        <KpiCard
          label="Revenue (MTD)"
          value={inr(kpis.monthRevenue)}
          hint={
            <span className="flex items-center gap-1">
              {kpis.monthProfit >= 0 ? (
                <ArrowUpRight className="size-3.5 text-green" />
              ) : (
                <ArrowDownRight className="size-3.5 text-magenta" />
              )}
              {inr(Math.abs(kpis.monthProfit))} net after purchases & expenses
            </span>
          }
          tone="surface"
        />
        <KpiCard
          label="Receivables"
          value={inr(kpis.receivables)}
          hint={`${kpis.openInvoices} open invoice${kpis.openInvoices === 1 ? "" : "s"}`}
          tone="surface"
        />
        <KpiCard
          label="Downtime (MTD)"
          value={`${kpis.monthDowntime.toFixed(1)} h`}
          hint="machine stoppage this month"
          tone="surface"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Production trend"
          subtitle="Daily output vs raw stone consumed — last 30 days"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5865f2" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#5865f2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRaw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec48bd" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ec48bd" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b3170" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} width={48} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#5865f2", strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="raw" name="Raw stone (t)" stroke="#ec48bd" strokeWidth={2} fill="url(#gradRaw)" />
              <Area type="monotone" dataKey="output" name="Output (t)" stroke="#5865f2" strokeWidth={2.5} fill="url(#gradOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock mix" subtitle="Current inventory by aggregate">
          {stock.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No stock data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stock}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={3}
                    stroke="#0a0d3a"
                    strokeWidth={2}
                  >
                    {stock.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => tonnes(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <LegendList data={stock} />
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Sales vs purchases" subtitle="Monthly rupees, last 6 months" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={months} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke="#2b3170" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={64} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(88,101,242,0.08)" }}
                formatter={(v) => inr(Number(v))}
              />
              <Bar dataKey="sales" name="Sales" fill="#35ed7e" radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="purchases" name="Purchases" fill="#5865f2" radius={[6, 6, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expense mix" subtitle="Where the money goes">
          {expenses.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No expenses yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={expenses}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="#0a0d3a"
                    strokeWidth={2}
                  >
                    {expenses.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <LegendList data={expenses} />
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Top customers" subtitle="By invoiced value">
          {topCustomers.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, topCustomers.length * 44)}>
              <BarChart
                data={topCustomers.map((c) => ({ ...c, label: c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#2b3170" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis type="category" dataKey="label" {...axisProps} width={130} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} cursor={{ fill: "rgba(88,101,242,0.08)" }} />
                <Bar dataKey="value" name="Billed" fill="#ec48bd" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Sales by month" subtitle="Invoice totals — last 6 months">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={months} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#2b3170" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={64} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(88,101,242,0.08)" }} formatter={(v) => inr(Number(v))} />
              <Bar dataKey="sales" name="Sales" fill="#00b0f4" radius={[8, 8, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
