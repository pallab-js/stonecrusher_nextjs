"use client";

import { useState } from "react";
import type { TodaySummary } from "@/lib/repo/analytics";
import { CHART_COLORS } from "@/components/charts/chart-card";
import { qty, tonnes } from "@/lib/format";
import {
  Boxes,
  Gauge,
  Layers,
  MoveRight,
  Package,
  Settings2,
} from "lucide-react";

export interface Stockpile {
  code: string;
  name: string;
  stock: number;
  rate: number;
  todayQty: number;
}

interface StageDef {
  id: string;
  label: string;
  sub: string;
  icon: typeof Gauge;
  detailTitle: string;
  detail: string;
  stat: string;
}

const STAGES: StageDef[] = [
  {
    id: "hopper",
    label: "Boulder Hopper",
    sub: "ROM feed",
    icon: Package,
    detailTitle: "Boulder Hopper",
    detail:
      "Dumped ROM boulders from quarry trucks are metered into the hopper and regulated onto the apron feeder at a steady rate to avoid choking the jaw.",
    stat: "",
  },
  {
    id: "jaw",
    label: "Jaw Crusher",
    sub: "Primary crush",
    icon: Settings2,
    detailTitle: "Jaw Crusher (Primary)",
    detail:
      "The single-toggle jaw reduces boulders to 100–150 mm. Jaw plates are flipped every ~40k tonnes; watch motor load and toggle seat condition.",
    stat: "",
  },
  {
    id: "conveyor",
    label: "Conveyor",
    sub: "Transfer belt",
    icon: MoveRight,
    detailTitle: "Belt Conveyor",
    detail:
      "Transfers primary output to the secondary circuit. Belt tracking, idler seizures and near-belt housekeeping are the usual downtime causes.",
    stat: "",
  },
  {
    id: "cone",
    label: "Cone / VSI",
    sub: "Secondary crush",
    icon: Layers,
    detailTitle: "Cone Crusher / VSI",
    detail:
      "Secondary & tertiary crushing shapes the aggregate and produces manufactured sand. CSS setting decides the 10/20 mm split.",
    stat: "",
  },
  {
    id: "screen",
    label: "Vibrating Screen",
    sub: "Grading",
    icon: Gauge,
    detailTitle: "Vibrating Screen",
    detail:
      "Multi-deck screening grades material into 5, 10, 20, 40 mm and dust. Blinding of screens during wet months is the top cause of off-spec product.",
    stat: "",
  },
];

export function PlantMap({
  summary,
  stockpiles,
}: {
  summary: TodaySummary;
  stockpiles: Stockpile[];
}) {
  const [selected, setSelected] = useState<string>("jaw");
  const running = summary.shifts > 0;
  const overall = summary.shifts === 0 ? "Idle" : summary.down_hours > 1 ? "Attention" : "Running";
  const overallTone =
    summary.shifts === 0
      ? "text-muted-foreground bg-white/5 ring-white/10"
      : summary.down_hours > 1
        ? "text-magenta bg-magenta/10 ring-magenta/30"
        : "text-green bg-green/10 ring-green/30";

  const stageStat: Record<string, string> = {
    hopper: `${tonnes(summary.raw)} fed`,
    jaw: `${summary.run_hours.toFixed(1)} h run`,
    conveyor: `${tonnes(summary.raw)} moved`,
    cone: `${tonnes(summary.output)} crushed`,
    screen: `${tonnes(summary.output)} graded`,
  };

  const maxStock = Math.max(...stockpiles.map((s) => Math.max(0, s.stock)), 1);
  const active = STAGES.find((s) => s.id === selected) ?? STAGES[1];
  const activeStat = stageStat[active.id] ?? "";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="rounded-xl bg-surface p-5 ring-1 ring-white/10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="display text-sm tracking-wide text-white">Plant process flow</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap a stage to inspect — live from today&apos;s shift log
            </p>
          </div>
          <span className={`rounded-pill px-3 py-1 text-[11px] font-bold tracking-wide uppercase ring-1 ${overallTone}`}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />
            {overall} · {summary.shifts} shift{summary.shifts === 1 ? "" : "s"} today
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[46rem] items-stretch gap-1">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = stage.id === selected;
              return (
                <div key={stage.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setSelected(stage.id)}
                    className={
                      "group flex w-36 flex-col items-start gap-2 rounded-lg border p-3 text-left transition " +
                      (isActive
                        ? "border-blurple bg-blurple/10 shadow-[0_0_24px_rgba(88,101,242,0.25)]"
                        : "border-white/8 bg-canvas/70 hover:border-blurple/50 hover:bg-accent/50")
                    }
                  >
                    <span
                      className={
                        "flex size-9 items-center justify-center rounded-md " +
                        (isActive ? "bg-blurple text-white" : "bg-surface text-blurple group-hover:text-white")
                      }
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <span className="text-[13px] leading-tight font-semibold text-white">{stage.label}</span>
                    <span className="text-[11px] text-muted-foreground">{stage.sub}</span>
                    <span className={"text-[11px] font-bold " + (running ? "text-green" : "text-muted-foreground")}>
                      {stageStat[stage.id]}
                    </span>
                  </button>
                  {i < STAGES.length - 1 && (
                    <div className="relative mx-1 h-0.5 w-7 shrink-0 overflow-visible rounded-full bg-hairline">
                      <span
                        className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-green shadow-[0_0_8px_rgba(53,237,126,0.8)]"
                        style={{ animation: "flowx 2s linear infinite", animationDelay: `${i * 0.35}s` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 border-t border-hairline pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="display text-xs tracking-widest text-muted-foreground">Stockpile yard</h4>
            <span className="text-[11px] text-muted-foreground">
              total {tonnes(stockpiles.reduce((s, p) => s + Math.max(0, p.stock), 0))} on ground
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stockpiles.map((p, i) => {
              const pct = Math.max(3, Math.round((Math.max(0, p.stock) / maxStock) * 100));
              return (
                <div key={p.code} className="rounded-lg bg-canvas/70 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-white">{p.name}</span>
                    <span
                      className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {p.code}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="stat-number text-xl text-white">{qty(Math.max(0, p.stock))}</span>
                    <span className="text-[11px] text-muted-foreground">
                      t · {tonnes(p.todayQty)} today
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-md bg-blurple text-white">
            {(() => {
              const Icon = active.icon;
              return <Icon className="size-5" />;
            })()}
          </span>
          <div>
            <h3 className="display text-sm text-white">{active.detailTitle}</h3>
            <p className="text-[11px] text-muted-foreground">Stage {STAGES.indexOf(active) + 1} of {STAGES.length}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{active.detail}</p>
        <div className="mt-auto rounded-lg bg-canvas/70 p-3 ring-1 ring-white/5">
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Today</p>
          <p className="stat-number mt-1 text-2xl text-white">{activeStat}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            downtime {summary.down_hours.toFixed(1)} h · raw consumed {tonnes(summary.raw)}
          </p>
        </div>
        <div className="rounded-lg bg-canvas/70 p-3 ring-1 ring-white/5">
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Output today</p>
          <p className="stat-number mt-1 text-2xl text-green">{tonnes(summary.output)}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Boxes className="size-3" /> across {stockpiles.length} graded products
          </p>
        </div>
      </aside>
    </div>
  );
}
