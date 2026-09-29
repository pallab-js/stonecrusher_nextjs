import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

/**
 * Builds the e2e SQLite file from a *legacy* schema snapshot (the schema as it
 * shipped before the orders/GRN phase) plus a couple of planted rows.
 *
 * Runs as part of the playwright webServer command — i.e. immediately before
 * `next dev` starts — so the server's first request migrates the database in
 * place and tests/e2e/a-upgrade.spec.ts can assert the result.
 */
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "data", "e2e");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.join(dir, "stonecrusher.db"));
db.exec(fs.readFileSync(path.join(root, "tests", "fixtures", "legacy-schema.sql"), "utf8"));
db.exec(`
  INSERT INTO products (code, name, kind, rate, opening_stock)
    VALUES ('ROM', 'ROM Stone (boulders)', 'raw', 18, 1200);
  INSERT INTO customers (name, contact, address)
    VALUES ('Legacy Customer', 'Ramesh', 'Guwahati');
  INSERT INTO sales (invoice_no, date, customer_id, subtotal, total, paid_amount, status)
    VALUES ('INV0001', '2026-09-01', 1, 1000, 1000, 0, 'unpaid');
`);
db.close();
