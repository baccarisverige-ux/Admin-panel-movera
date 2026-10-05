import { adjustFare, cancelTrip, eligibleDrivers, reassign, saveDispatch, type OfferDriver, type Trip } from "./rules.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const trip: Trip = { id: "T1001", status: "accepted", category: "economy", fareOre: 14900, ruleVersion: "price-3", driverId: "D1" };
const drivers: OfferDriver[] = [
  { id: "D1", name: "Erik Lind", status: "active", category: "economy" },
  { id: "D2", name: "Sara Berg", status: "suspended", category: "economy" },
  { id: "D3", name: "Noah Ek", status: "active", category: "economy" },
  { id: "D4", name: "Maja XL", status: "active", category: "xl" },
];

assert(cancelTrip({ ...trip, status: "completed" }, "Wrong car").error?.includes("completed"), "finished trip stays");
assert(cancelTrip(trip, "Rider asked").trip.status === "cancelled_by_admin", "admin can cancel an accepted trip");
assert(eligibleDrivers(trip, drivers).map((driver) => driver.id).join() === "D3", "only an eligible active driver");
assert(reassign(trip, drivers[1]!, drivers).error?.includes("not eligible"), "suspended driver refused");
assert(reassign(trip, drivers[2]!, drivers).trip.driverId === "D3", "reassign sticks");
assert(adjustFare(trip, 40).error?.includes("15%"), "fare cap");
assert(adjustFare(trip, 10).trip.fareOre === 16390, "ten percent");
assert(adjustFare(trip, 10).trip.ruleVersion === "price-3", "rule version kept");
const dispatch = saveDispatch({ offerSeconds: 8.5, radiusKm: 30 }, { offerSeconds: 8.5, radiusKm: 25 });
assert(dispatch.rules.radiusKm === 25 && dispatch.rules.offerSeconds === 8.5, "dispatch saves");

console.log("trips ok");
