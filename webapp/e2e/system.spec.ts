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
  await expect(page.getByRole("link", { name: "System", exact: true })).toHaveCount(0);
  await page.goto("/settings?tab=panel");
  await page.getByRole("button", { name: "Show developer pages" }).click();
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Developer pages now show in the menu.")).toBeVisible();
  await page.getByRole("link", { name: "System", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "System" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Integrations" })).toContainText("OpenStreetMap");
  await expect(page.getByRole("list", { name: "Integrations" })).toContainText("Google Maps key: empty");
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
