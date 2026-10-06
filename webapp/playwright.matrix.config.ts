import base from "./playwright.config";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  ...base,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // CI has no GPU. Run under Xvfb with Mesa so WebGL map coverage is real.
        headless: false,
        launchOptions: { firefoxUserPrefs: { "webgl.force-enabled": true, "webgl.enable-webgl2": true } },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  use: { ...base.use, screenshot: "only-on-failure", trace: "retain-on-failure" },
});
