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

test("a payout is paid only after the bank is approved", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Payouts", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Payouts" })).toBeVisible();
  await expect(page.getByText("100, 200 and 500 kr")).toBeVisible();
  await page.getByRole("button", { name: "Mark paid" }).click();
  await confirm(page);
  await expect(page.getByText("Bank details are still in review.")).toBeVisible();
  await page.getByRole("button", { name: "Approve bank" }).click();
  await confirm(page);
  await expect(page.getByText("Bank details approved.")).toBeVisible();
  await page.getByRole("button", { name: "Mark paid" }).click();
  await confirm(page);
  await expect(page.getByText("Payout marked paid once.")).toBeVisible();
});
