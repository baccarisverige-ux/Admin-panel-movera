import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a test message reaches only the chosen audience", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Messages", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Messages" })).toBeVisible();
  await page.getByRole("button", { name: "Test send" }).click();
  await expect(page.getByText("Would reach: R1")).toBeVisible();
  await expect(page.getByText("Would reach: R1, R2")).toHaveCount(0);
});
