import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    if (!sessionStorage.getItem("dx-test-session")) {
      localStorage.setItem("movera-admin-session", id);
      sessionStorage.setItem("dx-test-session", "1");
    }
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

async function confirm(page: Page) {
  await page.locator(".modal.open").last().getByRole("button", { name: "Confirm" }).click();
}

const zone = (page: Page, name: string) => page.getByRole("navigation", { name: "Zones" }).getByRole("button", { name: new RegExp(`^${name}`) });

test("dispatch has its own menu item, a back button, and every zone with its mode", async ({ page }) => {
  await session(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Dispatch" }).click();
  await expect(page.getByRole("heading", { name: "Dispatch in Sweden" })).toBeVisible();
  await expect(zone(page, "Norrmalm")).toContainText("Automatic");
  await expect(zone(page, "Arlanda")).toBeVisible();
  await zone(page, "Norrmalm").click();
  await expect(page.getByRole("heading", { name: /Norrmalm/ })).toBeVisible();
  await expect(page.getByLabel("Radar drivers")).toHaveValue("5");
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).not.toHaveURL(/zone=/);
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).toHaveURL(/\/$|\/\?/);
});

test("change Radar, publish now, see it in history, then undo", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?zone=Z001");
  await page.getByLabel("Radar drivers").fill("8");
  const bar = page.getByRole("region", { name: "Publish" });
  await expect(bar).toContainText("1 change not live yet");
  await expect(bar).toContainText("not saved");
  await bar.getByRole("button", { name: "See changes" }).click();
  await expect(page.getByRole("list", { name: "Changes not live yet" })).toContainText("Radar drivers: 5 → 8");
  await page.getByLabel("Publish note").fill("More drivers for Friday");
  await bar.getByRole("button", { name: "Publish now" }).click();
  await confirm(page);
  await expect(page.getByText("Live now: Norrmalm.")).toBeVisible();
  await expect(bar).toContainText("Everything is live");
  await page.reload();
  await expect(page.getByLabel("Radar drivers")).toHaveValue("8");

  await page.getByRole("tab", { name: "History" }).click();
  const versions = page.getByRole("list", { name: "Versions" });
  await expect(versions).toContainText("Norrmalm: Radar drivers: 5 → 8");
  await expect(versions).toContainText("More drivers for Friday");
  await versions.getByRole("button", { name: "Undo this version" }).first().click();
  await confirm(page);
  await expect(page.getByText(/undone/)).toBeVisible();
  await page.getByRole("tab", { name: "Rules" }).click();
  await zone(page, "Norrmalm").click();
  await expect(page.getByLabel("Radar drivers")).toHaveValue("5");
});

test("a big change waits for a second admin, who approves it", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?zone=Z002");
  await page.getByRole("radiogroup", { name: "How the mode is chosen" }).getByText("By hand").click();
  await page.getByRole("radiogroup", { name: "Main mode" }).getByText("Radar").click();
  const bar = page.getByRole("region", { name: "Publish" });
  await bar.getByRole("button", { name: "See changes" }).click();
  await expect(page.getByRole("list", { name: "Changes not live yet" })).toContainText("Needs a second admin");
  await bar.getByRole("button", { name: "Publish now" }).click();
  await confirm(page);
  await expect(page.getByText("Waiting for a second admin: Södermalm.")).toBeVisible();
  const approvals = page.getByRole("region", { name: "Waiting for a second admin" });
  await expect(approvals).toContainText("How the mode is chosen: Automatic → By hand");
  await expect(approvals.getByRole("button", { name: "Approve" })).toBeDisabled();

  await page.evaluate(() => localStorage.setItem("movera-admin-session", "lena"));
  await page.reload();
  await page.getByRole("region", { name: "Waiting for a second admin" }).getByRole("button", { name: "Approve" }).click();
  await confirm(page);
  await expect(page.getByRole("region", { name: "Waiting for a second admin" })).toHaveCount(0);
  await expect(zone(page, "Södermalm")).toContainText("Radar");
});

