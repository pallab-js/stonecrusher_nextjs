"use client";

import { useMemo, useState } from "react";
import { inr, tonnes } from "@/lib/format";
import { MapPin } from "lucide-react";

export interface LocationPoint {
  id: number;
  name: string;
  detail: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  value: number;
  qty: number;
}

const W = 560;
const H = 620;

export function LocationMap({
  outline,
  points,
}: {
  outline: string;
  points: LocationPoint[];
}) {
  const [hover, setHover] = useState<LocationPoint | null>(null);
  const [selected, setSelected] = useState<LocationPoint | null>(null);

  const maxValue = useMemo(() => Math.max(...points.map((p) => p.value), 1), [points]);
  const r = (v: number) => 5 + Math.sqrt(Math.max(0, v) / maxValue) * 13;

  const active = selected ?? hover;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="relative overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_30rem_at_30%_20%,rgba(88,101,242,0.12),transparent_60%)]" />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="relative mx-auto h-[540px] w-auto max-w-full"
          role="img"
          aria-label="Customer locations across India"
        >
          <defs>
            <linearGradient id="indiaFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e2353" />
              <stop offset="100%" stopColor="#141843" />
            </linearGradient>
          </defs>

          <path
            d={outline}
            fill="url(#indiaFill)"
            stroke="#5865f2"
            strokeWidth={1.2}
            strokeLinejoin="round"
            opacity={0.95}
          />

          {points.map((p) => {
            const isActive = active?.id === p.id;
            return (
              <g
                key={p.id}
                className="cursor-pointer"
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSelected((s) => (s?.id === p.id ? null : p))}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r(p.value) + (isActive ? 5 : 0)}
                  fill="#ec48bd"
                  opacity={isActive ? 0.3 : 0.15}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r(p.value)}
                  fill="#ec48bd"
                  stroke={isActive ? "#ffffff" : "#0a0d3a"}
                  strokeWidth={isActive ? 2 : 1.2}
                />
                <text
                  x={p.x + r(p.value) + 5}
                  y={p.y + 3.5}
                  fontSize={isActive ? 12 : 11}
                  fontWeight={isActive ? 700 : 500}
                  fill={isActive ? "#ffffff" : "#9aa0c7"}
                >
                  {p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-magenta" />
            Bubble size = total invoiced value
          </span>
          <span>{points.length} active customer locations · fully offline SVG map</span>
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-xl bg-surface p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-md bg-magenta text-white">
            <MapPin className="size-5" />
          </span>
          <div>
            <h3 className="display text-sm text-white">Dispatch map</h3>
            <p className="text-[11px] text-muted-foreground">Customer delivery footprint</p>
          </div>
        </div>

        {active ? (
          <div className="rounded-lg bg-canvas/70 p-4 ring-1 ring-white/5">
            <h4 className="text-sm font-bold text-white">{active.name}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{active.detail}</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billed value</dt>
                <dd className="font-bold text-white">{inr(active.value)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tonnage</dt>
                <dd className="font-bold text-white">{tonnes(active.qty)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coordinates</dt>
                <dd className="font-mono text-[11px] text-cyan">
                  {active.lat.toFixed(3)}, {active.lng.toFixed(3)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-lg bg-canvas/70 p-4 ring-1 ring-white/5">
            <p className="text-sm text-muted-foreground">
              Hover a bubble to preview a customer, or click to pin it here. Bubbles scale with
              total invoiced value so your biggest accounts light up the map.
            </p>
          </div>
        )}

        <div className="mt-auto space-y-1.5">
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Longest routes</p>
          {points
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md bg-canvas/70 px-3 py-1.5 text-xs ring-1 ring-white/5"
              >
                <span className="flex items-center gap-2 text-white">
                  <span className="font-bold text-muted-foreground">{i + 1}</span>
                  {p.name}
                </span>
                <span className="font-semibold text-magenta">{inr(p.value)}</span>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
