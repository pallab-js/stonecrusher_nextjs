import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA, DEFAULT_SETTINGS } from "@/lib/schema";
import { hashPin } from "@/lib/auth";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "stonecrusher.db");

const globalForDb = globalThis as unknown as { __stoneDb?: Database.Database };

function ensureColumns(db: Database.Database) {
  const attempts = [
    "ALTER TABLE purchases ADD COLUMN product_id INTEGER REFERENCES products(id)",
  ];
  for (const sql of attempts) {
    try {
      db.exec(sql);
    } catch {
      /* column already exists */
    }
  }
}

function bootstrap(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  ensureColumns(db);

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
