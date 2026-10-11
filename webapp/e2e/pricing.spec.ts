import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("test a ride follows the zone price list, in each country's currency", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Pricing" })).toBeVisible();
  await expect(page.getByLabel("Norrmalm Movera Price per km")).toHaveValue("12");
  await page.getByRole("button", { name: /^Test a ride/ }).click();
  const quote = page.getByTestId("quote-preview");
  await quote.getByLabel("Quote surge").fill("1");
  // 29 base + 8 km × 12 + 18 min × 4 = 197, plus 10% app fee = 216.70, rounded to 217
  await expect(page.getByTestId("quote-total")).toHaveText("217,00 kr");
  await quote.getByLabel("Quote waiting minutes").fill("5");
  // 3 paid minutes × 5 kr after 2 free: 212 × 1.1 = 233.2
  await expect(page.getByTestId("quote-total")).toHaveText("233,00 kr");
  await quote.getByLabel("Quote baby seats").fill("1");
  await expect(page.getByTestId("quote-lines")).toContainText("1 baby seat");

  await page.getByRole("radio", { name: "France" }).click();
  await expect(page.getByText(/prices in EUR, VAT included/)).toBeVisible();
  await expect(page.getByLabel("Paris Centre Movera Price per km")).toHaveValue("1.15");
  await expect(page.getByLabel("Paris Centre Child Seat Child seat fee")).toBeVisible();
  if (process.env.SHOTS) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `docs/gates/g09/pricing-${width}.png`, fullPage: true });
    }
  }
});
