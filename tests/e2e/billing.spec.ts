import { test, expect } from "@playwright/test";
import { login, seedUnit } from "./helpers";

test.describe("invoicing, payments and print", () => {
  test("records a payment and flips the invoice to paid", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/sales");
    await page.getByRole("button", { name: "unpaid", exact: true }).click();

    const payButton = page.getByRole("button", { name: /^Payments for / }).first();
    const invoiceNo = ((await payButton.getAttribute("aria-label")) ?? "").replace("Payments for ", "");
    expect(invoiceNo).toMatch(/^INV/);

    await payButton.click();
    await expect(page.getByText("Invoice total")).toBeVisible();
    await expect(page.getByText("Balance due")).toBeVisible();
    await page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(page.getByText(/Payment of .* recorded/)).toBeVisible();

    // fully paid → the invoice drops out of the "unpaid" filter
    await expect(page.getByRole("row").filter({ hasText: invoiceNo })).toHaveCount(0);

    // and shows up under "paid" with receipts ready to print
    await page.getByRole("button", { name: "paid", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: invoiceNo });
    await expect(row.getByText("paid", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: `Payments for ${invoiceNo}` }).click();
    await expect(page.getByRole("link", { name: /^Print receipt for/ }).first()).toBeVisible();
    await expect(page.getByText("Fully paid")).toBeVisible();
  });

  test("prints an A5 tax invoice with amount in words", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/sales");
    const href = await page.locator('a[aria-label^="Print invoice"]').first().getAttribute("href");
    expect(href).toMatch(/\/sales\/print\/\d+/);
    await page.goto(href!);

    await expect(page.getByText("TAX INVOICE")).toBeVisible();
    await expect(page.getByText("Invoice no.")).toBeVisible();
    await expect(page.getByText(/Rupees/).first()).toBeVisible();
    await expect(page.getByText(/Authorised signatory/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to invoices/ })).toBeVisible();
    // the app shell is not printed
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("prints a payment receipt for a settled invoice", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/sales");
    await page.getByRole("button", { name: "paid", exact: true }).click();
    const payButton = page.getByRole("button", { name: /^Payments for / }).first();
    await payButton.click();

    const href = await page.locator('a[href*="/sales/receipt/"]').first().getAttribute("href");
    expect(href).toMatch(/\/sales\/receipt\/\d+/);
    await page.goto(href!);

    await expect(page.getByText("PAYMENT RECEIPT")).toBeVisible();
    await expect(page.getByText(/Received with thanks from/)).toBeVisible();
    await expect(page.getByText(/towards payment against Invoice/)).toBeVisible();
  });

  test("shows receivables ageing buckets in reports", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/reports");
    await expect(page.getByText("Receivables ageing")).toBeVisible();
    await expect(page.getByText("0–15 days")).toBeVisible();
    await expect(page.getByText("90+ days")).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV" }).first()).toBeVisible();
  });

  test("prints the stock ledger for one product and for all products", async ({ page }) => {
    await login(page, "admin");
    await seedUnit(page);

    await page.goto("/inventory");
    await expect(page.getByRole("link", { name: /Stock ledger/ })).toBeVisible();
    const href = await page
      .locator('a[href*="/inventory/ledger?product="]')
      .first()
      .getAttribute("href");
    await page.goto(href!);
    await expect(page.getByText("STOCK LEDGER")).toBeVisible();
    await expect(page.getByText("Opening balance")).toBeVisible();

    await page.goto("/inventory/ledger");
    await expect(page.getByText("STOCK SUMMARY")).toBeVisible();
  });
});
