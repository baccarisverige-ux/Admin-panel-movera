import type { DemoRecord } from "../api/seed.ts";
import { zoneById } from "../markets/markets.ts";

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
};

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

const ACTIVE_TRIP = new Set(["accepted", "driver_to_pickup", "arrived", "rider_onboard", "in_trip", "approaching_dropoff"]);

/**
 * Online drivers with a simulated position. Only active drivers are online; each queued SOS
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
    .filter((driver) => driver.status === "active" && zoneById(driver.zoneId))
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
      const lat = zone.center[0] + Math.sin(angle + drift) * radius;
      const lng = zone.center[1] + (Math.cos(angle + drift) * radius) / Math.cos((zone.center[0] * Math.PI) / 180);
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
      };
    });
}

export function countStates(rows: readonly LiveDriver[]): Record<LiveState, number> {
  const counts: Record<LiveState, number> = { free: 0, pickup: 0, trip: 0, stale: 0, sos: 0 };
  for (const row of rows) counts[row.state] += 1;
  return counts;
}
