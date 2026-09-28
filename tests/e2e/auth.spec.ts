import { test, expect } from "@playwright/test";
import { enterPin, login, selectAccount } from "./helpers";

test.describe("authentication", () => {
  test("shows the account picker for every seeded user", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /who/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /@admin$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /@operator$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /@accounts$/ })).toBeVisible();
  });

  test("rejects a wrong PIN with an error toast", async ({ page }) => {
    await page.goto("/login");
    await selectAccount(page, "admin");
    await enterPin(page, "9999");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText("Incorrect PIN. Try again.")).toBeVisible();
    // still on the login screen
    await expect(page).toHaveURL(/\/login/);
  });

  test("locks the screen back to the login page", async ({ page }) => {
    await login(page, "admin");
    await page.getByRole("button", { name: /Administrator/ }).click();
    await page.getByRole("menuitem", { name: /lock screen/i }).click();
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: /who/i })).toBeVisible();
  });

  test("redirects unauthenticated visits to /login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: /who/i })).toBeVisible();
  });
});
