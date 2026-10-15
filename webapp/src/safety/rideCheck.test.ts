import { createSeed } from "../api/seed.ts";
import { caseOf, emptyIncidentOps, kindOf, linkedTrip } from "./cases.ts";
import { emptySafety } from "./ops.ts";
import {
  alertBy,
  alertTitle,
  answerLabel,
  asRideChecks,
  EMPTY_FILTER,
  emptyRideCheckOps,
  filterChecks,
  isAlert,
  normalizeRideCheckOps,
  openCheck,
  outcomeOf,
  reasonText,
  repeats,
  shiftOf,
  worries,
  worrying,
  type RideCheck,
} from "./rideCheck.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const base: RideCheck = {
  id: "RC-1", name: "Sara Berg", phone: "+46 70 000 00 01", zoneId: "Z001", status: "none", tripId: "T0001", driverId: "D0001", riderId: "R0001", vehicleId: "V0001",
  trigger: "stop", value: 4, place: "Odenplan", at: "2026-10-12T10:00:00.000Z", driver: null, rider: null, incidentId: null,
};
const ok = { at: "2026-10-12T10:00:20.000Z", choice: "ok" as const };

// Reasons read like the card.
assert(reasonText(base) === "Stopped for 4 min · Odenplan", "long stop reason");
assert(reasonText({ trigger: "far", value: 1200, place: "Solna centrum" }) === "Trip ended 1.2 km from the drop-off · Solna centrum", "far reason in km");
assert(reasonText({ trigger: "far", value: 650, place: "" }) === "Trip ended 650 m from the drop-off", "far reason in m");
assert(reasonText({ trigger: "longer", value: 72, place: "" }) === "Trip 72% longer than expected", "longer reason");

// How a check ended, and the alert rule.
assert(outcomeOf(base) === "none" && answerLabel("driver", null) === "No answer yet", "no answer yet");
assert(outcomeOf({ driver: ok, rider: ok }) === "ok", "both OK");
assert(outcomeOf({ driver: { ...ok, choice: "traffic" }, rider: ok }) === "reason", "a reason counts more than OK");
assert(outcomeOf({ driver: ok, rider: { ...ok, choice: "call112" } }) === "call112", "called 112");
const accident = { at: "2026-10-12T10:00:40.000Z", choice: "accident" as const, follow: [{ q: "anyone_hurt" as const, a: "Not sure", at: "2026-10-12T10:00:50.000Z" }, { q: "car_safe" as const, a: "Yes", at: "2026-10-12T10:00:58.000Z" }] };
const unsafe = { at: "2026-10-12T10:00:30.000Z", choice: "unsafe" as const, follow: [{ q: "in_danger" as const, a: "No", at: "2026-10-12T10:00:45.000Z" }] };
assert(isAlert({ driver: accident, rider: ok }) && outcomeOf({ driver: accident, rider: ok }) === "help", "a red row sends an alert");
assert(!isAlert({ driver: { ...ok, choice: "call112" }, rider: { ...ok, choice: "car" } }), "Call 112 and a car problem do not alert admin");
assert(alertBy({ driver: accident, rider: unsafe })?.who === "rider", "the first red answer sent the alert");
assert(alertTitle({ driver: accident, rider: ok }) === "Accident or collision (driver)" && alertTitle({ driver: ok, rider: { ...accident } }) === "There was an accident (rider)", "alert title uses the person's own words");
assert(worrying({ q: "anyone_hurt", a: "Not sure", at: "" }) && worrying({ q: "other_ok", a: "No", at: "" }) && !worrying({ q: "car_safe", a: "Yes", at: "" }) && !worrying({ q: "in_danger", a: "No", at: "" }), "Yes or Not sure on someone hurt is worrying, a safe car is not");
assert(worries({ driver: accident, rider: unsafe }).length === 1 && worries({ driver: accident, rider: unsafe })[0].follow.q === "anyone_hurt", "worries list the answers that update the alert");

