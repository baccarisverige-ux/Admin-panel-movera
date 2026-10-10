import { SEED_NOW, type DemoRecord } from "../api/seed.ts";
import { CATEGORIES } from "../domain/contract.ts";
import { marketOfZone, zoneById } from "../markets/markets.ts";

export type ScheduledRide = {
  id: string;
  rider: string;
  zoneName: string;
  category: string;
  driver: string | null;
  status: string;
  pickupAt: number;
  fareMinor: number;
  estimated: boolean;
  hasReturn: boolean;
  /** red: no driver and pickup within an hour; amber: within two hours. */
  warning: "red" | "amber" | null;
};

const ESTIMATE: Record<string, number> = { SE: 52_000, FR: 4_800, TN: 28_000 };
const CATEGORY_FACTOR: Record<string, number> = { economy: 1, comfort: 1.25, premium: 1.7, priority: 1.15, xl: 1.45, electric: 1.1, pet: 1.15 };
const OPEN = new Set(["waiting", "booked"]);

/**
 * Scheduled rides as the dashboard shows them. `shiftMs` moves demo pickup times so the
 * fixed demo data lines up with today; it is 0 with a live backend.
 */
export function scheduledRides(reservations: readonly DemoRecord[], drivers: readonly DemoRecord[], nowMs: number, shiftMs = 0): ScheduledRide[] {
  const names = new Map(drivers.map((row) => [row.id, row.name]));
  return reservations
    .filter((row) => row.pickupAt)
    .map((row): ScheduledRide => {
      const pickupAt = Date.parse(row.pickupAt!) + shiftMs;
      const country = marketOfZone(row.zoneId)?.id ?? "SE";
      const category = row.category ?? "economy";
      const minutes = (pickupAt - nowMs) / 60_000;
      const unassigned = OPEN.has(row.status) && !row.driverId;
      return {
        id: row.id,
        rider: row.name,
        zoneName: zoneById(row.zoneId)?.name ?? row.zoneId,
        category: CATEGORIES.find((item) => item.id === category)?.label ?? category,
        driver: row.driverId ? names.get(row.driverId) ?? row.driverId : null,
        status: row.status,
        pickupAt,
        fareMinor: row.fareOre ?? Math.round(ESTIMATE[country] * (CATEGORY_FACTOR[category] ?? 1)),
        estimated: row.fareOre === undefined,
        hasReturn: Boolean(row.returnAt),
        warning: unassigned && minutes >= 0 && minutes < 60 ? "red" : unassigned && minutes >= 0 && minutes < 120 ? "amber" : null,
      };
    })
    .sort((a, b) => a.pickupAt - b.pickupAt);
}

export function rideCounts(rides: readonly ScheduledRide[], nowMs: number) {
  const upcoming = rides.filter((ride) => ride.pickupAt >= nowMs && ride.status !== "cancelled");
  return {
    upcoming: upcoming.length,
    unassigned: upcoming.filter((ride) => OPEN.has(ride.status) && !ride.driver).length,
    assigned: upcoming.filter((ride) => ride.status === "assigned").length,
    completed: rides.filter((ride) => ride.status === "completed").length,
    cancelled: rides.filter((ride) => ride.status === "cancelled").length,
  };
}

/** How far to move demo pickup times so the fixed demo data lines up with now. */
export function demoShift(nowMs: number, demo: boolean): number {
  return demo ? nowMs - Date.parse(SEED_NOW) : 0;
}
