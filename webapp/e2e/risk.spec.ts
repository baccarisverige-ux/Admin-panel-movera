import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("risk exposes validated per-zone simulation controls", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Risk", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Risk" })).toBeVisible();
  await expect(page.getByLabel("Impossible travel (m/s)")).toHaveValue("55");
  await expect(page.getByLabel("Trusted contacts")).toHaveValue("5");
  await expect(page.getByLabel("Daily driving hours")).toHaveValue("0");
});
