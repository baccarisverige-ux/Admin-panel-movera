import { calculateFare, formatSek, type FareCategoryId } from "../data/catalog.ts";

export const RIDE_OPTIONS = ["baby_seat", "child_seat", "booster_seat", "extra_bags", "pet"] as const;

const PRICED: FareCategoryId[] = ["economy", "comfort", "premium", "xl"];

export function pricedCategory(id: string): FareCategoryId {
  return (PRICED as readonly string[]).includes(id) ? (id as FareCategoryId) : "economy";
}

export function quoteRide(category: string, distanceKm: number, durationMin: number): { kronor: number; label: string; ruleVersion: string } {
  const kronor = calculateFare(pricedCategory(category), distanceKm, durationMin);
  return { kronor, label: formatSek(kronor), ruleVersion: "price-3" };
}
