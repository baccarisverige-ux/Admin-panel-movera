import { fleetStatus, type FleetCar } from "./fleet.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const ok: FleetCar = { id: "V1", plate: "ABC 123", driverName: "Erik Lind", year: 2022, seats: 4, fuel: "electric", category: "electric" };
const old: FleetCar = { ...ok, id: "V2", plate: "OLD 14", year: 2012 };
const xl: FleetCar = { ...ok, id: "V3", plate: "XL 1", category: "xl", seats: 4, fuel: "petrol" };

assert(fleetStatus(ok).eligible, "electric car is eligible");
assert(fleetStatus(old).reason?.includes("older"), "old car refused");
assert(fleetStatus(xl).reason?.includes("6 seats"), "XL seats");

console.log("fleet ok");
