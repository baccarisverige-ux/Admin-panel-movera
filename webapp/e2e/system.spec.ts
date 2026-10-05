import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("system is read-only and shows OpenStreetMap", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "System", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "System" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Integrations" })).toContainText("OpenStreetMap");
  await expect(page.getByRole("list", { name: "Integrations" })).toContainText("Google Maps key: empty");
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