// The log: filters and repeats.
const list: RideCheck[] = [
  { ...base, id: "a", driver: ok, rider: ok },
  { ...base, id: "b", trigger: "far", value: 900, zoneId: "Z002", driverId: "D0002", at: "2026-10-10T10:00:00.000Z", driver: ok, rider: unsafe },
  { ...base, id: "c", driverId: "D0001", at: "2026-10-01T10:00:00.000Z", driver: { ...ok, choice: "traffic" }, rider: ok },
];
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const time = (check: RideCheck) => Date.parse(check.at);
const ids = (filter: Partial<typeof EMPTY_FILTER>) => filterChecks(list, { ...EMPTY_FILTER, ...filter }, time, day).map((check) => check.id).join(",");
assert(ids({}) === "a,b,c", "no filter shows every check");
assert(ids({ trigger: "far" }) === "b" && ids({ answer: "ok" }) === "a" && ids({ answer: "help" }) === "b" && ids({ answer: "reason" }) === "c", "trigger and answer filters");
assert(ids({ zoneId: "Z002" }) === "b" && ids({ driverId: "D0001" }) === "a,c", "zone and driver filters");
assert(ids({ from: "2026-10-05" }) === "a,b" && ids({ to: "2026-10-10" }) === "b,c" && ids({ from: "2026-10-10", to: "2026-10-10" }) === "b", "date range");
const again = repeats(list);
assert(again.drivers[0].id === "D0001" && again.drivers[0].count === 2 && again.zones[0].id === "Z001" && again.drivers.length === 1, "drivers and zones that keep triggering it");
assert(asRideChecks([...list, { id: "x" }, null]).length === 3, "only real checks are read");

// Who opened an alert.
const opened = openCheck(emptyRideCheckOps(), "a", "nora", "2026-10-12T10:05:00Z");
assert(opened.draftRev === 2 && opened.opened.a.by === "nora", "opening an alert is saved with the name");
assert(openCheck(opened, "a", "lena", "x") === opened, "the first admin to open it stays");
assert(normalizeRideCheckOps(null).draftRev === 1 && normalizeRideCheckOps({ draftRev: 4, opened: [] }).opened && !Array.isArray(normalizeRideCheckOps({ draftRev: 4, opened: [] }).opened), "older or broken saves load");

// Demo clock: live checks move with their incident or the demo clock; others keep their times.
const live = { ...base, live: true, driver: accident, rider: ok };
assert(shiftOf({ ...base }, 123, 456) === 0, "a finished trip keeps its times");
assert(shiftOf(live, Date.parse("2026-10-15T09:00:00.000Z"), 0) === Date.parse("2026-10-15T09:00:00.000Z") - Date.parse(accident.at), "a live alert starts when its incident opened");
assert(shiftOf({ ...live, driver: ok }, null, 5000) === 5000, "a live check without an alert follows the demo clock");

// The demo seed: mostly I'm OK, two alerts, one still open, each with its incident.
const seed = createSeed();
const checks = seed.rideChecks;
assert(checks.length >= 12 && new Set(checks.map((check) => check.id)).size === checks.length, "several ride checks with unique ids");
assert(checks.filter((check) => outcomeOf(check) === "ok").length > checks.length / 2, "mostly I'm OK");
const alerts = checks.filter(isAlert);
assert(alerts.length === 2 && alerts.every((check) => check.incidentId), "two alerts, each with an incident");
for (const check of checks) {
  const trip = seed.trips.find((row) => row.id === check.tripId);
  assert(trip && trip.driverId === check.driverId && trip.zoneId === check.zoneId && trip.name === check.name, `${check.id} matches its trip`);
  assert(seed.riders.some((row) => row.id === check.riderId) && seed.vehicles.some((row) => row.id === check.vehicleId && row.driverId === check.driverId), `${check.id} names its rider and car`);
  assert(check.status === outcomeOf(check), `${check.id} status is its outcome`);
}
const rideIncidents = seed.incidents.filter((row) => row.kind === "ride_check");
assert(rideIncidents.length === 2 && rideIncidents.filter((row) => row.status === "queued").length === 1, "one open ride check incident, one solved");
const openOne = rideIncidents.find((row) => row.status === "queued")!;
const openCheckRow = checks.find((check) => check.incidentId === openOne.id)!;
assert(openCheckRow.live && openCheckRow.driver && openCheckRow.rider, "the open alert is on a live trip, with both answers");
assert(kindOf(openOne) === "ride_check", "the incident is a Ride check case");
const item = caseOf(openOne, emptySafety(), emptyIncidentOps(), Date.parse("2026-10-15T09:00:00Z"));
assert(item.kind === "ride_check" && item.level === "critical" && item.state === "new" && linkedTrip(item, seed.trips)?.id === openCheckRow.tripId, "the case is critical, new, and linked to the trip");
const sos = caseOf(seed.incidents[0], emptySafety(), emptyIncidentOps(), Date.parse("2026-10-15T09:00:00Z"));
assert(sos.openedAt <= item.openedAt, "the open SOS stays first among new critical cases");

console.log("ride check ok");
