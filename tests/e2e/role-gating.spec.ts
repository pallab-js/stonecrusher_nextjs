import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("role gating", () => {
  test("operator only sees operator routes and is bounced elsewhere", async ({ page }) => {
    await login(page, "operator");

    await expect(page.getByRole("link", { name: "Production" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maps" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sales & Dispatch" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Expenses" })).toHaveCount(0);

    await page.goto("/sales");
    await page.waitForURL(/\/dashboard/);

    await page.goto("/settings");
    await page.waitForURL(/\/dashboard/);
  });

  test("accountant gets finance routes but not plant routes", async ({ page }) => {
    await login(page, "accounts");

    await expect(page.getByRole("link", { name: "Sales & Dispatch" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Expenses" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Production" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Inventory" })).toHaveCount(0);

    await page.goto("/production");
    await page.waitForURL(/\/dashboard/);
  });

  test("admin reaches settings", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });
});
