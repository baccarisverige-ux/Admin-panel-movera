import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    if (!sessionStorage.getItem("sp-test-session")) {
      localStorage.setItem("movera-admin-session", id);
      sessionStorage.setItem("sp-test-session", "1");
    }
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

async function confirm(page: Page) {
  await page.locator(".modal.open").last().getByRole("button", { name: "Confirm" }).click();
}

test("support: groups, topics, ready-made replies, and solved by a name with a rating", async ({ page }) => {
  await session(page);
  await page.goto("/support");
  await expect(page.getByRole("heading", { level: 2, name: "Support" })).toBeVisible();
  const groups = page.getByRole("navigation", { name: "Ticket groups" });
  await groups.getByRole("button", { name: /Nobody yet/ }).click();
  const ticket = page.getByRole("article", { name: /^Ticket S/ });
  await expect(ticket).toContainText("Answer within");
  await ticket.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByRole("status")).toContainText("Claimed for 3 days.");
  await groups.getByRole("button", { name: /All open/ }).click();
  await page.getByLabel("Ready-made reply").selectOption({ index: 1 });
  await expect(page.getByLabel("Message", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Send reply" }).click();
  await confirm(page);
  await expect(page.getByRole("list", { name: "Ticket messages" })).toContainText("nora:");
  const side = page.getByRole("complementary", { name: "About this ticket" });
  await expect(side.getByRole("button", { name: "Mark solved" })).toBeDisabled();
  await side.getByLabel("What did you do").fill("Refunded the difference on the trip");
  await side.getByRole("button", { name: "Mark solved" }).click();
  await expect(page.getByRole("status")).toContainText("Solved by Nora Lind.");
  await groups.getByRole("button", { name: /Solved/ }).click();
  await expect(side).toContainText("Solved by Nora Lind");
  await expect(side.getByLabel(/Rated \d of 5/)).toBeVisible();
  await page.goto("/support?view=team");
  await expect(page.getByRole("table", { name: "Support team" })).toContainText("Nora Lind");
});

test("support: move a ticket to another topic, open an incident, filter by language", async ({ page }) => {
  await session(page);
  await page.goto("/support");
  const ticket = page.getByRole("article", { name: /^Ticket S/ });
  await ticket.getByRole("button", { name: "Lost item" }).click();
  await expect(ticket.locator(".sp-topic").first()).toHaveText("Lost item");
  const side = page.getByRole("complementary", { name: "About this ticket" });
  await side.getByRole("button", { name: "Open an incident" }).click();
  await confirm(page);
  await expect(side.getByRole("link", { name: /Incident opened/ })).toBeVisible();
  await page.getByLabel("Language").selectOption("en");
  await expect(page.getByRole("complementary", { name: "Tickets" }).locator(".sp-ticket").first()).toContainText("EN");
});

test("support settings: time limits per topic, ratings off, a new ready-made reply", async ({ page }) => {
  await session(page);
  await page.goto("/support?view=settings");
  await page.getByLabel("Safety first answer").fill("2");
  await page.getByLabel("Ask for a rating after solving on").uncheck();
  await page.getByRole("button", { name: "Add a reply" }).click();
  const last = page.locator(".sp-templates li").last();
  await last.getByRole("textbox").first().fill("Driver on the way");
  await last.locator("textarea").fill("Hej! Föraren är på väg.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await confirm(page);
  await expect(page.getByText("Everything is saved")).toBeVisible();
  await page.goto("/support");
  await expect(page.getByLabel("Ready-made reply")).toContainText("Driver on the way");
});

test("support and chat fit a phone", async ({ page }) => {
  await session(page);
  await page.setViewportSize({ width: 390, height: 860 });
  for (const path of ["/support", "/chat", "/support?view=settings", "/support?view=team"]) {
    await page.goto(path);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(392);
  }
});
