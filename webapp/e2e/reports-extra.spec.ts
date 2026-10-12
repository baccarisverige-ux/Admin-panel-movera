import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    localStorage.setItem("movera-admin-session", id);
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

const cards = (page: Page) => page.getByRole("region", { name: "Numbers" });
const card = (page: Page, label: string) => cards(page).locator(".rp-card").filter({ hasText: label }).first();

test("reports have the six extra tabs and each shows numbers, a table and an export", async ({ page }) => {
  await session(page);
  await page.goto("/reports?period=month");
  for (const name of ["Taxes", "Fleet owners", "Zones", "Surge", "Support & safety", "Promotions"]) await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  for (const [name, table] of [["Fleet owners", "Fleet owners"], ["Zones", "Zones side by side"], ["Surge", "Surge by zone"], ["Promotions", "Promotions return"]] as const) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(cards(page).locator(".rp-card").first()).toBeVisible();
    await expect(page.getByRole("table", { name: table })).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV" })).toBeEnabled();
  }
  await page.getByRole("tab", { name: "Support & safety", exact: true }).click();
  await expect(card(page, "Tickets opened")).toBeVisible();
  await expect(page.getByRole("region", { name: "Tickets by topic" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Incidents by level" })).toBeVisible();
});

test("taxes: a Swedish company, totals in SEK, and rules with switches that are kept", async ({ page }) => {
  await session(page);
  await page.goto("/reports?tab=taxes&period=month");
  await expect(card(page, "Swedish VAT on commission")).toBeVisible();
  await expect(card(page, "Movera owes")).toBeVisible();
  const table = page.getByRole("table", { name: "Taxes by country" });
  await expect(table).toContainText("Sweden");
  await expect(table).toContainText("France");
  await expect(table).toContainText("Tunisia");
  await expect(page.getByText("Movera AB · Sweden")).toBeVisible();
  await expect(page.getByText(/Movera owes in total/)).toContainText("kr");
  await page.getByRole("switch", { name: "Movera sells the ride on" }).check();
  await page.getByLabel("VAT in ride prices rate").fill("12");
  await page.getByRole("button", { name: "Save tax rules" }).click();
  await page.locator(".modal.open").last().getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Tax rules for Sweden saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Movera sells the ride on" })).toBeChecked();
  await expect(page.getByLabel("VAT in ride prices rate")).toHaveValue("12");
  await card(page, "VAT in ride prices").getByRole("button", { name: "What is VAT in ride prices?" }).click();
  await expect(card(page, "VAT in ride prices")).toContainText("at 12%. Movera sells the ride and pays it.");
  await page.goto("/reports?tab=taxes&period=month&country=FR");
  await expect(page.getByRole("switch", { name: "Reverse charge on" })).toBeChecked();
  await expect(card(page, "Reverse charge")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^movera-taxes-FR-/);
});

test("taxes are only for admins who can see finance; zones and surge follow the country bar", async ({ page }) => {
  await session(page, "daniel");
  await page.goto("/reports?tab=taxes");
  await expect(page.getByText("Taxes are for admins who can see finance.")).toBeVisible();
  const other = await page.context().newPage();
  await other.addInitScript(() => {
    localStorage.setItem("movera-admin-session", "nora");
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  });
  await other.goto("/reports?tab=zones&country=FR&period=month");
  await expect(other.getByRole("heading", { name: "Reports for France" })).toBeVisible();
  await expect(other.getByRole("table", { name: "Zones side by side" })).toContainText("Paris");
  await other.goto("/reports?tab=surge&country=TN&period=week");
  await expect(other.getByRole("heading", { name: "Reports for Tunisia" })).toBeVisible();
  await expect(card(other, "Time with surge")).toBeVisible();
  await expect(other.getByRole("link", { name: "Surge settings" })).toHaveAttribute("href", "/pricing?tab=surge");
  await other.close();
});

test("extra reports fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await session(page);
  for (const tab of ["taxes", "fleets", "zones", "surge", "care", "promos"]) {
    await page.goto(`/reports?tab=${tab}&period=month`);
    await expect(cards(page).locator(".rp-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), tab).toBe(true);
  }
});
