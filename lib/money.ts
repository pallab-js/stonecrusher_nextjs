/**
 * Pure money/stock helpers — no I/O, no database. Kept dependency-free so they
 * can be unit-tested in isolation and reused across the repo layer.
 */

/** Round to 2 decimal places (money / tonnage). */
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ── Integer-paise money arithmetic ────────────────────── */
//
// Rupee amounts are stored as REAL but every *computation* is done in integer
// paise so repeated additions (invoice line sums, running paid_amount across
// many receipts, statement balances) can never accumulate IEEE-754 drift.
// Convert to paise, do exact integer math, convert back once.

/** Rupees → integer paise (rounded to the nearest paisa). */
export function toPaise(rupees: number): number {
  return Math.round((rupees || 0) * 100);
}

/** Integer paise → rupees with exactly 2 decimals. */
export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/** Sum a list of rupee amounts without float drift (adds in paise). */
export function sumMoney(amounts: number[]): number {
  let paise = 0;
  for (const a of amounts) paise += toPaise(a);
  return fromPaise(paise);
}

/** qty × rate as a money amount, rounded to the nearest paisa. */
export function lineAmount(qty: number, rate: number): number {
  return fromPaise(Math.round(qty * rate * 100));
}

/**
 * Invoice/bill total = subtotal − discount + tax, computed in paise so the
 * three roundings don't stack. Inputs are rupee amounts.
 */
export function invoiceTotal(subtotal: number, discount: number, tax: number): number {
  return fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax));
}

/** Add a payment to a running paid amount, exact in paise. */
export function addMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) + toPaise(b));
}

/** Subtract b from a (clamped at zero), exact in paise. */
export function subMoneyClamped(a: number, b: number): number {
  return fromPaise(Math.max(0, toPaise(a) - toPaise(b)));
}

/**
 * Payment status for an invoice/bill. Compared in integer paise so a bill is
 * marked paid exactly when paid ≥ total to the paisa — no float tolerance.
 */
export function paymentStatus(total: number, paid: number): "unpaid" | "partial" | "paid" {
  const totalP = toPaise(total);
  const paidP = toPaise(paid);
  if (paidP <= 0) return "unpaid";
  if (paidP >= totalP) return "paid";
  return "partial";
}

/** Format a sequence number as `<prefix><0000>` (zero-padded to 4). */
export function formatDocNo(prefix: string, next: number): string {
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/** Running stock balance after applying a directional movement. */
export function applyMovement(balance: number, dir: "in" | "out", qty: number): number {
  return r2(balance + (dir === "in" ? qty : -qty));
}

/** Closing stock from opening + inflow − outflow. */
export function closingStock(opening: number, inflow: number, outflow: number): number {
  return r2(opening + inflow - outflow);
}

/**
 * True when `requested` exceeds `available` beyond a 0.01 tolerance — i.e. the
 * dispatch would drive stock negative. The tolerance absorbs float noise so a
 * request that exactly matches on-ground stock is always allowed.
 */
export function isShortStock(requested: number, available: number): boolean {
  return requested > available + 0.01;
}
