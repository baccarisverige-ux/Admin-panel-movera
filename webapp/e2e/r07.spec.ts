import { expect, test, type Page } from "@playwright/test";

async function session(page: Page, agentId = "nora") {
  await page.addInitScript((id) => {
    localStorage.setItem("movera-admin-session", id);
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  }, agentId);
}

async function confirm(page: Page, target?: string) {
  const modal = page.locator(".modal.open");
  if (target) await modal.getByLabel(`Type ${target} to confirm`).fill(target);
  await modal.getByRole("button", { name: "Confirm" }).click();
}

test("R7 rider account wallet privacy promotion notes and sessions persist", async ({ page }) => {
  test.setTimeout(75_000);
  await session(page);
  await page.goto("/riders/R0001");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();

  await page.getByRole("button", { name: "Block" }).click();
  await confirm(page, "R0001");
  await expect(page.getByText("R0001 · blocked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unblock" })).toBeVisible();

  await page.getByRole("button", { name: "Unblock" }).click();
  await confirm(page, "R0001");
  await expect(page.getByText("R0001 · active")).toBeVisible();

  await page.getByRole("button", { name: "Sign out all sessions" }).click();
  await confirm(page);
  await expect(page.getByText("Signed out of every active rider session.")).toBeVisible();
  await expect(page.getByText(/Active sessions 0/)).toBeVisible();

  await page.getByRole("tab", { name: "Payments" }).click();
  await page.getByLabel("Credit amount (kr)").fill("125");
  await page.getByRole("button", { name: "Credit wallet" }).click();
  await confirm(page);
  await expect(page.getByText(/Credited 125,00 kr/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Rider wallet ledger" })).toContainText("125,00 kr");

  await page.getByRole("tab", { name: "Promotions" }).click();
  await page.getByLabel("Promotion code").fill("ARN120");
  await page.getByLabel("Label").fill("Airport 120");
  await page.getByRole("button", { name: "Apply promotion" }).click();
  await confirm(page);
  await expect(page.getByRole("list", { name: "Rider promotions" })).toContainText("ARN120");
  await expect(page.getByRole("list", { name: "Rider promotions" })).toContainText("active");

  await page.getByRole("tab", { name: "Notes" }).click();
  await page.getByLabel("Private internal note").fill("Call rider before airport pickup");
  await page.getByRole("button", { name: "Save private note" }).click();
  await confirm(page);
  await expect(page.getByText("Call rider before airport pickup")).toBeVisible();

  await page.getByRole("button", { name: "Advance privacy" }).click();
  await confirm(page, "R0001");
  await expect(page.getByText("Privacy request advanced.")).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Privacy processing/)).toBeVisible();
  await page.getByRole("tab", { name: "Payments" }).click();
  await expect(page.getByRole("list", { name: "Rider wallet ledger" })).toContainText("125,00 kr");
  await page.getByRole("tab", { name: "Promotions" }).click();
  await expect(page.getByRole("list", { name: "Rider promotions" })).toContainText("ARN120");
  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByText("Call rider before airport pickup")).toBeVisible();
});

test("R7 finance can open rider wallet without sensitive reveal permission", async ({ page }) => {
  await session(page, "astrid");
  await page.goto("/riders/R0001");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await page.getByRole("tab", { name: "Payments" }).click();
  await expect(page.getByRole("button", { name: "Credit wallet" })).toBeEnabled();
  await expect(page.getByText("Phone: restricted")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal" })).toHaveCount(0);
});

test("R7 rider detail remains usable at 390px", async ({ page }) => {
  await session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/riders/R0001");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await page.getByRole("tab", { name: "Payments" }).click();
  await expect(page.getByLabel("Credit amount (kr)")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
