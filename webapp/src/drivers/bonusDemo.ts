import { evaluateBonus, inAudience, localParts, toMinutes, windowMinutes, type BonusResult, type BonusRide, type DriverBonus, type DriverDay, type DriverFacts } from "./bonus.ts";

/** Demo only: each driver's rides in today's bonus window so far, so the admin sees real numbers. */

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

/** When today's window started (or null if it has not started), and how many minutes of it have passed. */
export function windowSoFar(bonus: DriverBonus, now: number, timeZone: string): { start: number; elapsed: number } | null {
  const start = toMinutes(bonus.start);
  const end = toMinutes(bonus.end);
  if (start === null || end === null) return null;
  const local = localParts(now, timeZone);
  const length = windowMinutes(bonus);
  let ago: number | null = null;
  if (end > start) {
    if (local.minutes >= start) ago = local.minutes - start;
  } else if (local.minutes >= start) ago = local.minutes - start;
  else if (local.minutes < end) ago = local.minutes + 1440 - start;
  else ago = local.minutes - start;
  if (ago === null || ago < 0) return null;
  const startMs = now - ago * 60_000;
  return { start: startMs, elapsed: Math.min(ago, length) };
}

const FARE: Record<string, number> = { SE: 210, FR: 19, TN: 14 };

export function demoDay(bonus: DriverBonus, facts: DriverFacts, home: [number, number], now: number, timeZone: string): DriverDay {
  const seed = hash(`${bonus.id}:${facts.id}:${localParts(now, timeZone).date}`);
  const so = windowSoFar(bonus, now, timeZone);
  const cancelPct = seed % 19;
  const acceptPct = 70 + (seed >>> 5) % 29;
  if (!so || so.elapsed < 10) return { rides: [], cancelPct, acceptPct, rating: facts.rating, onlineMin: so?.elapsed ?? 0 };
  const area = bonus.areas[0]?.ring;
  const center: [number, number] = area ? [area.reduce((sum, [lat]) => sum + lat, 0) / area.length, area.reduce((sum, [, lng]) => sum + lng, 0) / area.length] : home;
  const rides: BonusRide[] = [];
  let cursor = so.start + ((seed >>> 3) % 10) * 60_000;
  const end = so.start + so.elapsed * 60_000;
  for (let index = 0; index < 12; index += 1) {
    const step = hash(`${seed}:${index}`);
    const minutes = 12 + (step % 14);
    if (cursor + minutes * 60_000 > end) break;
    const inside = !area || step % 10 < 7;
    const spot: [number, number] = inside ? [center[0] + ((step >>> 4) % 9 - 4) * 0.002, center[1] + ((step >>> 8) % 9 - 4) * 0.003] : [home[0] + 0.03, home[1] - 0.03];
    rides.push({
      id: `${facts.id}-${index}`,
      start: cursor,
      end: cursor + minutes * 60_000,
      fare: Math.round(FARE[bonus.country]! * (0.6 + ((step >>> 12) % 10) / 10)),
      km: 2 + ((step >>> 16) % 12),
      category: ["economy", "comfort", "xl", "premium"][(step >>> 20) % 4]!,
      zoneId: "",
      pickup: spot,
      dropoff: [spot[0] - 0.04, spot[1] + 0.05],
    });
    cursor += (minutes + 4 + ((step >>> 24) % 30)) * 60_000;
  }
  return { rides, cancelPct, acceptPct, rating: facts.rating, onlineMin: Math.round(so.elapsed * (0.7 + ((seed >>> 9) % 30) / 100)) };
}

export type BonusSummary = { drivers: number; started: number; reached: number; paid: number; blocked: number; budgetLeft: number | null; rows: { facts: DriverFacts; result: BonusResult }[] };

/** Today so far: drivers in the bonus, who started, who reached it, what is paid. The budget stops payouts when it runs out. */
export function bonusSummary(bonus: DriverBonus, drivers: { facts: DriverFacts; home: [number, number]; zoneId: string }[], now: number, timeZone: string): BonusSummary {
  let left = bonus.budget;
  const rows = drivers
    .filter((item) => inAudience(bonus, item.facts))
    .map(({ facts, home, zoneId }) => {
      const day = demoDay(bonus, facts, home, now, timeZone);
      const result = evaluateBonus(bonus, { ...day, rides: day.rides.map((ride) => ({ ...ride, zoneId })) }, timeZone);
      let earned = result.earned;
      if (left !== null) {
        earned = Math.min(earned, Math.max(0, left));
        left -= earned;
      }
      return { facts, result: { ...result, earned } };
    });
  return {
    drivers: rows.length,
    started: rows.filter((row) => row.result.counted > 0).length,
    reached: rows.filter((row) => row.result.earned > 0).length,
    paid: Math.round(rows.reduce((sum, row) => sum + row.result.earned, 0)),
    blocked: rows.filter((row) => !row.result.eligible && row.result.counted > 0).length,
    budgetLeft: left === null ? null : Math.max(0, Math.round(left)),
    rows,
  };
}
