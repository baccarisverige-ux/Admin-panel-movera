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

test("R8 live quick dispatch offers an open request to an eligible vehicle-backed driver", async ({ page }) => {
  await session(page);
  await page.goto("/live");
  await expect(page.getByRole("heading", { level: 2, name: "Live map" })).toBeVisible();

  const request = page.getByRole("list", { name: "Open requests" }).getByRole("button", { name: /Open T0003/ });
  await request.click();
  await expect(page.getByTestId("quick-dispatch")).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer request" })).toBeEnabled();

  await page.getByRole("button", { name: "Offer request" }).click();
  await confirm(page);
  await expect(page.getByText(/T0003 offered to D\d+/)).toBeVisible();

  await page.goto("/trips/T0003");
  await expect(page.getByRole("heading", { level: 2, name: "Trip T0003" })).toBeVisible();
  await expect(page.getByText("Offered", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Driver .*D\d+/)).toBeVisible();
});

test("R8 waiting and bounded fare corrections persist and are audited", async ({ page }) => {
  await session(page);
  await page.goto("/trips/T0008");
  await expect(page.getByRole("heading", { level: 2, name: "Trip T0008" })).toBeVisible();
  await expect(page.getByTestId("waiting-block")).toContainText("Waiting time can be corrected");
  await expect(page.getByTestId("adjust-block")).toContainText("±15%");

  await page.getByLabel("Waiting minutes").fill("7");
  await page.getByRole("button", { name: "Save waiting time" }).click();
  await confirm(page);
  await expect(page.getByTestId("trip-fare")).toContainText("Waiting time charged: 7 min");

  await page.getByLabel("Fare adjustment percent").fill("12");
  await page.getByRole("button", { name: "Apply fare adjustment" }).click();
  await confirm(page);
  await expect(page.getByTestId("trip-fare")).toContainText("Charged 62,72 kr");

  await expect(page.getByRole("list", { name: "Trip intervention audit" })).toContainText("admin.trip.waiting");
  await expect(page.getByRole("list", { name: "Trip intervention audit" })).toContainText("admin.trip.adjust");

  await page.reload();
  await expect(page.getByTestId("trip-fare")).toContainText("Waiting time charged: 7 min");
  await expect(page.getByTestId("trip-fare")).toContainText("Charged 62,72 kr");
});

test("R8 trip actions follow lifecycle state", async ({ page }) => {
  await session(page);

  await page.goto("/trips/T0004");
  await expect(page.getByRole("button", { name: "Cancel trip" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Offer to driver" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reassign" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Apply fare adjustment" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save waiting time" })).toBeDisabled();

  await page.goto("/trips/T0044");
  await expect(page.getByRole("button", { name: "Offer to driver" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reassign" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Apply fare adjustment" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Save waiting time" })).toBeEnabled();

  await page.goto("/trips/T0048");
  await expect(page.getByRole("button", { name: "Cancel trip" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reassign" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Apply fare adjustment" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Refund" })).toBeEnabled();
});

test("R8 dispatch rules are versioned and restorable", async ({ page }) => {
  await session(page);
  await page.goto("/live");

  await page.getByLabel("Norrmalm offer time").fill("9.5");
  await page.getByRole("button", { name: "Save dispatch rules" }).click();
  await expect(page.getByText("Saved in demo.")).toBeVisible();
  await expect(page.getByTestId("dispatch-rules")).toContainText("Revision 2");

  await page.getByLabel("Norrmalm offer time").fill("10.5");
  await page.getByRole("button", { name: "Save dispatch rules" }).click();
  await expect(page.getByText("Saved in demo.")).toBeVisible();
  await expect(page.getByTestId("dispatch-rules")).toContainText("Revision 3");

  const versionTwo = page.getByRole("list", { name: "Dispatch history" }).getByRole("listitem").filter({ hasText: "Revision 2" });
  await versionTwo.getByRole("button", { name: "restore" }).click();
  await confirm(page);
  await expect(page.getByTestId("dispatch-rules")).toContainText("Revision 4");
  await expect(page.getByLabel("Norrmalm offer time")).toHaveValue("9.5");
});

test("R8 scoped dispatcher can edit only assigned dispatch zones", async ({ page }) => {
  await session(page, "daniel");
  await page.goto("/live");

  await expect(page.getByLabel("Norrmalm offer time")).toBeEnabled();
  await expect(page.getByLabel("Kista offer time")).toBeDisabled();

  await page.getByLabel("Norrmalm offer time").fill("9");
  await page.getByRole("button", { name: "Save Norrmalm" }).click();
  await confirm(page);
  await expect(page.getByTestId("dispatch-rules")).toContainText("Revision 2");
});

test("R8 trip page remains usable at 390px", async ({ page }) => {
  await session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/trips/T0008");
  await expect(page.getByRole("heading", { level: 2, name: "Trip T0008" })).toBeVisible();
  await expect(page.getByLabel("Waiting minutes")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
