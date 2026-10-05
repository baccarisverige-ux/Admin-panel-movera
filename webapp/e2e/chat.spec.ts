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

test("chat threads do not leak into each other", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Chat" })).toBeVisible();
  await expect(page.getByText("Emma: The driver has not arrived.")).toBeVisible();
  await page.getByLabel("Message").fill("On our way");
  await page.getByRole("button", { name: "Send reply" }).click();
  await confirm(page);
  await expect(page.getByText("Nora: On our way")).toBeVisible();
  await page.getByRole("button", { name: "Driver thread" }).click();
  await expect(page.getByText("Erik: I am at the pickup.")).toBeVisible();
  await expect(page.getByText("Emma: The driver has not arrived.")).toHaveCount(0);
  await expect(page.getByText("Nora: On our way")).toHaveCount(0);
});
