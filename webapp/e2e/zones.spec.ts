import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email = "nora@movera.se") {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("movera");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Zones" })).toBeVisible();
}

async function confirm(page: Page) {
  await page.locator(".modal.open").getByRole("button", { name: "Confirm" }).click();
}

async function mapGeneration(page: Page) {
  return page.evaluate(() => (window as { __moveraMap?: { generation: number } }).__moveraMap?.generation ?? 0);
}

async function waitForMapMove(page: Page, previous: number) {
  await page.waitForFunction((generation) => {
    const map = (window as { __moveraMap?: { generation: number } }).__moveraMap;
    return !!map && map.generation > generation;
  }, previous);
}

async function mapClick(page: Page, lat: number, lng: number) {
  const host = page.locator(".live-map");
  await host.scrollIntoViewIfNeeded();
  const box = await host.boundingBox();
  if (!box) throw new Error("map missing");
  const point = await page.evaluate(({ lat, lng }) => {
    const map = (window as { __moveraMap?: { project: (lat: number, lng: number) => { x: number; y: number } } }).__moveraMap;
    if (!map) throw new Error("map not ready");
    return map.project(lat, lng);
  }, { lat, lng });
  await page.mouse.click(box.x + point.x, box.y + point.y);
}

async function finishDrawing(page: Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    canvas?.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  });
}

