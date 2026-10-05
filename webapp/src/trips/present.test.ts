import { createSeed } from "../api/seed.ts";
import { TRIP_STATUSES } from "../domain/contract.ts";
import { cancelBlock, defaultDispatch, dispatchError, fareBreakdown, liveMarkers, offersFor, paymentOf, pinVerified, refundBlock, stopsOf, timelineOf } from "./present.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = createSeed();
assert(seed.trips.length === 600, "present reads 600 trips");
assert(new Set(seed.trips.map((trip) => trip.status)).size === 18, "all 18 statuses are seeded");
const searching = seed.trips.find((trip) => trip.id === "T0004");
const completed = seed.trips.find((trip) => trip.id === "T0012");
assert(searching && !cancelBlock(searching.status), "searching can be cancelled");
assert(completed && cancelBlock(completed.status)?.includes("completed"), "completed cannot be cancelled");
assert(pinVerified("T0001") === "Yes" && pinVerified("T0002") === "No", "pin is yes or no, never a code");
assert(!pinVerified("T0001").match(/\d{4}/), "pin text has no code");
const stops = stopsOf(searching!);
assert(stops.length >= 2 && stops.length <= 5, "route has pickup, up to 3 stops, and drop-off");
assert(stops.filter((stop) => stop.kind === "stop").length <= 3, "at most 3 intermediate stops");
const line = timelineOf(completed!);
assert(line.length === TRIP_STATUSES.indexOf("completed") + 1, "timeline includes every status up to now");
assert(fareBreakdown(searching!).ruleVersion.startsWith("price-"), "fare names a rule version");
const rules = defaultDispatch();
assert(rules.length === 11, "dispatch for every seeded zone including both airports");
assert(rules.every((rule) => rule.offerSeconds === 8.5 && rule.nextTripKm === 30), "today's offer time and next-trip radius");
assert(dispatchError({ ...rules[0]!, offerSeconds: 0 })?.includes("Offer"), "offer time is validated");
const markers = liveMarkers(seed.drivers, seed.trips);
assert(markers.some((marker) => marker.kind === "driver" && marker.stale), "a driver position is stale");
assert(markers.some((marker) => marker.kind === "queue"), "airport queue is on the live map");
assert(markers.some((marker) => marker.kind === "boost"), "boosts are on the live map");
assert(markers.some((marker) => marker.kind === "request"), "open requests are on the live map");
assert(offersFor(searching!, seed.drivers).length > 0, "a searching trip has an eligible driver");
assert(refundBlock("captured") === null && refundBlock("pending") !== null, "refund only after capture");
assert(paymentOf(seed.payments[0]!) , "payment state resolves");

console.log("present ok");
