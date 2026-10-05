export const CANCEL_OK = ["searching", "accepted", "arrived", "in_trip"] as const;

export type Trip = {
  id: string;
  status: string;
  category: "economy" | "comfort" | "premium" | "priority" | "xl" | "electric" | "pet";
  fareOre: number;
  ruleVersion: string;
  driverId: string | null;
};

export type OfferDriver = {
  id: string;
  name: string;
  status: "active" | "suspended" | "on_hold";
  category: Trip["category"];
};

export type DispatchRules = { offerSeconds: number; radiusKm: number };

export const DEFAULT_DISPATCH: DispatchRules = { offerSeconds: 8.5, radiusKm: 30 };

export function canCancel(status: string): boolean {
  return (CANCEL_OK as readonly string[]).includes(status);
}

export function cancelTrip(trip: Trip, reason: string): { trip: Trip; error?: string } {
  if (!reason.trim()) return { trip, error: "A reason is required." };
  if (!canCancel(trip.status)) return { trip, error: `Cannot cancel a trip in ${trip.status}.` };
  return { trip: { ...trip, status: "cancelled_by_admin", driverId: null } };
}

export function eligibleDrivers(trip: Trip, drivers: readonly OfferDriver[]): OfferDriver[] {
  return drivers.filter((driver) => driver.status === "active" && driver.category === trip.category && driver.id !== trip.driverId);
}

export function reassign(trip: Trip, driver: OfferDriver, drivers: readonly OfferDriver[]): { trip: Trip; error?: string } {
  if (!canCancel(trip.status) && trip.status !== "offered" && trip.status !== "driver_to_pickup") {
    return { trip, error: "This trip can no longer be reassigned." };
  }
  if (!eligibleDrivers(trip, drivers).some((item) => item.id === driver.id)) {
    return { trip, error: "That driver is not eligible." };
  }
  return { trip: { ...trip, driverId: driver.id, status: "accepted" } };
}

export function adjustFare(trip: Trip, percent: number, maxPercent = 15): { trip: Trip; error?: string } {
  if (trip.status === "completed" || trip.status.startsWith("cancelled")) {
    return { trip, error: "The fare on a finished trip stays as issued." };
  }
  if (Math.abs(percent) > maxPercent) return { trip, error: `Adjustment is limited to ${maxPercent}%.` };
  const next = Math.round(trip.fareOre * (1 + percent / 100));
  return { trip: { ...trip, fareOre: next } };
}

export function saveDispatch(current: DispatchRules, next: DispatchRules): { rules: DispatchRules; error?: string } {
  if (next.offerSeconds <= 0 || next.offerSeconds > 60) return { rules: current, error: "Offer window must be between 0 and 60 seconds." };
  if (next.radiusKm <= 0 || next.radiusKm > 100) return { rules: current, error: "Radius must be between 0 and 100 km." };
  return { rules: { ...next } };
}