test("zones map lists nine types and terra draw", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.getByRole("link", { name: "Zones" }).click();
  await expect(page).toHaveURL(/\/zones$/);
  await expect(page.getByRole("heading", { level: 3, name: "Stockholm zones" })).toBeVisible();
  await expect(page.getByText("Terra Draw")).toBeVisible();
  await expect(page.getByRole("button", { name: "Draw circle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Freehand" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit points" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cut hole" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export GeoJSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import KML" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search address" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Online drivers" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Trips" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Airport queues" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Open requests" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Pickup points" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Demand heatmap · last hour" })).not.toBeChecked();
  await expect(page.locator("[data-impact='zones']")).toContainText("Online drivers inside");
  await expect(page.getByRole("list", { name: "Versions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Norrmalm" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Arlanda" })).toBeVisible();
  await expect(page.getByText("Z001")).toHaveCount(0);
  const options = await page.locator("#zone-picker option").evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
  expect(options.some((text) => text.includes("Service area"))).toBe(true);
  expect(options.some((text) => text.includes("Operating zone"))).toBe(true);
  expect(options.some((text) => text.includes("Airport"))).toBe(true);
  expect(options.some((text) => text.includes("Boost"))).toBe(true);
  expect(options.some((text) => text.includes("Event"))).toBe(true);
  expect(options.some((text) => text.includes("No pickup"))).toBe(true);
  expect(options.some((text) => text.includes("Restricted"))).toBe(true);
  expect(options.some((text) => text.includes("Fleet territory"))).toBe(true);
  expect(options.some((text) => text.includes("Pickup point"))).toBe(true);
  await expect(page.getByText(/^Inside:/)).toBeVisible();
  await page.waitForFunction(() => (window as { __moveraMap?: { generation: number } }).__moveraMap);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("A05 draw Östermalm, cut a hole, add Arlanda pickups, review, publish, reload, roll back", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.getByRole("link", { name: "Zones" }).click();
  await page.waitForFunction(() => (window as { __moveraMap?: { generation: number } }).__moveraMap);
  await expect(page.locator("[data-impact='zones']")).toContainText("km²");
  await expect(page.locator("[data-impact='zones']")).toContainText("Active trips");
  await expect(page.locator("[data-impact='zones']")).toContainText("Future reservations");
  const before = await mapGeneration(page);
  await page.locator("#zone-picker").selectOption("op-ostermalm");
  await waitForMapMove(page, before);

  await page.getByRole("button", { name: "Draw polygon" }).click();
  await page.waitForTimeout(400);
  const outer: [number, number][] = [
    [59.34, 18.13],
    [59.34, 18.17],
    [59.37, 18.17],
    [59.37, 18.13],
  ];
  for (const [lat, lng] of outer) await mapClick(page, lat, lng);
  await mapClick(page, outer[0][0], outer[0][1]);
  await finishDrawing(page);
  await expect(page.getByText("Updated Östermalm")).toBeVisible();

  await page.getByRole("button", { name: "Cut hole" }).click();
  await page.waitForTimeout(500);
  const hole: [number, number][] = [
    [59.348, 18.142],
    [59.348, 18.158],
    [59.362, 18.158],
    [59.362, 18.142],
  ];
  for (const [lat, lng] of hole) await mapClick(page, lat, lng);
  await mapClick(page, hole[0][0], hole[0][1]);
  await finishDrawing(page);
  await expect(page.locator("[data-holes='1']")).toBeVisible();

  await page.getByRole("cell", { name: "Arlanda" }).click();
  await expect(page).toHaveURL(/air-arlanda/);
  await page.getByRole("tab", { name: "Pickup points" }).click();
  await expect(page.getByLabel("Pickup name")).toBeVisible();
  await page.getByLabel("Pickup name").fill("Terminal 2 door");
  await page.getByLabel("Pickup latitude").fill("59.651");
  await page.getByLabel("Pickup longitude").fill("17.930");
  await page.getByLabel("Pickup instructions").fill("Door 2");
  await page.getByLabel("Pickup photo URL").fill("https://example.invalid/t2.jpg");
  await page.getByRole("button", { name: "Add pickup" }).click();
  await expect(page.getByText("Terminal 2 door")).toBeVisible();
  await page.getByLabel("Pickup name").fill("Terminal 5 door");
  await page.getByLabel("Pickup latitude").fill("59.649");
  await page.getByLabel("Pickup longitude").fill("17.922");
  await page.getByLabel("Pickup instructions").fill("Door 4");
  await page.getByLabel("Pickup photo URL").fill("https://example.invalid/t5.jpg");
  await page.getByRole("button", { name: "Add pickup" }).click();
  await expect(page.getByText("Terminal 5 door")).toBeVisible();
  await page.getByRole("checkbox", { name: "Only these pickup points" }).check();

  await page.getByRole("link", { name: "Zones", exact: true }).click();
  await page.getByRole("button", { name: "Send for review" }).click();
  await confirm(page);
  await expect(page.getByText("In review. A different agent can publish.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Lena Berg · ops" }).click();
  await expect(page.getByLabel("Email")).toHaveValue("lena@movera.se");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Zones" })).toBeVisible();
  await page.getByRole("link", { name: "Zones" }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await confirm(page);
  await expect(page.getByText("Published version 2.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Versions: 2")).toBeVisible();
  await expect(page.locator("[data-holes='1']")).toBeVisible();
  await expect(page.locator("[data-pickups='2']")).toBeVisible();
  await page.getByRole("button", { name: "Roll back" }).click();
  await confirm(page);
  await expect(page.getByText("Rolled back to the previous published zones.")).toBeVisible();
  await expect(page.getByText("Versions: 3")).toBeVisible();
  await expect(page.locator("[data-holes='0']")).toBeVisible();
  await expect(page.locator("[data-pickups='0']")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("norrmalm row opens the zone with one Greater Stockholm area", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Zones" }).click();
  const impact = page.locator("[data-impact='zones']");
  await expect(impact).toContainText(/Greater Stockholm: \d+ km²/);
  const text = await impact.innerText();
  expect(text.match(/km²/g)?.length).toBe(1);
  const row = page.getByRole("row", { name: /Norrmalm/ });
  await expect(row).toContainText("Published");
  await page.getByRole("link", { name: "Norrmalm", exact: true }).click();
  await expect(page).toHaveURL(/\/zones\/op-norrmalm$/);
  await expect(page.locator("[data-zone-status]")).toContainText("Status: Published");
  await page.getByRole("tab", { name: "Dispatch" }).click();
  await expect(page.getByLabel("Offer seconds")).toBeVisible();
  await page.getByRole("tab", { name: "Pricing" }).click();
  await expect(page.getByLabel("Zone fee öre")).toBeVisible();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Norrmalm");
});
