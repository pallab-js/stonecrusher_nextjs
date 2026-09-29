import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("role gating", () => {
  test("operator only sees operator routes and is bounced elsewhere", async ({ page }) => {
    await login(page, "operator");

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Production", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Maps", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Sales & Dispatch", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Expenses", exact: true })).toHaveCount(0);

    await page.goto("/sales");
    await page.waitForURL(/\/dashboard/);

    await page.goto("/settings");
    await page.waitForURL(/\/dashboard/);
  });

  test("accountant gets finance routes but not plant routes", async ({ page }) => {
    await login(page, "accounts");

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sales & Dispatch", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Expenses", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Production", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Inventory", exact: true })).toHaveCount(0);

    await page.goto("/production");
    await page.waitForURL(/\/dashboard/);
  });

  test("admin reaches settings", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  });
});
