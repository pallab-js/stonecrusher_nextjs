import { expect, type Page } from "@playwright/test";

export type Username = "admin" | "operator" | "accounts";

/** Walks the login screen: pick the account, tap the PIN pad, press Unlock. */
export async function login(page: Page, username: Username, pin = "1234") {
  await page.goto("/login");
  await selectAccount(page, username);
  await enterPin(page, pin);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL(/\/dashboard/);
}

export async function selectAccount(page: Page, username: Username) {
  await page.getByRole("button", { name: new RegExp(`@${username}$`) }).click();
}

export async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

/** Body text with CSS text-transform applied (matches what the tester sees). */
export async function bodyText(page: Page) {
  return (await page.locator("body").innerText()).toLowerCase();
}

export async function expectVisibleText(page: Page, pattern: RegExp) {
  await expect(page.getByText(pattern).first()).toBeVisible();
}
