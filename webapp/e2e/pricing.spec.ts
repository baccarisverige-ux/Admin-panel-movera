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
});
