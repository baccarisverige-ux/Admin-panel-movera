import {
  DEDICATED_PAGE_IDS,
  PAGE_CATALOG,
  calculateFare,
  formatSek,
  isDedicatedPage,
} from "./data/catalog.ts";
import { ADMIN_PAGES } from "./nav.ts";
import { readFileSync } from "node:fs";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(ADMIN_PAGES.length === 22, "expected 22 admin screens");
assert(Object.keys(PAGE_CATALOG).length === 22, "catalog covers 22 screens");
assert(DEDICATED_PAGE_IDS.length === 3, "dashboard, zones and pricing are dedicated");

for (const page of ADMIN_PAGES) {
  const entry = PAGE_CATALOG[page.id];
  assert(entry, `missing catalog for ${page.id}`);
  assert(entry.title.length > 0, `missing title for ${page.id}`);
  assert(entry.subtitle.length > 0, `missing subtitle for ${page.id}`);
  assert(!/A3 will port/i.test(entry.title + entry.subtitle), `placeholder copy on ${page.id}`);

  const hasBody =
    isDedicatedPage(page.id) ||
    Boolean(entry.custom) ||
    Boolean(entry.stats && entry.stats.length > 0) ||
    Boolean(entry.cards && entry.cards.length > 0) ||
    Boolean(entry.table && entry.table.rows.length > 0);
  assert(hasBody, `empty placeholder for ${page.id}`);
}

for (const id of DEDICATED_PAGE_IDS) {
  assert(PAGE_CATALOG[id], `dedicated page ${id} missing catalog content`);
}

assert(formatSek(calculateFare("economy", 0, 0)) === "49,00 kr", "economy min fare");
assert(formatSek(calculateFare("economy", 10, 20)) === "229,00 kr", "economy 10km 20min");
assert(formatSek(calculateFare("comfort", 5, 10)) === "164,00 kr", "comfort rate");
assert(formatSek(calculateFare("premium", 2, 5)) === "138,00 kr", "premium min fare");
assert(formatSek(calculateFare("xl", 8, 15)) === "283,00 kr", "xl rate");

const catalogSrc = readFileSync(new URL("./data/catalog.ts", import.meta.url), "utf8");
assert(!/RideShare|New York|USD|Downtown|Uptown|Midtown/.test(catalogSrc), "no US prototype copy");
assert(!/\$\d/.test(catalogSrc), "no dollar amounts");

console.log("admin catalog ok");
