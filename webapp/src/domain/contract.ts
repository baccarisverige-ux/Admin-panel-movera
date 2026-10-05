import { z } from "zod";

/** Eighteen trip statuses from the rider and driver apps, in lifecycle order. */
export const TRIP_STATUSES = [
  "draft",
  "quoted",
  "requested",
  "searching",
  "offered",
  "accepted",
  "driver_to_pickup",
  "arrived",
  "rider_onboard",
  "in_trip",
  "approaching_dropoff",
  "completed",
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
  "expired",
  "failed",
] as const;

export const tripStatusSchema = z.enum(TRIP_STATUSES);
export type TripStatus = z.infer<typeof tripStatusSchema>;

/** Seven category ids. `economy` is the Movera alias shown in the apps. */
export const CATEGORIES = [
  { id: "economy", label: "Movera", seats: 4 },
  { id: "comfort", label: "Comfort", seats: 4 },
  { id: "premium", label: "Premium", seats: 4 },
  { id: "priority", label: "Priority", seats: 4 },
  { id: "xl", label: "XL", seats: 6 },
  { id: "electric", label: "Electric", seats: 4 },
  { id: "pet", label: "Pet", seats: 4 },
] as const;

export const categoryIdSchema = z.enum([
  "economy",
  "comfort",
  "premium",
  "priority",
  "xl",
  "electric",
  "pet",
]);

export const PAYMENT_METHODS = [
  "card",
  "swish",
  "klarna",
  "apple",
  "google",
  "paypal",
  "cash",
  "wallet",
] as const;

export const CURRENCY = "SEK" as const;
export const TIME_ZONE = "Europe/Stockholm" as const;

/** Whole kronor to öre. */
export function kronorToOre(kronor: number): number {
  return Math.round(kronor * 100);
}

export function formatOre(ore: number): string {
  const sign = ore < 0 ? "-" : "";
  const abs = Math.abs(ore);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole},${frac} kr`;
}
