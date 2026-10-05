import { CATEGORIES, TRIP_STATUSES, formatOre, kronorToOre, tripStatusSchema } from "./domain/contract.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(TRIP_STATUSES.length === 18, "18 trip statuses");
assert(new Set(TRIP_STATUSES).size === 18, "trip statuses are unique");
assert(tripStatusSchema.parse("cancelled_by_admin") === "cancelled_by_admin", "admin cancel status");
assert(CATEGORIES.length === 7, "7 categories");
assert(CATEGORIES[0]?.label === "Movera", "economy alias is Movera");
assert(kronorToOre(12.5) === 1250, "öre conversion");
assert(formatOre(20000) === "200,00 kr", "format öre");
assert(formatOre(-50) === "-0,50 kr", "negative öre");

console.log("domain contract ok");
