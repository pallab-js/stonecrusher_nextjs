/**
 * Pure, dependency-free format validators. Empty/whitespace values are treated
 * as "not provided" and pass — callers decide whether a field is required.
 */

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * India GSTIN: 15 chars — 2-digit state code, 10-char PAN
 * (5 letters + 4 digits + 1 letter), 1 entity code, literal 'Z', 1 checksum.
 * Case-insensitive on input; validated against the canonical upper-case form.
 */
export function isValidGstin(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "") return true; // optional
  return GSTIN_RE.test(v);
}

/**
 * Phone: permit digits plus the usual separators (+, spaces, hyphens, parens).
 * Requires 10–15 digits once separators are stripped (E.164 upper bound).
 */
export function isValidPhone(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (v === "") return true; // optional
  if (!/^[0-9+\-()\s]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
