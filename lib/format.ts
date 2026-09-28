const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFmtPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function inr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₹0";
  return Number.isInteger(n) ? inrFmt.format(n) : inrFmtPaise.format(n);
}

export function tonnes(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0 t";
  return `${numFmt.format(n)} t`;
}

export function qty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return numFmt.format(n);
}

export function int(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return intFmt.format(n);
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m || 1) - 1]} ${y}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function shiftLabel(shift: string): string {
  return shift === "morning" ? "Morning" : shift === "evening" ? "Evening" : "Night";
}

export function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
