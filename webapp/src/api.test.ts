import { readFileSync, readdirSync } from "node:fs";
import { createAdminApi, createHttpAdminApi } from "./api/create.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(
  (() => {
    try {
      createAdminApi({ PROD: true });
      return false;
    } catch (error) {
      return error instanceof Error && /refuses the simulation/.test(error.message);
    }
  })(),
  "production without demo flag refuses the fixture",
);

const demo = createAdminApi({ PROD: true, VITE_DATA: "demo" }, 0);
assert(demo.kind === "fixture" && demo.demo, "pages demo may use the fixture");
const ready = await demo.ready();
assert(ready.currency === "SEK" && ready.timeZone === "Europe/Stockholm", "demo ready meta");
const page = await demo.page("settings");
assert(page.custom?.kind === "settings" && page.custom.systemName === "Movera", "settings name");

const http = createHttpAdminApi();
assert(http.kind === "http" && http.demo === false, "http adapter");
await http.ready().then(
  () => {
    throw new Error("http adapter should reject");
  },
  (error: unknown) => {
    assert(error instanceof Error && /not connected/.test(error.message), "http error");
  },
);

const banned = /from ["'][^"']*data\/catalog["']|from ["'][^"']*api\/fixture["']/;
for (const dir of ["pages", "ui", "layout"]) {
  for (const file of readdirSync(new URL(`./${dir}/`, import.meta.url))) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
    const text = readFileSync(new URL(`./${dir}/${file}`, import.meta.url), "utf8");
    assert(!banned.test(text), `${dir}/${file} imports sample data directly`);
  }
}

console.log("admin api ok");
