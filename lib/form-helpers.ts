export function s(fd: FormData, key: string): string {
  const v = fd.get(key);
  return v == null ? "" : String(v).trim();
}

export function opt(fd: FormData, key: string): string | null {
  const v = s(fd, key);
  return v === "" ? null : v;
}

export function n(fd: FormData, key: string): number {
  const v = Number(s(fd, key));
  return Number.isFinite(v) ? v : 0;
}

export function optN(fd: FormData, key: string): number | null {
  const raw = s(fd, key);
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

export function nAll(fd: FormData, key: string): number[] {
  return fd
    .getAll(key)
    .map((v) => Number(String(v)))
    .filter((v) => Number.isFinite(v));
}
