import { calculateFare, formatSek } from "./data/catalog.ts";
import { readFileSync } from "node:fs";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(formatSek(calculateFare("economy", 0, 0)) === "49,00 kr", "economy min fare");
assert(formatSek(calculateFare("economy", 10, 20)) === "229,00 kr", "economy 10km 20min");
assert(formatSek(calculateFare("comfort", 5, 10)) === "164,00 kr", "comfort rate");
assert(formatSek(calculateFare("premium", 2, 5)) === "138,00 kr", "premium min fare");
assert(formatSek(calculateFare("xl", 8, 15)) === "283,00 kr", "xl rate");

const catalogSrc = readFileSync(new URL("./data/catalog.ts", import.meta.url), "utf8");
assert(!/RideShare|New York|USD|Downtown|Uptown|Midtown|NYC|Chicago|LA Metro|John Smith|2023-/.test(catalogSrc), "no US prototype copy");
assert(!/\$\d/.test(catalogSrc), "no dollar amounts");

console.log("admin catalog ok");
