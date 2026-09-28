import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const CUSTOMER = "E2E Test Traders Pvt Ltd";

test.describe("customers master", () => {
  test("creates, finds and deletes a customer", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/customers");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Customers", exact: true })
    ).toBeVisible();

    // create
    await page.getByRole("button", { name: "+ Add" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(CUSTOMER);
    await dialog.getByLabel("Phone").fill("9864012345");
    await dialog.getByLabel("State").fill("Assam");
    await dialog.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("Customer added")).toBeVisible();

    // it is in the table
    const row = page.getByRole("row").filter({ hasText: CUSTOMER });
    await expect(row).toBeVisible();
    await expect(row.getByText("Assam")).toBeVisible();

    // search narrows the list
    await page.getByPlaceholder(/search customers/i).fill(CUSTOMER);
    await expect(page.getByRole("row").filter({ hasText: CUSTOMER })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Other Co" })).toHaveCount(0);

    // delete (dialog confirms)
    await row.getByRole("button", { name: `Delete ${CUSTOMER}` }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: CUSTOMER })).toHaveCount(0);
  });

  test("validates a required name", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/customers");
    await page.getByRole("button", { name: "+ Add" }).click();
    await page.getByRole("button", { name: "Add customer" }).click();
    // HTML required validation keeps the dialog open with no success toast
    await expect(page.getByText("Customer added")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
