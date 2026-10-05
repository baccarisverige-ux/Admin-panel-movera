import { defaultPriceBook, quoteZone, CATEGORY_INFO, RIDE_OPTION_INFO } from "./sets.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const book = defaultPriceBook();
const norrmalm = book.zones.find((zone) => zone.zoneId === "Z001");
const sodermalm = book.zones.find((zone) => zone.zoneId === "Z002");
assert(norrmalm && sodermalm, "both zones exist");
const before = quoteZone(norrmalm!, "economy", 10, 20);
assert(before.label === "229,00 kr", "default Movera quote");
assert(before.ruleVersion === "price-3", "untouched rule version");
const changed = {
  ...sodermalm!,
  version: 2,
  rates: { ...sodermalm!.rates, economy: { ...sodermalm!.rates.economy, perKm: 20 } },
};
assert(quoteZone(changed, "economy", 10, 20).label === "309,00 kr", "Södermalm per km changes the quote");
assert(quoteZone(changed, "economy", 10, 20).ruleVersion === "price-Z002-v2", "version follows the zone");
assert(quoteZone(norrmalm!, "economy", 10, 20).label === "229,00 kr", "Norrmalm stays");
assert(CATEGORY_INFO.length === 7, "seven categories");
assert(RIDE_OPTION_INFO.length === 5, "five options");

console.log("sets ok");
