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

test("publishing one content slot leaves the others", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Content", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Content" })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await confirm(page);
  await expect(page.getByText("A second agent must publish.")).toBeVisible();
});
