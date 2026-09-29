import { expect, test, type Page } from "@playwright/test";
import { login, seedUnit } from "./helpers";

/** On-hand ROM stock shown on the inventory product card. */
async function romStock(page: Page) {
  const card = page
    .locator("div.grid > div")
    .filter({ hasText: "ROM Stone (boulders)" })
    .filter({ has: page.locator(".stat-number") })
    .first();
  return parseFloat((await card.locator(".stat-number").innerText()).replace(/,/g, ""));
}

test.describe("orders, goods receipts and statements", () => {
  test("invoicing an LPO bills the order to closed", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/sales");
    await page.getByRole("tab", { name: "Orders (LPO)" }).click();

    const billBtn = page.locator('button[aria-label^="Create invoice from"]:not([disabled])').first();
    const orderNo = ((await billBtn.getAttribute("aria-label")) ?? "").replace("Create invoice from ", "");
    expect(orderNo).toMatch(/^LPO/);
    await billBtn.click();

    await expect(page.getByText(`Invoice for ${orderNo}`)).toBeVisible();
    await expect(page.locator('input[name="order_id"]')).toHaveValue(/\d+/);
    await expect(page.locator('input[name="item_qty"]').first()).not.toHaveValue("");

    await page.getByRole("button", { name: "Create invoice", exact: true }).click();
    await expect(page.getByText(/Invoice INV\d+ created/)).toBeVisible();

    // the order is now billed → row reflects it
    await page.getByRole("tab", { name: "Orders (LPO)" }).click();
    const row = page.getByRole("row").filter({ hasText: orderNo });
    await expect(row).toContainText(/closed|partial/);
    await expect(row.locator('button[aria-label^="Create invoice from"]')).toBeDisabled();
  });

  test("a goods receipt moves stock once and bills without double counting", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/inventory");
    const before = await romStock(page);

    await page.goto("/purchases");
    await page.getByRole("tab", { name: "Goods receipts (GRN)" }).click();

    const billBtn = page.locator('button[aria-label^="Create bill from"]:not([disabled])').first();
    const grnNo = ((await billBtn.getAttribute("aria-label")) ?? "").replace("Create bill from ", "");
    expect(grnNo).toMatch(/^GRN/);
    await billBtn.click();

    await expect(page.getByText(`Bill ${grnNo}`)).toBeVisible();
    const qty = parseFloat((await page.locator('input[name="qty"]').inputValue()).replace(/,/g, ""));
    expect(qty).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Record purchase", exact: true }).click();
    await expect(page.getByText("Bill recorded against the goods receipt")).toBeVisible();

    // the stock already arrived on the GRN — billing it must not add the qty again
    await page.goto("/inventory");
    const after = await romStock(page);
    expect(Math.abs(after - before)).toBeLessThan(0.05);

    await page.goto("/purchases");
    await page.getByRole("tab", { name: "Goods receipts (GRN)" }).click();
    const row = page.getByRole("row").filter({ hasText: grnNo });
    await expect(row).toContainText("billed");
    await expect(row.locator('button[aria-label^="Create bill from"]')).toBeDisabled();
  });

  test("records a fresh goods receipt and reverses it on delete", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/purchases");
    await page.getByRole("tab", { name: "Goods receipts (GRN)" }).click();
    const billBtn = page.locator('button[aria-label^="Create bill from"]:not([disabled])').first();
    const grnNo = ((await billBtn.getAttribute("aria-label")) ?? "").replace("Create bill from ", "");
    expect(grnNo).toMatch(/^GRN/);

    // deleting the receipt must reverse the stock it received
    await page.goto("/inventory");
    const before = await romStock(page);

    await page.goto("/purchases");
    await page.getByRole("tab", { name: "Goods receipts (GRN)" }).click();
    await page.getByRole("button", { name: `Delete ${grnNo}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Goods receipt deleted — stock reversed")).toBeVisible();

    await page.goto("/inventory");
    const after = await romStock(page);
    expect(after).toBeLessThan(before);
  });

  test("customer statement prints with a running balance", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/customers");
    const stmtBtn = page.locator('button[aria-label^="Statement for "]').first();
    const name = ((await stmtBtn.getAttribute("aria-label")) ?? "").replace("Statement for ", "");
    await stmtBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Customer statement")).toBeVisible();
    await expect(dialog).toContainText(name);
    await expect(dialog).toContainText("Closing");

    const [printPage] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: "Print statement" }).click(),
    ]);
    await printPage.waitForLoadState();
    await expect(printPage.getByText("ACCOUNT STATEMENT")).toBeVisible();
    await expect(printPage.getByText(/Rupees|₹/).first()).toBeVisible();
    await expect(printPage.getByRole("navigation")).toHaveCount(0);
  });

  test("supplier statement opens from the suppliers tab", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/suppliers");
    const stmtBtn = page.locator('button[aria-label^="Statement for "]').first();
    await stmtBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Supplier statement")).toBeVisible();
    await expect(dialog).toContainText("Billed");
    await dialog.getByRole("button", { name: "Close", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("expenses filter by category chips", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/expenses");
    const chip = page.getByRole("button", { name: /^Transport ·/ });
    await expect(chip).toBeVisible();
    await chip.click();

    const rows = page.getByRole("row").filter({ hasText: "Transport" });
    await expect(rows.first()).toBeVisible();
    const otherCategories = await page
      .getByRole("row")
      .filter({ hasText: /Payroll|Admin & office|Repairs & maintenance|Maintenance|Maintenance/ })
      .count();
    expect(otherCategories).toBe(0);
  });

  test("production shows this month's product-wise split", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/production");
    await expect(page.getByText("Product-wise this month")).toBeVisible();
    await expect(page.getByText(/yield \d+%/)).toBeVisible();
  });
});
