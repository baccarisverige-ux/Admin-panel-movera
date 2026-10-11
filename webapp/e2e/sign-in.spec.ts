import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Dashboard" })).toBeVisible();
}

test("sign in through the screen and open trips", async ({ page }) => {
  await signIn(page, "nora@movera.se");
  const log = await page.evaluate(() => localStorage.getItem("movera-admin-commands"));
  expect(log).toContain("admin.auth.signIn");
  await expect(page.locator(".admin-profile")).not.toContainText(/\d{4}-\d{2}-\d{2}T/);
  await page.getByRole("link", { name: "Trips" }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("heading", { level: 2, name: "Trips" })).toBeVisible();
});

test("support cannot open finance by menu or direct URL", async ({ page }) => {
  await signIn(page, "support@movera.se");
  await expect(page.getByRole("link", { name: "Payments" })).toHaveCount(0);
  await page.goto("/payments");
  await expect(page.getByRole("heading", { level: 2, name: "No access" })).toBeVisible();
});

test("fleet scope refuses an out-of-scope zone", async ({ page }) => {
  await signIn(page, "fleet@movera.se");
  await page.goto("/drivers?scope=ARN");
  await expect(page.getByRole("heading", { level: 2, name: "Drivers" })).toBeVisible();
  await page.goto("/drivers?scope=Z002");
  await expect(page.getByRole("heading", { level: 2, name: "No access" })).toBeVisible();
});

test("sensitive phone reveal is permission gated and audited", async ({ page }) => {
  await signIn(page, "support@movera.se");
  await page.goto("/riders/R0001?scope=Z001");
  await expect(page.getByText(/Phone: ••••/).first()).toBeVisible();
  await page.getByRole("button", { name: "Reveal" }).first().click();
  await page.getByLabel("Type R0001 to confirm").fill("R0001");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/Phone: \+46 70 100 00 01/).first()).toBeVisible();
  const audit = await page.evaluate(() => localStorage.getItem("movera-demo-v5"));
  expect(audit).toContain("admin.rider.revealSensitive");
});
