import { expect, test, devices, type Page } from "@playwright/test";

// Drawing on the map with a finger, on a phone.
test.use({ ...devices["iPhone 13"], browserName: "chromium" });

async function session(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("movera-admin-session", "nora");
    localStorage.setItem("movera-admin-activity", String(Date.now()));
  });
}

async function ready(page: Page) {
  await page.waitForFunction(() => (window as { __moveraMap?: unknown }).__moveraMap);
  await page.waitForTimeout(1200);
  await page.locator(".live-map").scrollIntoViewIfNeeded();
}

/** Tap a spot on the map, given as a share of its width and height. */
async function tap(page: Page, fx: number, fy: number) {
  const box = (await page.locator(".live-map").boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(350);
}

async function drag(page: Page, points: [number, number][]) {
  const box = (await page.locator(".live-map").boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const at = ([fx, fy]: [number, number]) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(points[0]!)] });
  for (const point of points.slice(1)) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at(point)] });
    await page.waitForTimeout(60);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
}

test("bonus areas: rectangle, circle, shape and free hand with a finger", async ({ page }) => {
  test.setTimeout(60_000);
  await session(page);
  await page.goto("/drivers?view=bonuses");
  await page.getByRole("button", { name: /New area bonus/ }).click();
  await ready(page);
  const tools = page.getByRole("toolbar", { name: "Bonus drawing tools" });
  const areas = page.getByRole("list", { name: "Bonus areas" });

  await tools.getByRole("button", { name: "Rectangle" }).tap();
  await expect(page.getByRole("group", { name: "Drawing" })).toContainText("Tap one corner.");
  await tap(page, 0.3, 0.3);
  await expect(page.getByRole("group", { name: "Drawing" })).toContainText("Now tap the opposite corner.");
  await tap(page, 0.6, 0.5);
  await expect(areas.getByLabel("Area 1 name")).toBeVisible();

  await tools.getByRole("button", { name: "Circle" }).tap();
  await tap(page, 0.5, 0.4);
  await tap(page, 0.65, 0.4);
  await expect(areas.getByLabel("Area 2 name")).toBeVisible();

  await tools.getByRole("button", { name: "Draw shape" }).tap();
  await tap(page, 0.3, 0.3);
  await tap(page, 0.7, 0.3);
  await expect(page.getByRole("button", { name: "Finish" })).toBeDisabled();
  await tap(page, 0.6, 0.55);
  await page.getByRole("button", { name: "Undo point" }).tap();
  await tap(page, 0.55, 0.58);
  await page.getByRole("button", { name: "Finish" }).tap();
  await expect(areas.getByLabel("Area 3 name")).toBeVisible();

  await tools.getByRole("button", { name: "Free hand" }).tap();
  await drag(page, [[0.2, 0.3], [0.5, 0.3], [0.7, 0.45], [0.5, 0.6], [0.2, 0.55], [0.18, 0.35]]);
  await expect(areas.getByLabel("Area 4 name")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a new zone drawn with a finger, closed by tapping the first point", async ({ page }) => {
  test.setTimeout(60_000);
  await session(page);
  await page.goto("/zones");
  await ready(page);
  await page.getByRole("article", { name: "Göteborg zones" }).getByRole("button", { name: "New zone in Göteborg" }).tap();
  const wizard = page.getByLabel("New zone", { exact: true });
  await wizard.getByLabel("Zone name").fill("Centrum");
  await wizard.getByRole("button", { name: "Next: the shape" }).tap();
  await wizard.getByRole("radio", { name: /Draw shape/ }).tap();
  await ready(page);
  await tap(page, 0.3, 0.3);
  await tap(page, 0.6, 0.3);
  await tap(page, 0.55, 0.55);
  await tap(page, 0.3, 0.3);
  await expect(wizard.getByLabel("Shape", { exact: true })).toContainText("km²");
  await wizard.getByRole("button", { name: "Next: check and save" }).tap();
  await expect(wizard.getByLabel("Live checks")).toBeVisible();
});
