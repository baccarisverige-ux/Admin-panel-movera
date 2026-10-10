import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("nora@movera.se");
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Live map", exact: true })).toBeVisible();
}

test("live map moves drivers and opens a stale position", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.getByRole("link", { name: "Live map", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Live map" })).toBeVisible();
  await expect(page.locator(".page-heading")).toContainText("OpenStreetMap");
  await expect(page.locator("[data-live='counts']")).toContainText("600");
  await expect(page.locator("[data-live='counts']")).toContainText("Stale");
  await expect(page.getByRole("list", { name: "Airport queue" })).toContainText("Arlanda queue 1");
  await expect(page.getByRole("list", { name: "Boosts" })).toContainText("Norrmalm boost");
  const stale = page.getByRole("button", { name: /Stale · last seen/ }).first();
  await stale.click();
  await expect(page.getByTestId("live-panel")).toContainText("Last seen");
  await page.getByTestId("live-panel").getByRole("link", { name: "Open page" }).click();
  await expect(page).toHaveURL(/\/drivers\/D/);
  await page.goto("/live");
  const marker = page.locator(".ops-marker.driver:not(.stale)").first();
  await expect(marker).toBeVisible();
  const lat = await marker.getAttribute("data-lat");
  await page.waitForFunction((previous) => {
    const node = document.querySelector(".ops-marker.driver:not(.stale)");
    return !!node && node.getAttribute("data-lat") !== previous;
  }, lat);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("dispatch values save per zone and survive reload", async ({ page }) => {
  await signIn(page);
  await page.goto("/live");
  const offer = page.getByLabel("Norrmalm offer time");
  await offer.scrollIntoViewIfNeeded();
  await expect(offer).toHaveValue("8.5");
  await expect(page.getByLabel("Norrmalm next-trip radius")).toHaveValue("30");
  await offer.fill("9");
  await page.getByRole("button", { name: "Save dispatch rules" }).click();
  await expect(page.getByText("Saved in demo.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Norrmalm offer time")).toHaveValue("9");
  await expect(page.getByLabel("Södermalm offer time")).toHaveValue("8.5");
  if (process.env.SHOTS) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `docs/gates/g08/live-${width}.png`, fullPage: true });
    }
  }
});
