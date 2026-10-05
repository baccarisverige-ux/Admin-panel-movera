import { createFixtureAdminApi } from "./create.ts";
import { PHONE, PLATE, TRIP_ID, createSeed } from "./seed.ts";
import { statusLabel } from "../domain/labels.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = createSeed();
assert(seed.drivers.length === 60, "60 drivers");
assert(seed.vehicles.length === 45, "45 vehicles");
assert(seed.fleets.length === 3, "3 fleets");
assert(seed.riders.length === 250, "250 riders");
assert(seed.trips.length === 600, "600 trips");
assert(seed.reservations.length === 40, "40 reservations");
assert(seed.tickets.length === 35, "35 tickets");
assert(seed.incidents.length === 6, "6 incidents");
assert(seed.payments.length === 300, "300 payments");
assert(seed.refunds.length === 20, "20 refunds");
assert(seed.templates.length === 19, "19 templates");
assert(seed.banners.length === 6, "6 banners");
assert(seed.events.length === 4, "4 events");
assert(seed.bonuses.length === 3, "3 bonuses");
assert(seed.staff.length === 12, "12 staff");
assert(statusLabel("in_trip") === "On a trip", "status label");
assert(!statusLabel("in_trip").includes("_"), "no raw status");
const r1 = seed.riders.find((rider) => rider.id === "R0001");
const r2 = seed.riders.find((rider) => rider.id === "R0002");
assert(r1 && r2 && r1.phone !== r2.phone, "R0001 and R0002 must not share a phone");
assert(r1?.phone === PHONE, "R0001 keeps the known demo phone");

const api = createFixtureAdminApi(0);
await api.reset();
const plate = await api.search(PLATE, null);
assert(plate.some((hit) => hit.path.startsWith("/vehicles/")), "plate search");
const trip = await api.search(TRIP_ID, null);
assert(trip.some((hit) => hit.id === TRIP_ID), "trip search");
const phone = await api.search(PHONE, null);
assert(phone.some((hit) => hit.kind === "rider"), "phone search");
await api.setFault("409");
await api.command({ action: "admin.rider.block", targetId: "R0001", reason: "Safety review", actorId: "nora", before: "active", after: "blocked" }).then(
  () => {
    throw new Error("409 should reject");
  },
  (error: unknown) => {
    assert(error instanceof Error && /newest version/.test(error.message), "409 message");
  },
);
await api.setFault("none");
await api.reset();
const fresh = await api.list("drivers", null);
assert(fresh.length === 60, "reset restores drivers");
const scoped = await api.list("drivers", ["Z001", "Z002"]);
assert(scoped.length > 0 && scoped.every((row) => row.zoneId === "Z001" || row.zoneId === "Z002"), "list respects multi-zone scope");
const hiddenPlate = await api.search(PLATE, ["Z009"]);
assert(hiddenPlate.length === 0, "search cannot escape its allowed zones");

console.log("seed ok");
