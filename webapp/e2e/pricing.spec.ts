import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("quote preview matches the economy formula", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Quote preview" })).toBeVisible();
  await expect(page.getByText("Adjustment range 65–180%")).toBeVisible();
  await expect(page.getByText("229,00 kr")).toBeVisible();
  await expect(page.getByTestId("quote-version")).toHaveText("Rule price-3");
  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByLabel("Södermalm Movera per km").fill("20");
  await page.getByRole("button", { name: "Save price set" }).click();
  await expect(page.getByText("Saved in demo.")).toBeVisible();
  await page.getByLabel("Preview zone").selectOption("Z002");
  await expect(page.getByTestId("quote-total")).toHaveText("309,00 kr");
  await expect(page.getByTestId("quote-version")).toContainText("price-Z002-v");
  await page.getByLabel("Preview zone").selectOption("Z001");
  await expect(page.getByTestId("quote-total")).toHaveText("229,00 kr");
  await expect(page.getByTestId("quote-version")).toHaveText("Rule price-3");
  await expect(page.getByRole("list", { name: "Categories" })).toContainText("Electric");
  await expect(page.getByRole("list", { name: "Ride options" })).toContainText("Booster seat");
  if (process.env.SHOTS) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `docs/gates/g09/pricing-${width}.png`, fullPage: true });
    }
  }
});
