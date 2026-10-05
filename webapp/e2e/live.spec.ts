import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("live map flags stale drivers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.getByRole("link", { name: "Live map" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Live map" })).toBeVisible();
  await expect(page.getByText("OpenStreetMap")).toBeVisible();
  await expect(page.getByRole("list", { name: "Live drivers" })).toContainText("Maja Holm · Stale");
  await expect(page.locator("[data-live='counts']")).toContainText("Stale 1");
  expect(errors, errors.join("\n")).toEqual([]);
});
