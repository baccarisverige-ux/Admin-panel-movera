import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function confirm(page: Page) {
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
}

test("reviews and bonuses stay on the growth screens", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Promotions", exact: true }).click();
  await expect(page.getByText("ARN120")).toBeVisible();
  await page.getByRole("button", { name: "Hide" }).first().click();
  await confirm(page);
  await expect(page.getByText(/Hidden/)).toBeVisible();
});