test("save a draft, test a ride with my changes, map full screen and hide", async ({ page }) => {
  test.setTimeout(60_000);
  await session(page);
  await page.goto("/dispatch?zone=Z001&tab=best");
  await page.getByLabel("Rating on").uncheck();
  await page.getByRole("region", { name: "Publish" }).getByRole("button", { name: "Save draft" }).click();
  await confirm(page);
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Publish" })).toContainText("saved as a draft");
  await page.getByRole("region", { name: "Publish" }).getByRole("button", { name: "Test it" }).click();
  await expect(page.getByRole("radiogroup", { name: "Rules to test" }).getByRole("radio", { name: "My changes" })).toBeChecked();
  const result = page.getByRole("region", { name: "Test result" });
  await expect(result.getByRole("list", { name: "What happens second by second" })).toContainText("Search stops");
  await expect(result).not.toContainText(/rating \d/);
  await page.getByRole("radiogroup", { name: "Rules to test" }).getByText("Live now").click();
  await expect(result).toContainText(/rating \d/);
  await page.getByLabel("Woman driver only on").check();
  await result.getByRole("button", { name: /Show drivers who cannot take it/ }).click();
  await expect(result.getByRole("list", { name: "Drivers who cannot take it" })).toContainText("woman driver");

  const map = page.getByRole("region", { name: "Test map" });
  await map.getByRole("button", { name: "Full screen" }).click();
  await expect(map).toHaveClass(/full/);
  await map.getByRole("button", { name: "Back" }).click();
  await expect(map).not.toHaveClass(/full/);
  await map.getByRole("button", { name: "Hide map" }).click();
  await expect(map).toContainText("The map is hidden");
  await map.getByRole("button", { name: "Show map" }).click();
  await expect(page.getByTestId("dispatch-test-map")).toBeVisible();
});

test("rider waiting steps: change the message and see it in the rider app", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?zone=Z001&tab=waiting");
  await page.getByLabel("Suggest an upgrade message").fill("Comfort is free in 2 min. Switch?");
  const phone = page.getByLabel("Rider waiting preview");
  await phone.getByRole("button", { name: "2 min" }).click();
  await expect(phone.getByLabel("Rider screen")).toContainText("Comfort is free in 2 min. Switch?");
  await page.getByLabel("Busy, try later on").uncheck();
  await expect(phone.getByRole("button", { name: "8 min" })).toHaveCount(0);
  await page.getByLabel("Suggest an upgrade message").fill("");
  await expect(page.getByLabel("Norrmalm rules").getByRole("alert")).toContainText("each step that is on needs a message");
  await expect(page.getByRole("region", { name: "Publish" }).getByRole("button", { name: "Publish now" })).toBeDisabled();
});

test("live: alerts, pause a zone needs approval, send a rider to a radar", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?view=live");
  await expect(page.getByRole("region", { name: "Alerts" })).toContainText(/waited|free driver/);
  await page.getByRole("button", { name: "Pause Norrmalm" }).click();
  await confirm(page);
  await expect(page.getByText("Pause Norrmalm: waiting for a second admin to approve.")).toBeVisible();
  const list = page.getByRole("list", { name: "Riders waiting" });
  const first = list.getByRole("listitem").first();
  await first.getByRole("button", { name: "Handle" }).click();
  await first.getByRole("button", { name: "Send" }).nth(1).click();
  await confirm(page);
  await expect(first).toContainText(/Sent to radar/);
  const map = page.getByRole("region", { name: /Live map/ });
  await map.getByRole("button", { name: "Full screen" }).click();
  await page.keyboard.press("Escape");
  await expect(map).not.toHaveClass(/full/);
});

