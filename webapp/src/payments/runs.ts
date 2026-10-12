import type { DemoRecord } from "../api/seed.ts";
import { MARKETS, market, marketOfZone, type MarketId } from "../markets/markets.ts";
import type { BankReview } from "./finance.ts";

/**
 * Payout runs: when drivers get paid in each country, instant cash-out, holds with a reason,
 * failed payouts with retry, the payout explained line by line, the fleet owner's part,
 * a second admin for big runs, and the bank file.
 */

export const PAYOUT_OPS_KEY = "payoutOps";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type Schedule = {
  every: "daily" | "weekly";
  /** 0 = Monday. */
  weekday: number;
  time: string;
  instant: { on: boolean; feePct: number; minMajor: number };
  /** A run above this total (major units) waits for a second admin. */
  approvalOverMajor: number;
  retryFailed: boolean;
  fleetPct: number;
};

export type Hold = { on: boolean; reason: string; by: string; at: string };
export type RunApproval = { run: string; by: string; at: string };

export type PayoutOps = {
  draftRev: number;
  schedules: Record<MarketId, Schedule>;
  holds: Record<string, Hold[]>;
  retries: Record<string, { at: string; by: string }[]>;
  approvals: RunApproval[];
  files: { run: string; by: string; at: string; count: number }[];
};

function schedule(country: MarketId): Schedule {
  const scale = country === "SE" ? 10 : country === "TN" ? 3 : 1;
  return { every: "weekly", weekday: 0, time: "08:00", instant: { on: country !== "TN", feePct: 1.5, minMajor: 10 * scale }, approvalOverMajor: 2_000 * scale, retryFailed: true, fleetPct: 10 };
}

export function emptyPayoutOps(): PayoutOps {
  return { draftRev: 1, schedules: { SE: schedule("SE"), FR: schedule("FR"), TN: schedule("TN") }, holds: {}, retries: {}, approvals: [], files: [] };
}

export function normalizePayoutOps(value: unknown): PayoutOps {
  const base = emptyPayoutOps();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<PayoutOps>;
  const schedules = { ...base.schedules };
  for (const item of MARKETS) {
    const saved = raw.schedules?.[item.id];
    if (saved) schedules[item.id] = { ...base.schedules[item.id], ...saved, instant: { ...base.schedules[item.id].instant, ...saved.instant } };
  }
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, schedules, holds: raw.holds ?? {}, retries: raw.retries ?? {}, approvals: Array.isArray(raw.approvals) ? raw.approvals : [], files: Array.isArray(raw.files) ? raw.files : [] };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

export function countryOfPayout(record: DemoRecord): MarketId {
  return marketOfZone(record.zoneId)?.id ?? "SE";
}

export function holdOf(ops: PayoutOps, id: string): Hold | null {
  const last = ops.holds[id]?.at(-1);
  return last?.on ? last : null;
}

export function setHold(ops: PayoutOps, id: string, on: boolean, reason: string, by: string, at: string): { ops: PayoutOps; error?: string } {
  if (on && !reason.trim()) return { ops, error: "Say why the payout is held." };
  return { ops: { ...ops, draftRev: ops.draftRev + 1, holds: { ...ops.holds, [id]: [...(ops.holds[id] ?? []), { on, reason: reason.trim(), by, at }] } } };
}

/** Demo: payouts whose id ends in 7 failed at the bank, until someone retries them. */
export function failedOf(ops: PayoutOps, record: DemoRecord): string | null {
  if (!/7$/.test(record.id)) return null;
  if (ops.retries[record.id]?.length) return null;
  return "The bank returned the payment: account closed or wrong.";
}

export function retryPayout(ops: PayoutOps, id: string, by: string, at: string): PayoutOps {
  return { ...ops, draftRev: ops.draftRev + 1, retries: { ...ops.retries, [id]: [...(ops.retries[id] ?? []), { at, by }] } };
}

export type Line = { label: string; minor: number; kind: "plus" | "minus" | "total"; help?: string };

/**
 * The payout explained. The record holds the amount the driver gets; the lines are worked out
 * so they add up to it exactly: trips, bonuses and tips, minus commission, the fleet owner's
 * part, fees and debts.
 */
