import { calculateFare, formatSek, type FareCategoryId } from "../data/catalog.ts";
import { activeScheduledBoost, type PricingBook } from "./book.ts";
import { CATEGORY_IDS, ruleVersion, type PriceCategoryId } from "./sets.ts";

export const RIDE_OPTIONS = ["baby_seat", "child_seat", "booster_seat", "extra_bags", "pet"] as const;

const PRICED: FareCategoryId[] = ["economy", "comfort", "premium", "xl"];

export function pricedCategory(id: string): FareCategoryId {
  return (PRICED as readonly string[]).includes(id) ? (id as FareCategoryId) : "economy";
}

export function quoteRide(category: string, distanceKm: number, durationMin: number): { kronor: number; label: string; ruleVersion: string } {
  const kronor = calculateFare(pricedCategory(category), distanceKm, durationMin);
  return { kronor, label: formatSek(kronor), ruleVersion: "price-3" };
}

export type BoostMode = "none" | "manual" | "scheduled" | "automatic";

export type PricingQuoteInput = {
  zoneId: string;
  category: PriceCategoryId;
  distanceKm: number;
  durationMin: number;
  whenIso: string;
  adjustmentPct: number;
  boostMode: BoostMode;
  waitingMin: number;
  reserved: boolean;
  airport: boolean;
  event: boolean;
  options: string[];
};

export type PricingQuote = {
  error?: string;
  ruleVersion: string;
  baseKr: number;
  adjustmentPct: number;
  adjustedKr: number;
  boostMode: BoostMode;
  boostMultiplier: number;
  boostedKr: number;
  minimumApplied: boolean;
  maximumApplied: boolean;
  fareBeforeFeesKr: number;
  waitingKr: number;
  bookingKr: number;
  reservationKr: number;
  airportKr: number;
  eventKr: number;
  optionsKr: number;
  totalKr: number;
  totalLabel: string;
  tipPresets: number[];
  activeScheduleId: string | null;
};

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function quotePricing(book: PricingBook, input: PricingQuoteInput): PricingQuote {
  const zone = book.book.zones.find((item) => item.zoneId === input.zoneId) ?? book.book.zones[0];
  if (!zone) {
    return {
      error: "Price zone was not found.",
      ruleVersion: "none",
      baseKr: 0,
      adjustmentPct: input.adjustmentPct,
      adjustedKr: 0,
      boostMode: input.boostMode,
      boostMultiplier: 1,
      boostedKr: 0,
      minimumApplied: false,
      maximumApplied: false,
      fareBeforeFeesKr: 0,
      waitingKr: 0,
      bookingKr: 0,
      reservationKr: 0,
      airportKr: 0,
      eventKr: 0,
      optionsKr: 0,
      totalKr: 0,
      totalLabel: formatSek(0),
      tipPresets: [],
      activeScheduleId: null,
    };
  }

  if (!CATEGORY_IDS.includes(input.category) || !zone.enabledCategories[input.category]) {
    return {
      error: "This category is disabled in the selected zone.",
      ruleVersion: ruleVersion(zone, input.category),
      baseKr: 0,
      adjustmentPct: input.adjustmentPct,
      adjustedKr: 0,
      boostMode: input.boostMode,
      boostMultiplier: 1,
      boostedKr: 0,
      minimumApplied: false,
      maximumApplied: false,
      fareBeforeFeesKr: 0,
      waitingKr: 0,
      bookingKr: 0,
      reservationKr: 0,
      airportKr: 0,
      eventKr: 0,
      optionsKr: 0,
      totalKr: 0,
      totalLabel: formatSek(0),
      tipPresets: [...zone.tips],
      activeScheduleId: null,
    };
  }

  const rate = zone.rates[input.category];
  const distanceKm = Math.max(0, Number.isFinite(input.distanceKm) ? input.distanceKm : 0);
  const durationMin = Math.max(0, Number.isFinite(input.durationMin) ? input.durationMin : 0);
  const waitingMin = Math.max(0, Number.isFinite(input.waitingMin) ? input.waitingMin : 0);
  const adjustmentPct = Math.min(zone.adjustMax, Math.max(zone.adjustMin, input.adjustmentPct));
  const baseKr = rate.pickup + distanceKm * rate.perKm + durationMin * rate.perMin;
  const adjustedKr = baseKr * adjustmentPct / 100;
  const scheduled = activeScheduledBoost(book, zone.zoneId, input.whenIso);

  let boostMultiplier = 1;
  if (input.boostMode === "manual") boostMultiplier = zone.boostManual;
  if (input.boostMode === "automatic") boostMultiplier = zone.boostAuto;
  if (input.boostMode === "scheduled") boostMultiplier = scheduled?.multiplier ?? zone.boostScheduled;
  boostMultiplier = Math.min(zone.boostCap, Math.max(1, boostMultiplier));

  const boostedKr = adjustedKr * boostMultiplier;
  const fareBeforeFeesKr = Math.min(rate.maximum, Math.max(rate.minimum, boostedKr));
  const waitingKr = waitingMin * zone.waitingPerMin;
  const bookingKr = zone.bookingFee;
  const reservationKr = input.reserved ? zone.reservationFee : 0;
  const airportKr = input.airport ? zone.airportFee : 0;
  const eventKr = input.event ? zone.eventFee : 0;
  const optionsKr = input.options
    .filter((id) => zone.enabledOptions[id])
    .reduce((total, id) => total + (zone.optionFee[id] ?? 0), 0);
  const totalKr = rounded(fareBeforeFeesKr + waitingKr + bookingKr + reservationKr + airportKr + eventKr + optionsKr);

  return {
    ruleVersion: ruleVersion(zone, input.category),
    baseKr: rounded(baseKr),
    adjustmentPct,
    adjustedKr: rounded(adjustedKr),
    boostMode: input.boostMode,
    boostMultiplier,
    boostedKr: rounded(boostedKr),
    minimumApplied: boostedKr < rate.minimum,
    maximumApplied: boostedKr > rate.maximum,
    fareBeforeFeesKr: rounded(fareBeforeFeesKr),
    waitingKr: rounded(waitingKr),
    bookingKr: rounded(bookingKr),
    reservationKr: rounded(reservationKr),
    airportKr: rounded(airportKr),
    eventKr: rounded(eventKr),
    optionsKr: rounded(optionsKr),
    totalKr,
    totalLabel: formatSek(totalKr),
    tipPresets: [...zone.tips],
    activeScheduleId: scheduled?.id ?? null,
  };
}
