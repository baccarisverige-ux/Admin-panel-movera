import { expect, test } from "@playwright/test";

test("zones map lists nine types and terra draw", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Zones" }).click();
  await expect(page).toHaveURL(/\/zones$/);
  await expect(page.getByRole("heading", { level: 3, name: "Stockholm zones" })).toBeVisible();
  await expect(page.getByText("Terra Draw")).toBeVisible();
  const options = await page.getByLabel("Zone").locator("option").allTextContents();
  expect(options.some((text) => text.includes("Service area"))).toBe(true);
  expect(options.some((text) => text.includes("Operating zone"))).toBe(true);
  expect(options.some((text) => text.includes("Airport"))).toBe(true);
  expect(options.some((text) => text.includes("Boost"))).toBe(true);
  expect(options.some((text) => text.includes("Event"))).toBe(true);
  expect(options.some((text) => text.includes("No pickup"))).toBe(true);
  expect(options.some((text) => text.includes("Restricted"))).toBe(true);
  expect(options.some((text) => text.includes("Fleet territory"))).toBe(true);
  expect(options.some((text) => text.includes("Pickup point"))).toBe(true);
  await expect(page.getByText("Inside:")).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors, errors.join("\n")).toEqual([]);
});
