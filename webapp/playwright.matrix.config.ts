import base from "./playwright.config";
import {defineConfig,devices} from "@playwright/test";
export default defineConfig({...base,projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}},{name:"firefox",use:{...devices["Desktop Firefox"]}},{name:"webkit",use:{...devices["Desktop Safari"]}}],reporter:[["list"],["html",{open:"never"}]],use:{...base.use,screenshot:"only-on-failure",trace:"retain-on-failure"}});
