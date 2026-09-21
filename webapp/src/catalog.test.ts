import {
  DEDICATED_PAGE_IDS,
  PAGE_CATALOG,
  calculateFare,
  formatUsd,
  isDedicatedPage,
} from "./data/catalog.ts";
import { ADMIN_PAGES } from "./nav.ts";

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

assert(formatUsd(calculateFare("economy", 0, 0)) === "$8.00", "economy min fare");
assert(formatUsd(calculateFare("economy", 10, 20)) === "$25.00", "economy 10km 20min");
assert(formatUsd(calculateFare("comfort", 5, 10)) === "$20.70", "comfort rate");
assert(formatUsd(calculateFare("premium", 2, 5)) === "$20.00", "premium min fare");
assert(formatUsd(calculateFare("xl", 8, 15)) === "$37.10", "xl rate");

console.log("admin catalog ok");
