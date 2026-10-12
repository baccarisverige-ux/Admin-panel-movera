import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    localStorage.setItem("movera-admin-session", id);
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

async function confirm(page: Page) {
  await page.locator(".modal.open").last().getByRole("button", { name: "Confirm" }).click();
}

test("messages: automatic messages and quiet hours are saved per country", async ({ page }) => {
  await session(page);
  await page.goto("/messages");
  await expect(page.getByRole("heading", { name: "Messages", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Automatic messages" }).click();
  await expect(page).toHaveURL(/tab=auto/);
  await expect(page.getByLabel("Automatic messages").getByText("We miss you", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Limits and quiet hours" }).click();
  await expect(page).toHaveURL(/tab=rules/);
  await expect(page.getByRole("switch", { name: /Quiet hours/ })).toBeChecked();
});

test("messages: a campaign gets an audience group that is kept after reload", async ({ page }) => {
  await session(page);
  await page.goto("/messages");
  await page.getByRole("button", { name: "New campaign" }).click();
  await page.getByLabel("Swedish text").fill("Hej");
  await page.getByLabel("English text").fill("Hello");
  await page.getByRole("button", { name: "Save campaign" }).click();
  await confirm(page);
  await expect(page.getByText("save recorded in simulation.")).toBeVisible();
  await page.getByLabel("Audience group").selectOption("top");
  await page.getByRole("button", { name: "Save audience and languages" }).click();
  await expect(page.getByText("Audience and languages saved.")).toBeVisible();
  await page.reload();
  await page.getByLabel("Campaign", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByLabel("Audience group")).toHaveValue("top");
  await expect(page.getByLabel("Campaign results")).toContainText("Top riders");
});

test("content: places and an uploaded image are saved apart from the text, and versions compare", async ({ page }) => {
  await session(page);
  await page.goto("/content");
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "All slots" }).getByRole("button", { name: /Help pages/ }).click();
  await expect(page.getByLabel("Content slot")).toHaveValue("help");
  await page.getByLabel("Upload image").setInputFiles({ name: "help.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") });
  await expect(page.getByText("help.png")).toBeVisible();
  await page.getByRole("radiogroup", { name: "Image fit" }).getByText("Fit").click();
  await page.getByLabel("Tunisia").uncheck();
  await page.getByRole("button", { name: "Save image and places" }).click();
  await confirm(page);
  await expect(page.getByText("help: image, places and app update saved.")).toBeVisible();
  await page.reload();
  await page.getByLabel("Content slot").selectOption("help");
  await expect(page.getByText("help.png")).toBeVisible();
  await expect(page.getByLabel("Tunisia")).not.toBeChecked();
  await expect(page.getByText("Nothing published yet to compare with.")).toBeVisible();
  await page.getByLabel("Content slot").selectOption("app-versions");
  await expect(page.getByRole("switch", { name: "Force update on iPhone on" })).toBeVisible();
});

test("promotions: one list of every promotion with budget, and a voucher code can be made", async ({ page }) => {
  await session(page);
  await page.goto("/promotions?country=SE");
  await expect(page.getByRole("heading", { name: "Promotions", level: 2 })).toBeVisible();
  const list = page.getByLabel("Promotions", { exact: true });
  await expect(list).toContainText("Welcome to Movera");
  await expect(list).toContainText("AUTUMN15");
  await expect(list).toContainText("Invite a friend");
  await page.getByRole("group", { name: "Promotion kind" }).getByRole("button", { name: /Voucher codes/ }).click();
  await expect(list).not.toContainText("Welcome to Movera");
  await page.getByRole("tab", { name: "Voucher codes" }).click();
  await page.getByRole("button", { name: "New voucher" }).click();
  await page.getByLabel("Voucher code", { exact: true }).fill("autumn15");
  await expect(page.getByText("That code is already used.")).toBeVisible();
  await page.getByLabel("Voucher code", { exact: true }).fill("winter20");
  await page.getByLabel("Voucher title").fill("Winter rides");
  await page.getByRole("button", { name: "Save voucher" }).click();
  await confirm(page);
  await expect(page.getByText("Voucher WINTER20 saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Voucher codes", { exact: true }).getByText("WINTER20")).toBeVisible();
  await page.getByRole("tab", { name: "Growth rules" }).click();
  await expect(page.getByRole("button", { name: "New growth rule" })).toBeVisible();
});

test("promotions: invite rewards and stop at budget can be turned off", async ({ page }) => {
  await session(page);
  await page.goto("/promotions?country=SE&tab=referral");
  await page.getByRole("switch", { name: "Invite a friend on" }).uncheck();
  await page.getByRole("button", { name: "Save invite rewards" }).click();
  await confirm(page);
  await expect(page.getByText("Invite rewards saved.")).toBeVisible();
  await page.getByRole("tab", { name: "All promotions" }).click();
  await expect(page.getByLabel("Promotions", { exact: true }).locator(".gr-hub-row.referral")).toContainText("Paused");
  await page.getByRole("button", { name: "Turn off" }).click();
  await confirm(page);
  await expect(page.getByText("Promotions no longer stop at their budget.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Turn on" })).toBeVisible();
});

test("reviews: filters, ratings per person and rules", async ({ page }) => {
  await session(page);
  await page.goto("/reviews?country=SE");
  await expect(page.getByRole("heading", { name: "Reviews", level: 2 })).toBeVisible();
  const list = page.getByLabel("Reviews", { exact: true });
  await expect(list.locator(".gr-review").first()).toBeVisible();
  await page.getByLabel("Stars", { exact: true }).selectOption("low");
  for (const label of await list.locator(".gr-stars").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))) expect(label).toMatch(/^[12] of 5/);
  await page.getByLabel("Stars", { exact: true }).selectOption("all");
  await page.getByLabel("Only hidden").check();
  await expect(list).toContainText("Hidden by word list");
  await page.getByRole("tab", { name: "Ratings per person" }).click();
  await expect(page.getByRole("table", { name: "Driver ratings" })).toBeVisible();
  await page.getByRole("tab", { name: "Rules" }).click();
  await page.getByRole("switch", { name: "Block on" }).check();
  await page.getByRole("button", { name: "Save review rules" }).click();
  await confirm(page);
  await expect(page.getByText("Review rules saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Block on" })).toBeChecked();
});

test("growth pages fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await session(page);
  for (const path of ["/messages", "/content", "/promotions", "/reviews"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), path).toBe(true);
  }
});
