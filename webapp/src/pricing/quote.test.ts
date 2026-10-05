import { calculateFare, formatSek } from "../data/catalog.ts";
import { quoteRide, RIDE_OPTIONS } from "./quote.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const direct = formatSek(calculateFare("economy", 10, 20));
const preview = quoteRide("economy", 10, 20);
assert(preview.label === direct, "quote matches the rider formula");
assert(preview.ruleVersion === "price-3", "rule version");
assert(quoteRide("electric", 0, 0).label === formatSek(calculateFare("economy", 0, 0)), "unpriced category uses Movera");
assert(RIDE_OPTIONS.length === 5, "five ride options");

console.log("quote ok");
