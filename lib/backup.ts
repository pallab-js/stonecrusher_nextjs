import { getDb } from "@/lib/db";

const TABLES = [
  "products",
  "customers",
  "suppliers",
  "orders",
  "order_items",
  "grns",
  "grn_items",
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

/** Authoritative column names for a table, read from the live schema. */
function tableColumns(db: ReturnType<typeof getDb>, table: string): Set<string> {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(info.map((c) => c.name));
}

export function importBackup(json: string): { imported: Record<string, number> } {
  const parsed = JSON.parse(json) as BackupFile;
  if (!parsed || parsed.version !== 1 || !parsed.tables) {
    throw new Error("Not a valid StoneOps backup file");
  }
  const db = getDb();
  const imported: Record<string, number> = {};

  // Validate every table/column in the file against the live schema BEFORE
  // deleting anything, so an incompatible backup fails without data loss.
  const plan: { table: string; cols: string[]; rows: Record<string, unknown>[] }[] = [];
  for (const t of TABLES) {
    const rows = parsed.tables[t];
    if (!Array.isArray(rows) || rows.length === 0) {
      imported[t] = 0;
      continue;
    }
    const allowed = tableColumns(db, t);
    if (allowed.size === 0) {
      throw new Error(`Backup refers to unknown table "${t}"`);
    }
    const cols = columnsOf(rows as Record<string, unknown>[]);
    const unknown = cols.filter((c) => !allowed.has(c));
    if (unknown.length > 0) {
      throw new Error(
        `Backup table "${t}" has unknown column(s): ${unknown.join(", ")}. This backup is incompatible with the current schema.`
      );
    }
    plan.push({ table: t, cols, rows: rows as Record<string, unknown>[] });
  }

  const run = db.transaction(() => {
    db.pragma("foreign_keys = OFF");
    try {
      for (const t of [...TABLES].reverse()) {
        if (t !== "settings") db.prepare(`DELETE FROM ${t}`).run();
      }
      db.prepare("DELETE FROM settings").run();

      for (const { table, cols, rows } of plan) {
        const stmt = db.prepare(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
        );
        let count = 0;
        for (const row of rows) {
          stmt.run(...cols.map((c) => row[c] ?? null));
          count++;
        }
        imported[table] = count;
      }
    } finally {
      db.pragma("foreign_keys = ON");
    }
  });
  run();
  return { imported };
}
