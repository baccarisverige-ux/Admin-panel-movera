import type { DemoRecord } from "../api/seed.ts";
import { zoneById } from "../markets/markets.ts";
import { along, tripRoute, type TripRoute } from "./route.ts";

export type LiveState = "free" | "pickup" | "trip" | "stale" | "sos";

export const LIVE_STATES: { id: LiveState; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "pickup", label: "To pickup" },
  { id: "trip", label: "On trip" },
  { id: "stale", label: "No GPS" },
  { id: "sos", label: "SOS" },
];

export type LiveDriver = {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  state: LiveState;
  lat: number;
  lng: number;
  lastSeenMin: number;
  vehicle: string | null;
  plate: string | null;
  tripId: string | null;
  /** Current trip geometry for drivers heading to a pickup or carrying a rider. */
  route: TripRoute | null;
  /** How far along: the approach while heading to the pickup, the trip path once on board. */
  progress: number;
};

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** Active drivers who have the app open right now; about a quarter are offline at any moment. */
export function isOnline(driver: Pick<DemoRecord, "id" | "status">): boolean {
  return driver.status === "active" && (hash(driver.id) >>> 13) % 100 >= 24;
}

const ACTIVE_TRIP = new Set(["accepted", "driver_to_pickup", "arrived", "rider_onboard", "in_trip", "approaching_dropoff"]);

/**
 * Online drivers with a simulated position. Only active drivers can be online; each queued SOS
 * flags the first online driver in its zone. `tick` advances moving drivers a little.
 */
export function liveDrivers(
  drivers: readonly DemoRecord[],
  vehicles: readonly DemoRecord[],
  trips: readonly DemoRecord[],
  incidents: readonly DemoRecord[],
  tick: number,
): LiveDriver[] {
  const sosZones = new Set(incidents.filter((row) => row.status === "queued").map((row) => row.zoneId));
  const flagged = new Set<string>();
  return drivers
    .filter((driver) => isOnline(driver) && zoneById(driver.zoneId))
    .map((driver) => {
      const zone = zoneById(driver.zoneId)!;
      const seed = hash(driver.id);
      const roll = seed % 100;
      let state: LiveState = roll < 38 ? "free" : roll < 54 ? "pickup" : roll < 91 ? "trip" : "stale";
      if (sosZones.has(driver.zoneId) && !flagged.has(driver.zoneId) && state !== "stale") {
        flagged.add(driver.zoneId);
        state = "sos";
      }
      const spread = zone.kind === "airport" ? 0.006 : 0.014;
      const angle = ((seed % 360) * Math.PI) / 180;
      const radius = spread * (0.25 + ((seed >>> 9) % 100) / 130);
      const moving = state === "pickup" || state === "trip";
      const drift = moving ? tick * 0.035 * (seed % 2 ? 1 : -1) : 0;
      let lat = zone.center[0] + Math.sin(angle + drift) * radius;
      let lng = zone.center[1] + (Math.cos(angle + drift) * radius) / Math.cos((zone.center[0] * Math.PI) / 180);
      const withTrip = state === "pickup" || state === "trip" || state === "sos";
      const route = withTrip ? tripRoute(zone.center, seed, zone.kind === "airport") : null;
      // Drivers advance along their route a little every tick and start over when they arrive.
      const progress = route ? (0.08 + (((seed >>> 11) % 60) / 100) + tick * (state === "pickup" ? 0.012 : 0.006)) % 0.92 : 0;
      if (route) [lat, lng] = along(state === "pickup" ? route.approach : route.path, progress).point;
      const vehicle = vehicles.find((row) => row.driverId === driver.id);
      const trip = state === "trip" || state === "pickup" || state === "sos"
        ? trips.find((row) => row.driverId === driver.id && ACTIVE_TRIP.has(row.status)) ?? trips.find((row) => row.driverId === driver.id)
        : undefined;
      return {
        id: driver.id,
        name: driver.name,
        zoneId: driver.zoneId,
        zoneName: zone.name,
        state,
        lat,
        lng,
        lastSeenMin: state === "stale" ? 6 + (seed % 25) : 0,
        vehicle: vehicle ? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || null : null,
        plate: vehicle?.plate ?? null,
        tripId: trip?.id ?? null,
        route,
        progress,
      };
    });
}

export function countStates(rows: readonly LiveDriver[]): Record<LiveState, number> {
  const counts: Record<LiveState, number> = { free: 0, pickup: 0, trip: 0, stale: 0, sos: 0 };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}
