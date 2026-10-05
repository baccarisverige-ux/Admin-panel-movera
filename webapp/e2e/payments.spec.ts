import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Payments" })).toBeVisible();
}

test("a timed-out double click still refunds once", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.getByRole("link", { name: "Payments" }).click();
  await expect(page.getByTestId("payment-count")).toContainText("300 payments");
  await expect(page.getByTestId("bank-check")).toContainText("SEB");
  await expect(page.getByTestId("bank-check")).toContainText("IBAN checks");
  await page.getByLabel("Simulate errors").selectOption("slow");
  await page.goto("/payments/PAY0002");
  const refund = page.getByRole("button", { name: "Refund payment" });
  await refund.click();
  await refund.click();
  await expect(page.getByText("Unknown. Check the audit before trying again.")).toBeVisible();
  await expect(page.getByTestId("payment-timeline")).toContainText("Refunded");
  await expect(page.getByTestId("refund-count")).toHaveText("1");
  await page.getByRole("button", { name: "Retry refund" }).click();
  await expect(page.getByTestId("refund-count")).toHaveText("1");
  if (process.env.SHOTS) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `docs/gates/g10/payment-${width}.png`, fullPage: true });
    }
    await page.goto("/payments");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "docs/gates/g10/payments-1440.png", fullPage: false });
  }
  await page.getByLabel("Simulate errors").selectOption("none");
});
