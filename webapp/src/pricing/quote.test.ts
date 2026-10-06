import { calculateFare, formatSek } from "../data/catalog.ts";
import { defaultPricingBook, saveBoostSchedule } from "./book.ts";
import { quotePricing, quoteRide, RIDE_OPTIONS } from "./quote.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const direct = formatSek(calculateFare("economy", 10, 20));
const preview = quoteRide("economy", 10, 20);
assert(preview.label === direct, "legacy quote matches the rider formula");
assert(preview.ruleVersion === "price-3", "legacy rule version");
assert(quoteRide("electric", 0, 0).label === formatSek(calculateFare("economy", 0, 0)), "legacy unpriced category uses Movera");
assert(RIDE_OPTIONS.length === 5, "five ride options");

let book = defaultPricingBook();
let full = quotePricing(book, {
  zoneId: "Z001",
  category: "economy",
  distanceKm: 10,
  durationMin: 20,
  whenIso: "2026-10-06T14:00:00.000Z",
  adjustmentPct: 100,
  boostMode: "none",
  waitingMin: 0,
  reserved: false,
  airport: false,
  event: false,
  options: [],
});
assert(full.totalLabel === "229,00 kr", "full quote keeps the default Movera quote");
assert(full.baseKr === 229 && full.fareBeforeFeesKr === 229, "base fare is transparent");

full = quotePricing(book, {
  zoneId: "Z001",
  category: "economy",
  distanceKm: 10,
  durationMin: 20,
  whenIso: "2026-10-06T14:00:00.000Z",
  adjustmentPct: 110,
  boostMode: "manual",
  waitingMin: 2,
  reserved: true,
  airport: true,
  event: true,
  options: ["pet", "baby_seat"],
});
assert(full.adjustmentPct === 110, "rider adjustment is applied");
assert(full.boostMultiplier === 1.5, "manual boost comes from the zone price book");
assert(full.waitingKr === 12, "waiting fee uses the zone setting");
assert(full.reservationKr === 25, "reservation fee is included");
assert(full.optionsKr === 50, "enabled ride option fees are included");

const scheduled = saveBoostSchedule(book, {
  id: "Z001-evening",
  zoneId: "Z001",
  multiplier: 1.7,
  startsAt: "2026-10-06T17:00:00.000Z",
  endsAt: "2026-10-06T22:00:00.000Z",
  enabled: true,
}, "nora", "Evening", "2026-10-06T10:00:00.000Z");
book = scheduled.book;
full = quotePricing(book, {
  zoneId: "Z001",
  category: "economy",
  distanceKm: 10,
  durationMin: 20,
  whenIso: "2026-10-06T19:00:00.000Z",
  adjustmentPct: 100,
  boostMode: "scheduled",
  waitingMin: 0,
  reserved: false,
  airport: false,
  event: false,
  options: [],
});
assert(full.boostMultiplier === 1.7, "active scheduled boost overrides the scheduled default");
assert(full.activeScheduleId === "Z001-evening", "quote names the active schedule");

const disabled = structuredClone(book);
disabled.book.zones.find((zone) => zone.zoneId === "Z001")!.enabledCategories.premium = false;
full = quotePricing(disabled, {
  zoneId: "Z001",
  category: "premium",
  distanceKm: 10,
  durationMin: 20,
  whenIso: "2026-10-06T19:00:00.000Z",
  adjustmentPct: 100,
  boostMode: "none",
  waitingMin: 0,
  reserved: false,
  airport: false,
  event: false,
  options: [],
});
assert(full.error?.includes("disabled"), "disabled category cannot quote");

console.log("quote ok");
