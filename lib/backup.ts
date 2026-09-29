import { getDb } from "@/lib/db";

const TABLES = [
  "products",
  "customers",
  "suppliers",
  "production",
  "production_output",
  "sales",
  "sale_items",
  "payments",
  "purchases",
  "expenses",
  "inventory_tx",
  "settings",
] as const;

export interface BackupFile {
  version: 1;
  exported_at: string;
  tables: Record<string, unknown[]>;
}

export function exportBackup(): BackupFile {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  return { version: 1, exported_at: new Date().toISOString(), tables };
}

function columnsOf(rows: Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row)) set.add(k);
  return [...set];
}

export function importBackup(json: string): { imported: Record<string, number> } {
  const parsed = JSON.parse(json) as BackupFile;
  if (!parsed || parsed.version !== 1 || !parsed.tables) {
    throw new Error("Not a valid StoneOps backup file");
  }
  const db = getDb();
  const imported: Record<string, number> = {};

  const run = db.transaction(() => {
    db.pragma("foreign_keys = OFF");
    for (const t of [...TABLES].reverse()) {
      if (t !== "settings") db.prepare(`DELETE FROM ${t}`).run();
    }
    db.prepare("DELETE FROM settings").run();

    for (const t of TABLES) {
      const rows = parsed.tables[t];
      if (!Array.isArray(rows) || rows.length === 0) {
        imported[t] = 0;
        continue;
      }
      const cols = columnsOf(rows as Record<string, unknown>[]);
      const stmt = db.prepare(
        `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
      );
      let count = 0;
      for (const row of rows as Record<string, unknown>[]) {
        stmt.run(...cols.map((c) => row[c] ?? null));
        count++;
      }
      imported[t] = count;
    }
    db.pragma("foreign_keys = ON");
  });
  run();
  return { imported };
}
