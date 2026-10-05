import { expect, test } from "@playwright/test";

test("sign in through the screen and open trips", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Dashboard" })).toBeVisible();
  const log = await page.evaluate(() => localStorage.getItem("movera-admin-commands"));
  expect(log).toContain("admin.auth.signIn");
  await expect(page.locator(".admin-profile")).not.toContainText(/\d{4}-\d{2}-\d{2}T/);
  await page.getByRole("link", { name: "Trips" }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("heading", { level: 2, name: "Trips" })).toBeVisible();
});
