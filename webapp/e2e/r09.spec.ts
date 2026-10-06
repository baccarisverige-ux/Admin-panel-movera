import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    localStorage.setItem("movera-admin-session", id);
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

async function confirm(page: Page) {
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
}

test("R9 one price book drives rate fees options boost commission and preview", async ({ page }) => {
  test.setTimeout(90_000);
  await session(page);
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { level: 2, name: "Pricing & categories" })).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("229,00 kr");
  await expect(page.locator("[data-pricing-dirty='no']")).toBeVisible();

  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByLabel("Södermalm Movera per km").fill("20");
  await page.getByRole("button", { name: "Save price set" }).click();
  await expect(page.getByText(/Södermalm price set saved as pricing revision 2/)).toBeVisible();

  await page.getByRole("button", { name: "Booking Controls" }).click();
  await page.getByLabel("Booking fee").fill("15");
  await page.getByLabel("Waiting per minute").fill("7");
  await page.getByLabel("Tip presets").fill("10, 25, 40");
  await page.getByRole("button", { name: "Save booking controls" }).click();
  await expect(page.getByText(/pricing revision 3/)).toBeVisible();

  await page.getByLabel("Preview zone").selectOption("Z002");
  await expect(page.getByTestId("quote-total")).toHaveText("324,00 kr");
  await page.getByLabel("Quote waiting minutes").fill("2");
  await page.getByLabel("Quote option Pet").check();
  await expect(page.getByTestId("quote-total")).toHaveText("368,00 kr");

  await page.getByRole("button", { name: "Boost Pricing" }).click();
  await page.getByLabel("Manual boost").fill("1.4");
  await page.getByRole("button", { name: "Save boost controls" }).click();
  await expect(page.getByText(/pricing revision 4/)).toBeVisible();

  await page.getByLabel("Quote waiting minutes").fill("0");
  await page.getByLabel("Quote option Pet").uncheck();
  await page.getByLabel("Quote boost").selectOption("manual");
  await expect(page.getByTestId("quote-total")).toHaveText("447,60 kr");

  await page.getByRole("button", { name: "Commission" }).click();
  await page.getByLabel("Movera commission").fill("18");
  await page.getByRole("button", { name: "Save commission" }).click();
  await expect(page.getByText(/pricing revision 5/)).toBeVisible();

  await page.reload();
  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByRole("button", { name: "Commission" }).click();
  await expect(page.getByLabel("Movera commission")).toHaveValue("18");
  await page.getByRole("button", { name: "Booking Controls" }).click();
  await expect(page.getByLabel("Booking fee")).toHaveValue("15");
  await expect(page.getByLabel("Waiting per minute")).toHaveValue("7");
  await expect(page.getByLabel("Tip presets")).toHaveValue("10, 25, 40");
});

test("R9 scheduled boost affects the same quote preview and persists", async ({ page }) => {
  await session(page);
  await page.goto("/pricing");
  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByLabel("Södermalm Movera per km").fill("20");
  await page.getByRole("button", { name: "Save price set" }).click();

  await page.getByRole("button", { name: "Boost Pricing" }).click();
  await page.getByLabel("Schedule multiplier").fill("1.7");
  await page.getByLabel("Schedule start").fill("2026-10-06T17:00");
  await page.getByLabel("Schedule end").fill("2026-10-06T22:00");
  await page.getByRole("button", { name: "Save boost schedule" }).click();
  await confirm(page);
  await expect(page.getByText("Boost schedule saved.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Boost schedules" })).toContainText("1.7×");

  await page.getByLabel("Preview zone").selectOption("Z002");
  await page.getByLabel("Quote time").fill("2026-10-06T19:00");
  await page.getByLabel("Quote boost").selectOption("scheduled");
  await expect(page.getByTestId("quote-lines")).toContainText("schedule Z002-2026-10-06T17:00-1.7");

  await page.reload();
  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByRole("button", { name: "Boost Pricing" }).click();
  await expect(page.getByRole("list", { name: "Boost schedules" })).toContainText("1.7×");
});

test("R9 pricing history restores an older book as a new revision", async ({ page }) => {
  await session(page);
  await page.goto("/pricing");
  await page.getByLabel("Price zone").selectOption("Z002");
  await page.getByLabel("Södermalm Movera per km").fill("20");
  await page.getByRole("button", { name: "Save price set" }).click();
  await expect(page.getByText(/pricing revision 2/)).toBeVisible();

  await page.getByRole("button", { name: "Booking Controls" }).click();
  await page.getByLabel("Booking fee").fill("15");
  await page.getByRole("button", { name: "Save booking controls" }).click();
  await expect(page.getByText(/pricing revision 3/)).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  const rev2 = page.getByRole("list", { name: "Pricing history" }).getByRole("listitem").filter({ hasText: "Revision 2" });
  await rev2.getByRole("button", { name: "restore" }).click();
  await confirm(page);
  await expect(page.getByText(/Pricing revision 2 restored as revision 4/)).toBeVisible();

  await page.getByRole("button", { name: "Booking Controls" }).click();
  await expect(page.getByLabel("Booking fee")).toHaveValue("0");
  await page.getByLabel("Preview zone").selectOption("Z002");
  await expect(page.getByTestId("quote-total")).toHaveText("309,00 kr");
});

test("R9 content role can inspect pricing but cannot mutate it", async ({ page }) => {
  await session(page, "elsa");
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 2, name: "Pricing & categories" })).toBeVisible();
  await expect(page.getByText(/read-only for pricing/)).toBeVisible();
  await expect(page.getByLabel("Norrmalm Movera per km")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save price set" })).toBeDisabled();
  await page.getByRole("button", { name: "Booking Controls" }).click();
  await expect(page.getByLabel("Booking fee")).toBeDisabled();
});

test("R9 pricing remains usable at 390px", async ({ page }) => {
  await session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  await expect(page.getByTestId("quote-preview")).toBeVisible();
  await page.getByRole("button", { name: "Booking Controls" }).click();
  await expect(page.getByLabel("Booking fee")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