export function payoutLines(record: DemoRecord, fleet: boolean, sched: Schedule): { lines: Line[]; trips: number; fleetMinor: number; instant: boolean } {
  const net = record.fareOre ?? 0;
  const seed = hash(record.id);
  const minor = market(countryOfPayout(record)).minorUnits;
  const round = (value: number) => Math.round(value / minor) * minor;
  const bonus = seed % 3 === 0 ? round(net * 0.08) : 0;
  const tips = round(net * (0.02 + (seed % 5) / 100));
  const instant = sched.instant.on && seed % 4 === 1;
  const debts = seed % 5 === 2 ? round(net * 0.04) : 0;
  const fee = instant ? Math.round(net * (sched.instant.feePct / 100)) : 0;
  const fleetPct = fleet ? sched.fleetPct / 100 : 0;
  // net = G − cG − fleet·(G − cG) + bonus + tips − fee − debts
  const gross = Math.round((net - bonus - tips + fee + debts) / ((1 - 0.2) * (1 - fleetPct)));
  const fleetMinor = Math.round((gross - Math.round(gross * 0.2)) * fleetPct);
  // Whatever rounding is left goes into the commission line, so the lines always add up.
  const commission = gross - fleetMinor + bonus + tips - fee - debts - net;
  const trips = Math.max(1, Math.round(gross / (minor * (minor === 100 ? 1.6 : 1) * 160)));
  const lines: Line[] = [
    { label: `${trips} trips`, minor: gross, kind: "plus", help: "What riders paid for the driver's rides, before commission." },
    ...(bonus ? [{ label: "Bonuses", minor: bonus, kind: "plus" as const, help: "Ride and area bonuses earned this period." }] : []),
    { label: "Tips", minor: tips, kind: "plus", help: "Tips go to the driver in full." },
    { label: "Movera commission 20%", minor: -commission, kind: "minus", help: "From the zone's price book." },
    ...(fleetMinor ? [{ label: `Fleet owner ${sched.fleetPct}%`, minor: -fleetMinor, kind: "minus" as const, help: "Paid to the driver's fleet owner." }] : []),
    ...(fee ? [{ label: `Instant cash-out fee ${sched.instant.feePct}%`, minor: -fee, kind: "minus" as const }] : []),
    ...(debts ? [{ label: "Debts (cash rides, damage)", minor: -debts, kind: "minus" as const, help: "Money the driver owes Movera." }] : []),
    { label: "Driver gets", minor: net, kind: "total" },
  ];
  return { lines, trips, fleetMinor, instant };
}

/** The next run date for the country's schedule, in the country's time. */
export function nextRun(sched: Schedule, now: number, timeZone: string): string {
  const short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdayOf = (ms: number) => short.indexOf(new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(new Date(ms)));
  const dateOf = (ms: number) => new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(now));
  for (let add = 0; add < 8; add += 1) {
    const at = now + add * 86_400_000;
    if (add === 0 && clock >= sched.time) continue;
    if (sched.every === "daily" || weekdayOf(at) === sched.weekday) return `${dateOf(at)} ${sched.time}`;
  }
  return sched.time;
}

export function runNeedsApproval(totalMinor: number, country: MarketId, sched: Schedule): boolean {
  return totalMinor > sched.approvalOverMajor * market(country).minorUnits;
}

export function runApproved(ops: PayoutOps, run: string): RunApproval | null {
  return ops.approvals.find((item) => item.run === run) ?? null;
}

export function approveRun(ops: PayoutOps, run: string, by: string, at: string, startedBy: string): { ops: PayoutOps; error?: string } {
  if (runApproved(ops, run)) return { ops, error: "Already approved." };
  if (by === startedBy) return { ops, error: "A second admin must approve the run." };
  return { ops: { ...ops, draftRev: ops.draftRev + 1, approvals: [...ops.approvals, { run, by, at }] } };
}

export type FileRow = { id: string; driver: string; iban: string; bic: string; amount: number; reference: string };

/** The bank file: one line per payout that can be paid (bank approved, not held, not failed). */
export function bankFile(rows: readonly FileRow[], currency: string): string {
  const head = "payout_id;driver;iban;bic;amount;currency;reference";
  const lines = rows.map((row) => [row.id, row.driver, row.iban.replace(/\s/g, ""), row.bic, (row.amount / 100).toFixed(2), currency, row.reference].map((cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(";"));
  return [head, ...lines].join("\n");
}

export function bankReady(bank: BankReview, hold: Hold | null, failed: string | null): string | null {
  if (hold) return `On hold: ${hold.reason}`;
  if (failed) return "Failed at the bank. Retry first.";
  if (bank.status !== "approved") return "Bank details are not approved.";
  return null;
}

export function scheduleError(sched: Schedule): string | null {
  if (!/^\d{2}:\d{2}$/.test(sched.time)) return "Write the time as HH:MM.";
  if (sched.instant.on && (sched.instant.feePct < 0 || sched.instant.feePct > 10)) return "The instant cash-out fee must be 0 to 10%.";
  if (sched.instant.on && sched.instant.minMajor < 0) return "The smallest cash-out must be zero or more.";
  if (sched.approvalOverMajor < 0) return "The approval amount must be zero or more.";
  if (sched.fleetPct < 0 || sched.fleetPct > 50) return "The fleet owner part must be 0 to 50%.";
  return null;
}

export function scheduleLine(sched: Schedule): string {
  return sched.every === "daily" ? `Every day at ${sched.time}` : `Every ${WEEKDAYS[sched.weekday]} at ${sched.time}`;
}
