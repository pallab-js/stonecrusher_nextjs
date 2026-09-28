import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "flex flex-col rounded-xl bg-surface p-5 ring-1 ring-white/10 " + className
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="display text-sm tracking-wide text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

export const CHART_COLORS = ["#5865f2", "#35ed7e", "#ec48bd", "#00b0f4", "#9aa0c7", "#7b84c9"];

export const tooltipStyle: React.CSSProperties = {
  background: "#0a0d3a",
  border: "1px solid #2b3170",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 3px 68px rgba(69,42,124,0.4)",
};

export const axisProps = {
  stroke: "#9aa0c7",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
