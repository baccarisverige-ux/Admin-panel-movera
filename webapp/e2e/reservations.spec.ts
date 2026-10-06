import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("reservation queue uses seeded records and preserves booked policy snapshots", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Reservations", exact: true }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Reservations" })).toBeVisible();
  await expect(page.getByTestId("reservation-policy")).toContainText("res-2");
  await expect(page.getByLabel("Booking horizon")).toHaveValue("7");
  await expect(page.getByRole("cell", { name: "B021" })).toBeVisible();

  await page.getByRole("cell", { name: "B021" }).click();
  await expect(page).toHaveURL(/\/reservations\/B021$/);
  await expect(page.getByTestId("reservation-policy-snapshot")).toContainText("Policy snapshot · res-1");
  await expect(page.getByTestId("reservation-policy-snapshot")).toContainText("Booking horizon 5 days");
});
