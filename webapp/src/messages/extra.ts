import type { MarketId } from "../markets/markets.ts";

/**
 * More for Messages: who gets a campaign (groups), the country's languages, results,
 * how many messages one person can get per week, quiet hours, and automatic messages.
 */

export const MSG_OPS_KEY = "messageOps";

export type Lang = "sv" | "en" | "fr" | "ar";
export const COUNTRY_LANGS: Record<MarketId, Lang[]> = { SE: ["sv", "en"], FR: ["fr", "en"], TN: ["ar", "fr"] };
export const LANG_LABEL: Record<Lang, string> = { sv: "Swedish", en: "English", fr: "French", ar: "Arabic" };

export const GROUPS: { id: string; label: string; app: "rider" | "driver" }[] = [
  { id: "all", label: "Everyone in the zone", app: "rider" },
  { id: "new", label: "New riders (first 30 days)", app: "rider" },
  { id: "top", label: "Top riders", app: "rider" },
  { id: "inactive", label: "Riders inactive for 30 days", app: "rider" },
  { id: "category", label: "Riders of a category", app: "rider" },
  { id: "all-drivers", label: "Every driver in the zone", app: "driver" },
  { id: "new-drivers", label: "New drivers", app: "driver" },
  { id: "radar", label: "Drivers on the radar now", app: "driver" },
  { id: "fleet", label: "Drivers of a fleet", app: "driver" },
];

export type Extra = { group: string; texts: Partial<Record<Lang, string>> };
export type SendRules = { weeklyCap: { on: boolean; max: number }; quiet: { on: boolean; from: string; to: string } };
export type AutoTrigger = "inactive" | "first_ride" | "searched_no_booking" | "low_rating" | "doc_expiring";
export type AutoMessage = { id: string; name: string; trigger: AutoTrigger; app: "rider" | "driver"; days: number; channel: "push" | "sms"; text: string; on: boolean; country: MarketId };

export const TRIGGERS: { id: AutoTrigger; label: string; app: "rider" | "driver"; days: boolean }[] = [
  { id: "inactive", label: "Rider has not ridden for some days", app: "rider", days: true },
  { id: "first_ride", label: "After the rider's first ride", app: "rider", days: false },
  { id: "searched_no_booking", label: "Rider looked at prices but did not book", app: "rider", days: false },
  { id: "low_rating", label: "Driver got a low rating", app: "driver", days: false },
  { id: "doc_expiring", label: "Driver's paper expires in some days", app: "driver", days: true },
];

export type MessageOps = { draftRev: number; extra: Record<string, Extra>; rules: Record<MarketId, SendRules>; autos: AutoMessage[] };

export function emptyMessageOps(): MessageOps {
  const rules: SendRules = { weeklyCap: { on: true, max: 3 }, quiet: { on: true, from: "21:00", to: "08:00" } };
  return {
    draftRev: 1,
    extra: {},
    rules: { SE: rules, FR: rules, TN: { ...rules, quiet: { on: true, from: "22:00", to: "07:00" } } },
    autos: [
      { id: "A-1", name: "We miss you", trigger: "inactive", app: "rider", days: 30, channel: "push", text: "We miss you! Here is 20% off your next ride.", on: true, country: "SE" },
      { id: "A-2", name: "Thanks for the first ride", trigger: "first_ride", app: "rider", days: 0, channel: "push", text: "Thanks for riding with Movera. Rate your driver in the app.", on: true, country: "SE" },
      { id: "A-3", name: "Paper expires soon", trigger: "doc_expiring", app: "driver", days: 14, channel: "sms", text: "A paper expires soon. Upload the new one in the Driver app.", on: true, country: "SE" },
    ],
  };
}

export function normalizeMessageOps(value: unknown): MessageOps {
  const base = emptyMessageOps();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<MessageOps>;
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, extra: raw.extra ?? {}, rules: { ...base.rules, ...(raw.rules ?? {}) }, autos: Array.isArray(raw.autos) ? raw.autos : base.autos };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

/** Demo results until the push and SMS providers report: sent, opened and rides in the 7 days after. */
export function campaignResults(id: string, audience: number, status: string): { sent: number; opened: number; openPct: number; rides: number } {
  if (status !== "published" && status !== "expired") return { sent: 0, opened: 0, openPct: 0, rides: 0 };
  const seed = hash(id);
  const sent = Math.max(audience, 40 + (seed % 400));
  const openPct = 18 + (seed % 35);
  const opened = Math.round((sent * openPct) / 100);
  return { sent, opened, openPct, rides: Math.round(opened * (0.1 + ((seed >>> 3) % 20) / 100)) };
}

/** Is the time inside quiet hours? Messages wait until quiet hours end. */
export function inQuietHours(time: string, rules: SendRules): boolean {
  if (!rules.quiet.on) return false;
  const { from, to } = rules.quiet;
  return from <= to ? time >= from && time < to : time >= from || time < to;
}

export function rulesError(rules: SendRules): string | null {
  if (rules.weeklyCap.on && (rules.weeklyCap.max < 1 || rules.weeklyCap.max > 50)) return "A person can get 1 to 50 messages a week.";
  if (rules.quiet.on && (!/^\d{2}:\d{2}$/.test(rules.quiet.from) || !/^\d{2}:\d{2}$/.test(rules.quiet.to) || rules.quiet.from === rules.quiet.to)) return "Quiet hours need a start and a different end, as HH:MM.";
  return null;
}

export function autoError(auto: AutoMessage): string | null {
  if (!auto.name.trim()) return "Give the automatic message a name.";
  if (!auto.text.trim()) return "Write the message.";
  if (TRIGGERS.find((item) => item.id === auto.trigger)?.days && (auto.days < 1 || auto.days > 365)) return "Days must be 1 to 365.";
  return null;
}
