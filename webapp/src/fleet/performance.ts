import { COMMISSION_PLACEHOLDER, type SeriesPoint } from "../dashboard/earnings.ts";
import { bucketLabel, bucketStarts, type PeriodWindow } from "../dashboard/period.ts";
import { localParts } from "../dashboard/time.ts";
import { market, marketOfZone, type MarketId } from "../markets/markets.ts";

/**
 * Demo performance for one driver: a repeatable hourly model shaped by the driver's own
 * habits (work days, shift length, rating). A live backend would serve the same totals.
 */

export type DriverProfile = {
  id: string;
  zoneId: string;
  status: string;
  stars: number;
  acceptancePct: number;
  cancellationPct: number;
};

export type Performance = {
  trips: number;
  ratings: number;
  rating: number;
  acceptancePct: number;
  cancellationPct: number;
  noShows: number;
  onlineHours: number;
  utilisationPct: number;
  avgPickupMin: number;
  distanceKm: number;
  complaints: number;
  grossMinor: number;
  commissionMinor: number;
  tipsMinor: number;
  bonusMinor: number;
  adjustmentsMinor: number;
  netMinor: number;
};

export type PerformanceReport = { current: Performance; previous: Performance; series: SeriesPoint[] };

const FARE_MINOR: Record<MarketId, number> = { SE: 26_000, FR: 2_400, TN: 14_000 };
const HOURLY = [0.22, 0.14, 0.09, 0.07, 0.08, 0.18, 0.42, 0.78, 0.92, 0.66, 0.52, 0.55, 0.6, 0.56, 0.54, 0.62, 0.8, 0.96, 1, 0.84, 0.66, 0.56, 0.48, 0.34];
const HOUR = 3_600_000;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function noise(seed: number): number {
  let value = Math.imul(seed ^ 0x5bd1e995, 0x27d4eb2d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x165667b1);
  return ((value >>> 0) % 10_000) / 10_000;
}

function empty(): Performance {
  return { trips: 0, ratings: 0, rating: 0, acceptancePct: 0, cancellationPct: 0, noShows: 0, onlineHours: 0, utilisationPct: 0, avgPickupMin: 0, distanceKm: 0, complaints: 0, grossMinor: 0, commissionMinor: 0, tipsMinor: 0, bonusMinor: 0, adjustmentsMinor: 0, netMinor: 0 };
}

type Raw = { trips: number; online: number; gross: number; tips: number; wait: number; km: number; stars: number };

const clock = new Map<string, { hour: number; weekday: number; day: number }>();

function local(at: number, timeZone: string) {
  const key = `${timeZone}:${Math.floor(at / HOUR)}`;
  let found = clock.get(key);
  if (!found) {
    const parts = localParts(at, timeZone);
    found = { hour: parts.hour, weekday: parts.weekday, day: Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000) };
    if (clock.size > 60_000) clock.clear();
    clock.set(key, found);
  }
  return found;
}

/** Hours the driver is online: their own days off, a shift around their favourite start hour. */
function hourRaw(driver: DriverProfile, id: MarketId, at: number, seed: number): Raw | null {
  const { timeZone } = market(id);
  const time = local(at, timeZone);
  const daySeed = seed + time.day * 31;
  if (noise(daySeed) < 0.22 + (seed % 3) * 0.04) return null;
  const start = 6 + (seed % 11);
  const length = 7 + (seed % 4);
  const offset = (time.hour - start + 24) % 24;
  if (offset >= length) return null;
  const busy = Math.min(1, 0.35 + HOURLY[time.hour] * 0.75);
  const trips = (1.15 + (seed % 7) / 10) * busy * (0.8 + 0.4 * noise(daySeed + time.hour));
  const fare = FARE_MINOR[id] * (0.9 + 0.2 * noise(daySeed * 3 + time.hour));
  return {
    trips,
    online: 1,
    gross: trips * fare,
    tips: trips * fare * (0.03 + 0.03 * noise(daySeed + 7)),
    wait: trips * (3 + 3 * busy * noise(daySeed + 11)),
    km: trips * (6 + 6 * noise(daySeed + 13)),
    stars: trips * Math.min(5, Math.max(3.6, driver.stars + (noise(daySeed + 17) - 0.5) * 0.3)),
  };
}

function sum(driver: DriverProfile, id: MarketId, start: number, end: number, pausedFrom: number): Raw {
  const total: Raw = { trips: 0, online: 0, gross: 0, tips: 0, wait: 0, km: 0, stars: 0 };
  if (driver.status === "pending") return total;
  const seed = hash(driver.id);
  for (let at = Math.floor(start / HOUR) * HOUR; at < Math.min(end, pausedFrom); at += HOUR) {
    const fraction = Math.min(1, (end - at) / HOUR) - Math.max(0, (start - at) / HOUR);
    if (fraction <= 0) continue;
    const hour = hourRaw(driver, id, at, seed);
    if (!hour) continue;
    for (const key of Object.keys(total) as (keyof Raw)[]) total[key] += hour[key] * fraction;
  }
  return total;
}

