import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
}

test("configuration draft shows a diff and a second agent publishes", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, "nora@movera.se");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Configuration" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Configuration diff" })).toContainText("No unpublished changes");
  await page.getByRole("checkbox", { name: "Wallet", exact: true }).uncheck();
  await expect(page.getByRole("list", { name: "Configuration diff" })).toContainText("Wallet on → off");
  await page.getByLabel("Rider app").fill("1.1.0");
  await page.getByLabel("Rider app").blur();
  await expect(page.getByRole("list", { name: "Configuration diff" })).toContainText("Rider app 1.0.0 → 1.1.0");
  await page.getByLabel("wait_too_long Swedish").fill("");
  await expect(page.getByText("Missing translation: wait_too_long")).toBeVisible();
  await page.getByLabel("wait_too_long Swedish").fill("Väntan var för lång");
  await page.getByRole("checkbox", { name: "Reservations in this zone" }).uncheck();
  await expect(page.getByRole("list", { name: "Configuration diff" })).toContainText("op-norrmalm");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("A second agent must publish.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Lena Berg · ops" }).click();
  await expect(page.getByLabel("Email")).toHaveValue("lena@movera.se");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/Published version/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Wallet", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Roll back" }).click();
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Rolled back.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Wallet", exact: true })).toBeChecked();
});
