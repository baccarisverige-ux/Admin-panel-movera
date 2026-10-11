import { HOURLY, NIGHT_LIFT, WEEKDAY } from "../dashboard/earnings.ts";
import { localParts } from "../dashboard/time.ts";
import { marketOfZone, zoneById } from "../markets/markets.ts";

/**
 * Riders asking for a ride against free drivers, per zone, every 10 minutes.
 * Demo model on the same daily curve as the earnings, plus the riders and drivers live on the map.
 */

export type ZoneDemand = { zoneId: string; requests: number; free: number; ratio: number };

export type DemandPoint = { at: number; requests: number; free: number; ratio: number };

const BUCKET_MS = 10 * 60_000;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function model(zoneId: string, at: number): { requests: number; free: number } {
  const zone = zoneById(zoneId);
  const timeZone = marketOfZone(zoneId)?.timeZone ?? "Europe/Stockholm";
  if (!zone) return { requests: 0, free: 0 };
  const local = localParts(at, timeZone);
  const seed = hash(zoneId);
  const bucket = Math.floor(at / BUCKET_MS);
  const lift = local.hour >= 21 || local.hour <= 2 ? NIGHT_LIFT[local.weekday] : 1;
  const busy = HOURLY[local.hour] * WEEKDAY[local.weekday] * lift;
  const size = zone.kind === "airport" ? 7 : 4 + (seed % 5);
  // A short burst now and then (a concert out, a train late) makes some zones run short.
  const burst = noise(seed * 13 + Math.floor(bucket / 3)) > 0.82 ? 1.9 : 1;
  const requests = 1.3 * size * busy * burst * (0.7 + 0.6 * noise(seed + bucket));
  // Drivers follow demand with a lag, so peaks run short and quiet hours have spare cars.
  const lagged = HOURLY[(local.hour + 23) % 24] * WEEKDAY[local.weekday];
  const free = size * (0.4 + 0.6 * lagged) * (0.7 + 0.6 * noise(seed * 5 + bucket));
  return { requests, free };
}

export function zoneDemand(zoneId: string, at: number, live?: { waiting: number; free: number }): ZoneDemand {
  const base = model(zoneId, at);
  const requests = Math.round(base.requests + (live?.waiting ?? 0));
  const free = Math.round(base.free + (live?.free ?? 0));
  return { zoneId, requests, free, ratio: Math.round((requests / Math.max(1, free)) * 100) / 100 };
}

/** The last few hours for the chart, newest last. */
export function demandSeries(zoneId: string, at: number, hours = 6, stepMin = 10): DemandPoint[] {
  const points: DemandPoint[] = [];
  const end = Math.floor(at / BUCKET_MS) * BUCKET_MS;
  for (let time = end - hours * 3_600_000; time <= end; time += stepMin * 60_000) {
    const { requests, free, ratio } = zoneDemand(zoneId, time);
    points.push({ at: time, requests, free, ratio });
  }
  return points;
}
