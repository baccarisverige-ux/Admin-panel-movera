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

test("reservation rules stay on the booking", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Reservations", exact: true }).click();
  await expect(page.getByLabel("Booking horizon")).toHaveValue("7 days");
  await expect(page.getByLabel("Give-up time")).toHaveValue("5 min");
  await expect(page.getByRole("heading", { level: 3, name: /B1/ })).toContainText("needs a driver");
  await page.getByRole("button", { name: "Assign" }).first().click();
  await confirm(page);
  await expect(page.getByText("Assigned D3.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /B1/ })).toContainText("policy res-2");
});
