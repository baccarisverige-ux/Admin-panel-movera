import { createSeed } from "../api/seed.ts";
import { TRIP_STATUSES } from "../domain/contract.ts";
import {
  adjustBlock,
  cancelBlock,
  defaultDispatch,
  dispatchError,
  fareBreakdown,
  liveMarkers,
  offerBlock,
  offersFor,
  paymentOf,
  pinVerified,
  reassignBlock,
  refundBlock,
  stopsOf,
  timelineOf,
  waitingBlock,
} from "./present.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = createSeed();
assert(seed.trips.filter((trip) => /^T0\d{3}$/.test(trip.id)).length === 600, "present reads 600 Stockholm trips");
assert(new Set(seed.trips.map((trip) => trip.status)).size === 18, "all 18 statuses are seeded");

const requested = seed.trips.find((trip) => trip.status === "requested")!;
const searching = seed.trips.find((trip) => trip.id === "T0004")!;
const arrived = seed.trips.find((trip) => trip.status === "arrived")!;
const completed = seed.trips.find((trip) => trip.id === "T0012")!;
const cancelledAdmin = seed.trips.find((trip) => trip.status === "cancelled_by_admin")!;

assert(!cancelBlock(searching.status), "searching can be cancelled");
assert(cancelBlock(completed.status)?.includes("completed"), "completed cannot be cancelled");
assert(offerBlock(requested.status) === null, "requested can be offered");
assert(offerBlock(arrived.status) !== null, "arrived cannot be newly offered");
assert(reassignBlock(arrived.status) === null, "arrived can be reassigned");
assert(reassignBlock(searching.status) !== null, "searching uses offer instead of reassign");
assert(adjustBlock(arrived.status) === null && adjustBlock(completed.status) !== null, "fare adjustment follows lifecycle");
assert(waitingBlock(arrived.status) === null && waitingBlock(searching.status) !== null, "waiting correction follows lifecycle");

assert(pinVerified("T0001") === "Yes" && pinVerified("T0002") === "No", "pin is yes or no, never a code");
assert(!pinVerified("T0001").match(/\d{4}/), "pin text has no code");

const stops = stopsOf(searching);
assert(stops.length >= 2 && stops.length <= 5, "route has pickup, up to 3 stops, and drop-off");
assert(stops.filter((stop) => stop.kind === "stop").length <= 3, "at most 3 intermediate stops");

const line = timelineOf(completed);
assert(line.length === TRIP_STATUSES.indexOf("completed") + 1, "completed timeline includes every active status up to completion");
const cancelledLine = timelineOf(cancelledAdmin);
assert(cancelledLine.at(-1)?.code === "cancelled_by_admin", "cancelled timeline ends at its real terminal state");
assert(!cancelledLine.some((event) => event.code === "cancelled_by_rider" || event.code === "cancelled_by_driver"), "cancelled timeline does not pass through other terminal states");

assert(fareBreakdown(searching).ruleVersion.startsWith("price-"), "fare names a rule version");
assert(fareBreakdown({ ...arrived, waitingMin: 9 }).waitingMin === 9, "admin waiting override drives fare presentation");

const rules = defaultDispatch();
assert(rules.length === 11, "dispatch for every seeded zone including both airports");
assert(rules.every((rule) => rule.offerSeconds === 8.5 && rule.nextTripKm === 30), "today's offer time and next-trip radius");
assert(dispatchError({ ...rules[0]!, offerSeconds: 0 })?.includes("Offer"), "offer time is validated");

const markers = liveMarkers(seed.drivers, seed.trips);
assert(markers.some((marker) => marker.kind === "driver" && marker.stale), "a driver position is stale");
assert(markers.some((marker) => marker.kind === "queue"), "airport queue is on the live map");
assert(markers.some((marker) => marker.kind === "boost"), "boosts are on the live map");
assert(markers.some((marker) => marker.kind === "request"), "open requests are on the live map");

const legacyOffers = offersFor(searching, seed.drivers);
assert(legacyOffers.length > 0, "legacy offer calculation has an eligible driver");
const vehicleAware = offersFor(searching, seed.drivers, seed.vehicles);
assert(vehicleAware.every((driver) => seed.vehicles.some((vehicle) => vehicle.driverId === driver.id && vehicle.status === "eligible" && vehicle.category === driver.category)), "vehicle-aware offers require an eligible matching vehicle");

assert(refundBlock("captured", "completed") === null, "captured completed trip can be refunded");
assert(refundBlock("pending", "completed") !== null, "refund requires capture");
assert(refundBlock("captured", "in_trip") !== null, "refund requires a terminal trip");
assert(paymentOf(seed.payments[0]!), "payment state resolves");

console.log("present ok");
