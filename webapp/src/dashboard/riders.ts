import type { DemoRecord } from "../api/seed.ts";
import { CATEGORIES } from "../domain/contract.ts";
import { zoneById } from "../markets/markets.ts";
import type { LiveDriver } from "./live.ts";
import type { LatLng } from "./route.ts";

/** Riders on the live map: waiting for a driver, being picked up, on a trip, or just browsing. */

export type RideRequest = {
  tripId: string;
  riderId: string | null;
  rider: string;
  zoneId: string;
  zoneName: string;
  at: LatLng;
  category: string;
  categoryLabel: string;
  waitingMin: number;
  status: "searching" | "offered";
  offeredTo: string | null;
};

export type Candidate = { driver: LiveDriver; km: number; etaMin: number; categoryOk: boolean };

export type RiderCounts = { online: number; onTrip: number; beingPickedUp: number; waiting: number; longWait: number };

const WAITING = new Set(["requested", "searching", "offered"]);
const LONG_WAIT_MIN = 5;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function distanceKm(a: LatLng, b: LatLng): number {
  const x = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180));
  const y = b[0] - a[0];
  return Math.sqrt(x * x + y * y) * 111.32 * 1.25;
}

export function rideRequests(trips: readonly DemoRecord[], riders: readonly DemoRecord[]): RideRequest[] {
  return trips
    // Older demo requests are long gone; about one in seven is still waiting right now.
    .filter((trip) => WAITING.has(trip.status) && zoneById(trip.zoneId) && (hash(`wait:${trip.id}`) >>> 4) % 7 === 0)
    .map((trip) => {
      const zone = zoneById(trip.zoneId)!;
      const seed = hash(trip.id);
      const angle = ((seed % 360) * Math.PI) / 180;
      const radius = (zone.kind === "airport" ? 0.004 : 0.012) * (0.3 + ((seed >>> 8) % 70) / 100);
      const category = CATEGORIES[seed % CATEGORIES.length];
      const rider = riders.find((row) => row.phone === trip.phone) ?? null;
      return {
        tripId: trip.id,
        riderId: rider?.id ?? null,
        rider: trip.name,
        zoneId: trip.zoneId,
        zoneName: zone.name,
        at: [zone.center[0] + Math.sin(angle) * radius, zone.center[1] + (Math.cos(angle) * radius) / Math.cos((zone.center[0] * Math.PI) / 180)] as LatLng,
        category: category.id,
        categoryLabel: category.label,
        waitingMin: 1 + (seed % 9),
        status: trip.status === "offered" && trip.driverId ? "offered" as const : "searching" as const,
        offeredTo: trip.status === "offered" ? trip.driverId ?? null : null,
      };
    })
    .sort((a, b) => b.waitingMin - a.waitingMin);
}

/** Free online drivers nearest to a request; those who may drive its category come first. */
export function candidatesFor(request: RideRequest, drivers: readonly LiveDriver[], categoriesOf: (driverId: string) => readonly string[]): Candidate[] {
  return drivers
    .filter((driver) => driver.state === "free")
    .map((driver) => {
      const km = distanceKm([driver.lat, driver.lng], request.at);
      return { driver, km: Math.round(km * 10) / 10, etaMin: Math.max(1, Math.round((km / 24) * 60)), categoryOk: categoriesOf(driver.id).includes(request.category) };
    })
    .sort((a, b) => Number(b.categoryOk) - Number(a.categoryOk) || a.km - b.km);
}

export function riderCounts(requests: readonly RideRequest[], drivers: readonly LiveDriver[], riders: readonly DemoRecord[]): RiderCounts {
  const onTrip = drivers.filter((driver) => driver.state === "trip" || driver.state === "sos").length;
  const beingPickedUp = drivers.filter((driver) => driver.state === "pickup").length;
  const browsing = Math.round(riders.filter((row) => row.status === "active").length * 0.05);
  return {
    online: browsing + onTrip + beingPickedUp + requests.length,
    onTrip,
    beingPickedUp,
    waiting: requests.length,
    longWait: requests.filter((request) => request.waitingMin > LONG_WAIT_MIN).length,
  };
}
