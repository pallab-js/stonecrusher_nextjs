import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import path from "node:path";
import { login } from "./helpers";

/**
 * File name is prefixed so this runs first: global-setup plants a legacy
 * database (no sales.order_id, no orders/grns tables) and every later test
 * runs against the migrated schema.
 */
test("a legacy database is migrated in place without losing data", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/dashboard"); // first request bootstraps (migrates) the database
  await expect(page.getByRole("navigation")).toBeVisible();

  const db = new Database(path.join(process.cwd(), "data", "e2e", "stonecrusher.db"));
  const columns = (table: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);

  expect(columns("sales")).toContain("order_id");
  expect(columns("purchases")).toContain("grn_id");
  expect(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_sales_order'").get()
  ).toBeTruthy();
  expect(
    (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'inventory_tx'").get() as { sql: string }).sql
  ).toContain("'grn'");
  for (const table of ["orders", "order_items", "grns", "grn_items"]) {
    expect(columns(table).length).toBeGreaterThan(0);
  }

  // pre-migration rows survive the upgrade
  expect(db.prepare("SELECT invoice_no FROM sales WHERE id = 1").get()).toEqual({ invoice_no: "INV0001" });
  expect(db.prepare("SELECT code FROM products WHERE id = 1").get()).toEqual({ code: "ROM" });
  db.close();
});
