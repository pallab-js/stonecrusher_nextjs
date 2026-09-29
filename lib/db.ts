import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA, SCHEMA_INDEXES, DEFAULT_SETTINGS } from "@/lib/schema";
import { hashPin } from "@/lib/auth";
import { dataDir } from "@/lib/paths";

const DB_DIR = dataDir();
const DB_PATH = path.join(DB_DIR, "stonecrusher.db");

const globalForDb = globalThis as unknown as { __stoneDb?: Database.Database };

function ensureColumns(db: Database.Database) {
  const attempts = [
    "ALTER TABLE purchases ADD COLUMN product_id INTEGER REFERENCES products(id)",
    "ALTER TABLE sales ADD COLUMN order_id INTEGER REFERENCES orders(id)",
    "ALTER TABLE purchases ADD COLUMN grn_id INTEGER REFERENCES grns(id)",
  ];
  for (const sql of attempts) {
    try {
      db.exec(sql);
    } catch {
      /* column already exists */
    }
  }
}

/** Rebuild inventory_tx when its CHECK predates GRN receipts. */
function migrateInventoryTx(db: Database.Database) {
  const table = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'inventory_tx'")
    .get() as { sql: string } | undefined;
  if (!table || table.sql.includes("'grn'")) return;
  db.pragma("foreign_keys = OFF");
  db.exec(`
    CREATE TABLE inventory_tx_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_id INTEGER NOT NULL REFERENCES products(id),
      dir TEXT NOT NULL CHECK (dir IN ('in','out')),
      qty REAL NOT NULL DEFAULT 0,
      ref_type TEXT NOT NULL DEFAULT 'manual' CHECK (ref_type IN ('production','sale','purchase','grn','manual')),
      ref_id INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO inventory_tx_new (id, date, product_id, dir, qty, ref_type, ref_id, notes, created_at)
      SELECT id, date, product_id, dir, qty, ref_type, ref_id, notes, created_at FROM inventory_tx;
    DROP TABLE inventory_tx;
    ALTER TABLE inventory_tx_new RENAME TO inventory_tx;
    CREATE INDEX IF NOT EXISTS idx_invtx_date ON inventory_tx(date);
    CREATE INDEX IF NOT EXISTS idx_invtx_product ON inventory_tx(product_id);
  `);
  db.pragma("foreign_keys = ON");
}

function bootstrap(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  ensureColumns(db);
  migrateInventoryTx(db);
  db.exec(SCHEMA_INDEXES);

  const insertSetting = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING"
  );
  const seedSettings = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value);
    }
  });
  seedSettings();

  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (name, username, role, pin_hash) VALUES (?, ?, ?, ?)"
    );
    insertUser.run("Administrator", "admin", "admin", hashPin("1234"));
    insertUser.run("Plant Operator", "operator", "operator", hashPin("1234"));
    insertUser.run("Accounts", "accounts", "accountant", hashPin("1234"));
  }
}

export function getDb(): Database.Database {
  if (!globalForDb.__stoneDb) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    bootstrap(db);
    globalForDb.__stoneDb = db;
  }
  return globalForDb.__stoneDb;
}

export function dbPath(): string {
  return DB_PATH;
}
