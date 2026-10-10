import { expect, test, type Page } from "@playwright/test";

async function signInAs(page: Page, id: string) {
  await page.addInitScript((agent) => {
    localStorage.setItem("movera-admin-session", agent);
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, id);
}

test("country first, then zones, then period drive the dashboard", async ({ page }) => {
  await signInAs(page, "nora");
  await page.goto("/");
  await expect(page.getByTestId("gross-bookings")).toContainText("kr");

  await page.getByRole("radio", { name: "France" }).click();
  await expect(page).toHaveURL(/country=FR/);
  await expect(page.getByTestId("gross-bookings")).toContainText("€");
  const allZones = await page.getByTestId("gross-bookings").innerText();

  await page.getByRole("button", { name: /Zones:/ }).click();
  await page.getByText("La Défense").click();
  await expect(page).toHaveURL(/scope=FR-LD/);
  await expect(page.getByRole("button", { name: "Zones: La Défense" })).toBeVisible();
  await expect(page.getByTestId("gross-bookings")).not.toHaveText(allZones);

  await page.getByRole("radio", { name: "Month" }).click();
  await expect(page).toHaveURL(/period=month/);
  await page.getByLabel("Pick a date").fill("2026-09-15");
  await expect(page).toHaveURL(/period=date&on=2026-09-15/);

  await page.getByRole("link", { name: "Drivers", exact: true }).click();
  await expect(page).toHaveURL(/\/drivers\?country=FR&scope=FR-LD/);
  await expect(page.getByRole("button", { name: "Zones: La Défense" })).toBeVisible();
});

test("a country manager only sees their country", async ({ page }) => {
  await signInAs(page, "yasmine");
  await page.goto("/?country=SE");
  await expect(page.getByRole("radiogroup", { name: "Country" }).getByRole("radio")).toHaveCount(1);
  await expect(page.getByRole("radio", { name: "Tunisia" })).toBeChecked();
  await expect(page.getByTestId("gross-bookings")).toContainText("DT");
});

test("scheduled rides show upcoming, past and calendar", async ({ page }) => {
  await signInAs(page, "nora");
  await page.goto("/");
  const rides = page.getByRole("region", { name: "Scheduled rides" }).or(page.locator(".rides-card"));
  await expect(rides.getByRole("cell").first()).toBeVisible();
  await rides.getByRole("tab", { name: /Past/ }).click();
  await page.getByRole("radio", { name: "Week" }).click();
  await expect(rides.getByText("completed").first()).toBeVisible();
  await rides.getByRole("tab", { name: "Calendar" }).click();
  await expect(rides.locator(".cal-day")).toHaveCount(7);
});
