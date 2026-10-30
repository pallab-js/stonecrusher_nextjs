"use client";

import { useMemo, useRef, useState } from "react";
import { inr, tonnes } from "@/lib/format";
import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";

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
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const maxValue = useMemo(() => Math.max(...points.map((p) => p.value), 1), [points]);
  const r = (v: number) => 5 + Math.sqrt(Math.max(0, v) / maxValue) * 13;

  const active = selected ?? hover;

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.5), 4));
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale((s) => Math.min(s * 1.2, 4));
  const zoomOut = () => setScale((s) => Math.max(s * 0.8, 0.5));
  const resetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="relative overflow-hidden rounded-xl bg-surface p-4 ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_30rem_at_30%_20%,rgba(88,101,242,0.12),transparent_60%)]" />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="relative mx-auto h-[540px] w-auto max-w-full touch-none"
          role="img"
          aria-label="Customer locations across India"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <defs>
            <linearGradient id="indiaFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e2353" />
              <stop offset="100%" stopColor="#141843" />
            </linearGradient>
          </defs>

          <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`} style={{ transformOrigin: "center" }}>
            <path
              d={outline}
              fill="url(#indiaFill)"
              stroke="#5865f2"
              strokeWidth={1.2 / scale}
              strokeLinejoin="round"
              opacity={0.95}
              pointerEvents="none"
            />

            {points.map((p) => {
              const isActive = active?.id === p.id;
              return (
                <g
                  key={p.id}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={p.name}
                  onMouseEnter={() => !isDragging && setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected((s) => (s?.id === p.id ? null : p));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected((s) => (s?.id === p.id ? null : p));
                    }
                  }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={(r(p.value) + (isActive ? 5 : 0)) / scale}
                    fill="#ec48bd"
                    opacity={isActive ? 0.3 : 0.15}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r(p.value) / scale}
                    fill="#ec48bd"
                    stroke={isActive ? "#ffffff" : "#0a0d3a"}
                    strokeWidth={(isActive ? 2 : 1.2) / scale}
                  />
                  <text
                    x={p.x + r(p.value) / scale + 5 / scale}
                    y={p.y + 3.5 / scale}
                    fontSize={(isActive ? 12 : 11) / scale}
                    fontWeight={isActive ? 700 : 500}
                    fill={isActive ? "#ffffff" : "#9aa0c7"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-4 top-4 flex flex-col gap-1 rounded-md bg-canvas/80 p-1 ring-1 ring-white/10 backdrop-blur">
          <button
            type="button"
            onClick={zoomIn}
            className="flex size-7 items-center justify-center rounded text-white transition hover:bg-accent"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="flex size-7 items-center justify-center rounded text-white transition hover:bg-accent"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="flex size-7 items-center justify-center rounded text-white transition hover:bg-accent"
            aria-label="Reset view"
            title="Reset view"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-magenta" />
            Bubble size = total invoiced value
          </span>
          <span>{points.length} active customer locations · scroll to zoom · drag to pan · fully offline SVG map</span>
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