function finish(driver: DriverProfile, raw: Raw): Performance {
  if (raw.trips < 0.01 && raw.online < 0.01) return empty();
  const seed = hash(driver.id);
  const trips = Math.round(raw.trips);
  const commission = raw.gross * COMMISSION_PLACEHOLDER;
  const bonus = raw.trips > 40 ? Math.round(raw.gross * 0.025) : 0;
  const adjustments = -Math.round(raw.gross * 0.006 * noise(seed + trips));
  const busyMinutes = raw.trips * 19;
  return {
    trips,
    ratings: Math.round(raw.trips * 0.72),
    rating: raw.trips ? Math.round((raw.stars / raw.trips) * 100) / 100 : 0,
    acceptancePct: driver.acceptancePct,
    cancellationPct: driver.cancellationPct,
    noShows: Math.round(raw.trips * 0.018),
    onlineHours: Math.round(raw.online * 10) / 10,
    utilisationPct: raw.online ? Math.min(95, Math.round((busyMinutes / (raw.online * 60)) * 100)) : 0,
    avgPickupMin: raw.trips ? Math.round((raw.wait / raw.trips) * 10) / 10 : 0,
    distanceKm: Math.round(raw.km),
    complaints: Math.round(raw.trips * 0.004 * (1 + (seed % 3))),
    grossMinor: Math.round(raw.gross),
    commissionMinor: Math.round(commission),
    tipsMinor: Math.round(raw.tips),
    bonusMinor: bonus,
    adjustmentsMinor: adjustments,
    netMinor: Math.round(raw.gross - commission + raw.tips + bonus + adjustments),
  };
}

export function driverPerformance(driver: DriverProfile, window: PeriodWindow, withSeries = true): PerformanceReport {
  const id = marketOfZone(driver.zoneId)?.id ?? "SE";
  const { timeZone, locale } = market(id);
  // Drivers on hold or suspended stopped working a week before now.
  const paused = driver.status === "on_hold" || driver.status === "suspended" ? window.end - 7 * 86_400_000 : Infinity;
  const current = finish(driver, sum(driver, id, window.start, window.end, paused));
  const previous = finish(driver, sum(driver, id, window.prevStart, window.prevEnd, paused));
  if (!withSeries) return { current, previous, series: [] };
  const starts = bucketStarts(window.start, window.spanEnd, window.bucket, timeZone);
  const prevStarts = bucketStarts(window.prevStart, window.prevStart + (window.spanEnd - window.start), window.bucket, timeZone);
  const series = starts.map((at, index) => {
    const next = starts[index + 1] ?? window.spanEnd;
    const net = at < window.end ? finish(driver, sum(driver, id, at, Math.min(next, window.end), paused)).netMinor : NaN;
    const prevAt = prevStarts[index];
    const previousNet = prevAt === undefined ? null : finish(driver, sum(driver, id, prevAt, prevStarts[index + 1] ?? window.prevStart + (next - window.start), paused)).netMinor;
    return { at, label: bucketLabel(at, window.bucket, timeZone, locale), current: net, previous: previousNet };
  });
  return { current, previous, series };
}

/** Totals across several drivers; rates are weighted by trips. */
export function combine(rows: readonly Performance[]): Performance {
  const total = empty();
  for (const row of rows) {
    for (const key of ["trips", "ratings", "noShows", "onlineHours", "distanceKm", "complaints", "grossMinor", "commissionMinor", "tipsMinor", "bonusMinor", "adjustmentsMinor", "netMinor"] as const) total[key] += row[key];
  }
  const weight = (key: "rating" | "acceptancePct" | "cancellationPct" | "avgPickupMin" | "utilisationPct", digits = 1) => {
    if (!total.trips) return 0;
    const scale = 10 ** digits;
    return Math.round((rows.reduce((value, row) => value + row[key] * row.trips, 0) / total.trips) * scale) / scale;
  };
  total.rating = weight("rating", 2);
  total.acceptancePct = weight("acceptancePct");
  total.cancellationPct = weight("cancellationPct");
  total.avgPickupMin = weight("avgPickupMin");
  total.utilisationPct = weight("utilisationPct");
  total.onlineHours = Math.round(total.onlineHours * 10) / 10;
  return total;
}

/** Warning colour for a performance number, or null when it is fine. */
export function performanceWarning(key: "rating" | "acceptancePct" | "cancellationPct", value: number): "red" | "amber" | null {
  if (!value) return null;
  if (key === "rating") return value < 4.5 ? "red" : value < 4.7 ? "amber" : null;
  if (key === "acceptancePct") return value < 80 ? "red" : value < 88 ? "amber" : null;
  return value > 10 ? "red" : value > 6 ? "amber" : null;
}
