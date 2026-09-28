import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("demo data + analytics", () => {
  test("seeds the unit and lights up the dashboard, reports and maps", async ({ page }) => {
    await login(page, "admin");

    // Settings → load demo data
    await page.goto("/settings");
    await page.getByRole("button", { name: "Load demo / seed data" }).click();
    await page.getByRole("alertdialog").waitFor();
    await page.getByRole("button", { name: "Load demo data" }).click();
    await expect(page.getByText(/demo data loaded/i)).toBeVisible();

    // Dashboard KPIs and charts now have data
    await page.goto("/dashboard");
    await expect(page.getByText(/open invoices/i)).toBeVisible();
    await expect(page.getByText(/stock on ground/i)).toBeVisible();
    await expect(page.getByText(/revenue \(mtd\)/i)).toBeVisible();
    // charts mount client-side after hydration
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();

    // Reports render seeded rows with a CSV export control
    await page.goto("/reports");
    await expect(page.getByRole("button", { name: /export .*csv/i }).first()).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Maps: plant flow view + offline customer map
    await page.goto("/maps");
    await expect(page.getByText(/boulder hopper|jaw crusher/i).first()).toBeVisible();
    await page.getByRole("tab", { name: /customer locations/i }).click();
    await expect(page.getByLabel("Customer locations across India")).toBeVisible();
  });

  test("clearing data returns the unit to an empty state", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/settings");
    await page.getByRole("button", { name: "Load demo / seed data" }).click();
    await page.getByRole("button", { name: "Load demo data" }).click();
    await expect(page.getByText(/demo data loaded/i)).toBeVisible();

    await page.getByRole("button", { name: "Clear all data" }).click();
    await page.getByRole("button", { name: "Clear everything" }).click();
    await expect(page.getByText(/cleared|empty|removed/i).first()).toBeVisible();

    await page.goto("/customers");
    await expect(page.getByText(/no customers yet/i)).toBeVisible();
  });
});
