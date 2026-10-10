/** Wall-clock helpers for a named time zone, built on Intl so they also run in Node tests. */

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, found);
  }
  return found;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local date and time at `ms`; weekday 0 is Monday. */
export function localParts(ms: number, timeZone: string): LocalParts {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(ms).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function offsetMs(ms: number, timeZone: string): number {
  const p = localParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

/** The instant when the local clock in `timeZone` reads the given date and hour. */
export function zonedTime(year: number, month: number, day: number, hour: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, hour);
  let result = guess - offsetMs(guess, timeZone);
  result = guess - offsetMs(result, timeZone);
  return result;
}

/** Local midnight that starts the day containing `ms`, shifted by `days`. */
export function startOfLocalDay(ms: number, timeZone: string, days = 0): number {
  const p = localParts(ms, timeZone);
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedTime(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, timeZone);
}

/** `YYYY-MM-DD` of the local day containing `ms`. */
export function localDay(ms: number, timeZone: string): string {
  const p = localParts(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Local midnight of a `YYYY-MM-DD` day. */
export function dayStart(day: string, timeZone: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return zonedTime(year, month, date, 0, timeZone);
}

export function addLocalDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + days));
  return next.toISOString().slice(0, 10);
}
