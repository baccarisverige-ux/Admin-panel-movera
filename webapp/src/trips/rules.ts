export const CANCEL_OK = ["searching", "accepted", "arrived", "in_trip"] as const;
export const OFFER_OK = ["requested", "searching"] as const;
export const REASSIGN_OK = ["accepted", "driver_to_pickup", "arrived"] as const;
export const FARE_ADJUST_OK = ["accepted", "driver_to_pickup", "arrived", "rider_onboard", "in_trip", "approaching_dropoff"] as const;
export const WAITING_OK = ["arrived", "rider_onboard", "in_trip"] as const;
export const REFUND_TRIP_OK = ["completed", "cancelled_by_rider", "cancelled_by_driver", "cancelled_by_admin", "no_show", "failed"] as const;

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

function includes(list: readonly string[], status: string): boolean {
  return list.includes(status);
}

export function canCancel(status: string): boolean {
  return includes(CANCEL_OK, status);
}

export function canOffer(status: string): boolean {
  return includes(OFFER_OK, status);
}

export function canReassign(status: string): boolean {
  return includes(REASSIGN_OK, status);
}

export function canAdjustFare(status: string): boolean {
  return includes(FARE_ADJUST_OK, status);
}

export function canSetWaiting(status: string): boolean {
  return includes(WAITING_OK, status);
}

export function canRefundTrip(status: string): boolean {
  return includes(REFUND_TRIP_OK, status);
}

export function cancelTrip(trip: Trip, reason: string): { trip: Trip; error?: string } {
  if (!reason.trim()) return { trip, error: "A reason is required." };
  if (!canCancel(trip.status)) return { trip, error: `Cannot cancel a trip in ${trip.status}.` };
  return { trip: { ...trip, status: "cancelled_by_admin", driverId: null } };
}

export function eligibleDrivers(trip: Trip, drivers: readonly OfferDriver[]): OfferDriver[] {
  return drivers.filter((driver) => driver.status === "active" && driver.category === trip.category && driver.id !== trip.driverId);
}

export function offerTrip(trip: Trip, driver: OfferDriver, drivers: readonly OfferDriver[]): { trip: Trip; error?: string } {
  if (!canOffer(trip.status)) return { trip, error: "This trip can no longer be offered." };
  if (!eligibleDrivers(trip, drivers).some((item) => item.id === driver.id)) return { trip, error: "That driver is not eligible." };
  return { trip: { ...trip, driverId: driver.id, status: "offered" } };
}

export function reassign(trip: Trip, driver: OfferDriver, drivers: readonly OfferDriver[]): { trip: Trip; error?: string } {
  if (!canReassign(trip.status)) return { trip, error: "This trip can no longer be reassigned." };
  if (!eligibleDrivers(trip, drivers).some((item) => item.id === driver.id)) {
    return { trip, error: "That driver is not eligible." };
  }
  return { trip: { ...trip, driverId: driver.id, status: "accepted" } };
}

export function adjustFare(trip: Trip, percent: number, maxPercent = 15): { trip: Trip; error?: string } {
  if (!canAdjustFare(trip.status)) {
    return { trip, error: `Fare adjustment is not allowed while the trip is ${trip.status}.` };
  }
  if (!Number.isFinite(percent) || percent === 0) return { trip, error: "Enter a non-zero fare adjustment." };
  if (Math.abs(percent) > maxPercent) return { trip, error: `Adjustment is limited to ${maxPercent}%.` };
  const next = Math.round(trip.fareOre * (1 + percent / 100));
  return { trip: { ...trip, fareOre: next } };
}

export function waitingMinutes(status: string, minutes: number): { minutes: number; error?: string } {
  if (!canSetWaiting(status)) return { minutes, error: `Waiting time cannot be changed while the trip is ${status}.` };
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120) return { minutes, error: "Waiting time must be a whole number from 0 to 120 minutes." };
  return { minutes };
}

export function saveDispatch(current: DispatchRules, next: DispatchRules): { rules: DispatchRules; error?: string } {
  if (next.offerSeconds <= 0 || next.offerSeconds > 60) return { rules: current, error: "Offer window must be between 0 and 60 seconds." };
  if (next.radiusKm <= 0 || next.radiusKm > 100) return { rules: current, error: "Radius must be between 0 and 100 km." };
  return { rules: { ...next } };
}
