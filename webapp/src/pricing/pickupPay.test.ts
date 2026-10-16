import { completePickupPay, defaultPickupPay, diffPickupPay, offerGetsPickupPay, pickupPayFor, pickupSplit, validatePickupPay, type PickupRate } from "./pickupPay.ts";
import { copyInto, emptyPricingStore, publishZones, quoteRide, undoLastPublish, validateZoneBook, zoneBook } from "./zonePricing.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
const AT = "2026-10-16T10:00:00.000Z";

// The spec example: Comfort 3 kr/km + 1 kr/min, 4.2 km / 9 min, no free part → 21,60 kr.
const comfort: PickupRate = { enabled: true, perKm: 3, perMin: 1, freeKmOn: false, freeKm: 1, freeMinOn: false, freeMin: 2 };
const plain = pickupPayFor(comfort, 4.2, 9);
assert(plain.kmPay === 12.6 && plain.minPay === 9 && plain.total === 21.6, `no free part gives 21.60, got ${plain.total}`);

// Free first km and first minutes each have their own switch.
assert(pickupPayFor({ ...comfort, freeKmOn: true, freeMinOn: true }, 4.2, 9).total === 16.6, "both free parts: 3.2 × 3 + 7 × 1 = 16.60");
assert(pickupPayFor({ ...comfort, freeKmOn: true }, 4.2, 9).total === 18.6, "free km only: 9.60 + 9 = 18.60");
assert(pickupPayFor({ ...comfort, freeMinOn: true }, 4.2, 9).total === 19.6, "free minutes only: 12.60 + 7 = 19.60");
assert(pickupPayFor({ ...comfort, freeKm: 5, freeKmOn: true }, 4.2, 9).kmPay === 0, "free km bigger than the drive pays 0 for km, never below 0");
assert(pickupPayFor({ ...comfort, freeKmOn: true, freeMinOn: true, freeKm: 10, freeMin: 20 }, 4.2, 9).total === 0, "never below 0");
assert(pickupPayFor({ ...comfort, enabled: false }, 4.2, 9).total === 0, "an off category pays nothing");
assert(pickupPayFor(undefined, 4.2, 9).total === 0, "an unknown category pays nothing");
assert(pickupPayFor(comfort, 60, 90).total === 270, "no cap");
assert(pickupPayFor(comfort, -3, Number.NaN).total === 0, "bad input pays 0");

// Who gets pickup pay.
const pay = defaultPickupPay(["economy", "comfort", "premium"]);
assert(offerGetsPickupPay(pay, "radar", "comfort") && offerGetsPickupPay(pay, "nextTrip", "comfort"), "default offers are paid");
assert(!offerGetsPickupPay(pay, "scheduled", "comfort"), "Scheduled-list reservations are never paid");
assert(!offerGetsPickupPay({ ...pay, offers: { ...pay.offers, assigned: false } }, "assigned", "comfort"), "an offer kind can be turned off");
assert(!offerGetsPickupPay({ ...pay, rates: { ...pay.rates, comfort: { ...pay.rates.comfort, enabled: false } } }, "radar", "comfort"), "a category can be turned off");
assert(pay.display === "total", "the offer card shows the total only by default");

// Paid from Movera's commission; the rider's price stays the same.
const split = pickupSplit(169, 126.75, 16.6);
assert(split.riderPays === 169 && split.driverGets === 143.35 && split.commission === 42.25 && split.moveraKeeps === 25.65, "driver gets fare + pickup, Movera keeps commission − pickup");

// Stored data fills in, validation and the change list work.
const filled = completePickupPay({ display: "breakdown", rates: { comfort: { ...comfort } } }, ["comfort", "pet"]);
assert(filled.display === "breakdown" && filled.rates.comfort.freeKmOn === false && filled.rates.pet.perKm === 3 && filled.offers.radar, "missing parts get defaults");
const cats = [{ id: "comfort", label: "Comfort" }];
assert(validatePickupPay({ ...filled, rates: { comfort: { ...comfort, perKm: -1 } } }, cats)[0]?.path === "pickup.comfort.perKm", "negative pickup rate is caught");
const lines = diffPickupPay(filled, { ...filled, display: "total", offers: { ...filled.offers, radar: false }, rates: { ...filled.rates, comfort: { ...comfort, perKm: 3.5 } } }, cats);
assert(lines.includes("Comfort · pickup per km 3 → 3.5") && lines.includes("Pickup pay for Radar trips turned off") && lines.includes("Offer card shows Total only"), `diff lines: ${lines.join(" | ")}`);

// Pickup pay lives in the zone book: publish, history and undo cover it.
const store = emptyPricingStore();
const book = zoneBook(store, "Z001");
assert(book.pickupPay.rates.comfort.perKm === 3 && book.pickupPay.rates.economy.perKm === 2.5, "Stockholm defaults");
assert(validateZoneBook(book, store.categories).length === 0, "defaults are valid");
assert(!("longPickupFee" in book.prices.economy), "the rider long pickup fee is gone");
const edit = structuredClone(book);
edit.pickupPay.rates.comfort.perKm = 3.5;
edit.pickupPay.offers.nextTrip = false;
const published = publishZones(store, { Z001: edit }, "nora", "Pickup pay", AT);
assert(!published.error && published.changes.includes("Norrmalm · Comfort · pickup per km 3 → 3.5"), `publish lists pickup changes: ${published.changes.join(" | ")}`);
assert(zoneBook(published.store, "Z001").pickupPay.offers.nextTrip === false, "published pickup pay is stored");
assert(zoneBook(undoLastPublish(published.store, "nora", AT).store, "Z001").pickupPay.rates.comfort.perKm === 3, "undo brings the old pickup pay back");
const quote = quoteRide(zoneBook(published.store, "Z001"), { categoryId: "comfort", km: 8, minutes: 18, waitMin: 0, stops: 0, stopWaitMin: 0, babySeats: 0, childSeats: 0, airportPickup: false, airportDropoff: false, reservation: false, surge: 1 });
assert(quote.total === quoteRide(book, { categoryId: "comfort", km: 8, minutes: 18, waitMin: 0, stops: 0, stopWaitMin: 0, babySeats: 0, childSeats: 0, airportPickup: false, airportDropoff: false, reservation: false, surge: 1 }).total, "pickup pay never changes the rider's price");
assert(quote.lines.every((line) => !/pickup/i.test(line.label)), "no pickup line on the rider's quote");

// Copying converts the money.
const paris = copyInto(zoneBook(published.store, "Z001"), zoneBook(store, "FR-PC"), ["pickup"]);
assert(paris.pickupPay.rates.comfort.perKm === 0.33 && paris.pickupPay.offers.nextTrip === false, `3.50 kr is 0.33 € in Paris, got ${paris.pickupPay.rates.comfort.perKm}`);
assert(zoneBook(store, "FR-PC").pickupPay.rates.comfort.perKm === 0.29, "Paris defaults are in euros");
console.log("pickup pay ok");
