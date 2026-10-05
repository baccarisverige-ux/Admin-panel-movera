import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Riders", exact: true })).toBeVisible();
}

test("a rider is found by id and the tabs are filled", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.getByRole("link", { name: "Riders", exact: true }).click();
  await page.getByLabel("Find rider").fill("R0001");
  await page.getByRole("cell", { name: "R0001", exact: true }).click();
  await expect(page).toHaveURL(/\/riders\/R0001$/);
  await page.getByRole("button", { name: "Trips" }).click();
  await expect(page.locator("[data-tab-panel='trips']")).toContainText("T0001");
  await page.getByRole("button", { name: "Saved places" }).click();
  await expect(page.locator("[data-tab-panel='saved-places']")).toContainText("None are stored for this rider.");
  await page.getByRole("button", { name: "Block" }).click();
  await page.getByLabel("Type R0001 to confirm").fill("R0001");
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("button", { name: "Unblock" })).toBeVisible();
  await expect(page.getByText("R0001 · blocked")).toBeVisible();
});