test("cancel checks: the automatic fee decision can be changed by hand", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?view=cancels");
  const record = page.getByRole("list", { name: "Cancel checks" }).getByRole("listitem").first();
  await expect(record).toContainText("No fee");
  await expect(record).toContainText("inside the free 2 min");
  await expect(record.getByRole("img", { name: /Route from accept to cancel/ })).toBeVisible();
  await record.getByRole("button", { name: /Give the fee to the driver/ }).click();
  await confirm(page);
  await expect(record).toContainText("Changed by nora");
  await expect(record).toContainText("Fee 50 kr");
});

test("events: open the driver bonus builder with the event's area and message", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?view=events");
  const event = page.getByRole("list", { name: "Events" }).getByRole("listitem").filter({ hasText: "Concert at Friends Arena" });
  await event.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Event name")).toHaveValue("Concert at Friends Arena");
  await page.getByRole("button", { name: "Also make a driver bonus" }).click();
  await expect(page).toHaveURL(/drivers\?view=bonuses/);
  await expect(page.getByLabel("Bonus name")).toHaveValue("Concert at Friends Arena");
  await expect(page.getByLabel("Message to drivers")).toHaveValue(/north gate/);
  await expect(page.getByRole("list", { name: "Bonus areas" }).getByLabel("Area 1 name")).toHaveValue("Concert at Friends Arena");
});

test("test a ride during an event uses the event's rules", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?view=test&zone=Z007");
  await page.getByLabel("Test time").selectOption({ label: "During Concert at Friends Arena" });
  await expect(page.getByRole("region", { name: "Test result" })).toContainText("Event Concert at Friends Arena: Radar with 12 drivers.");
});

test("rules file, other countries, read-only roles and phones", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Rules file" }).click();
  expect((await download).suggestedFilename()).toMatch(/movera-dispatch-rules-SE-rev\d+\.json/);

  await page.goto("/dispatch?country=FR&zone=FR-PC&tab=rides");
  await expect(page.getByRole("heading", { name: "Dispatch in France" })).toBeVisible();
  await expect(page.getByLabel("Cancel fee")).toHaveValue("5");

  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto("/dispatch?zone=Z001");
  await expect(page.getByRole("button", { name: "All zones" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});

test("radar offers in the driver app and going offline automatically", async ({ page }) => {
  await session(page);
  await page.goto("/dispatch?zone=Z001");
  await page.getByLabel("Offers in the popup").fill("3");
  const phone = page.getByLabel("Driver offer preview");
  await expect(phone.getByLabel("3 offers stacked")).toHaveCount(1);
  await expect(phone).toContainText("1 of 3 offers");
  await page.getByLabel("Offers on full-screen radar").fill("10");
  await phone.getByRole("button", { name: "Full screen" }).click();
  await expect(phone.getByLabel("Full-screen radar")).toContainText("10 offers max");
  await page.getByLabel("While driving a rider on").uncheck();
  await phone.getByRole("button", { name: "While driving" }).click();
  await expect(phone).toContainText("No Radar offers while driving");
  await page.getByRole("tab", { name: "Drivers" }).click();
  await page.getByLabel("Offline after offers not accepted").fill("4");
  const bar = page.getByRole("region", { name: "Publish" });
  await bar.getByRole("button", { name: "See changes" }).click();
  const list = page.getByRole("list", { name: "Changes not live yet" });
  await expect(list).toContainText("Offers in the popup: 2 → 3");
  await expect(list).toContainText("Radar offers while driving: on → off");
  await expect(list).toContainText("Offline after offers not accepted: 5 → 4");
  await page.getByLabel("Go offline automatically on").uncheck();
  await expect(page.getByLabel("Offline after offers not accepted")).toBeDisabled();
});

test("a viewer can look but not change", async ({ page }) => {
  await session(page, "anna");
  await page.goto("/dispatch?zone=Z001");
  await expect(page.getByText("You can view these rules.")).toBeVisible();
  await expect(page.getByLabel("Radar on", { exact: true })).toBeDisabled();
});
