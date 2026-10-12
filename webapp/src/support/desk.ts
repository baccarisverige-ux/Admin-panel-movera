import type { DemoRecord } from "../api/seed.ts";
import { MARKETS, marketOfZone, type MarketId } from "../markets/markets.ts";
import type { SupportBook } from "./ops.ts";

/**
 * Support desk: topics with time limits, sorting by topic and language, ready-made replies,
 * who works on a ticket and who solved it, the rider's rating after, and numbers per admin.
 * Messages and owners stay in the support book, so the old workspace keeps working.
 */

export const SUPPORT_DESK_KEY = "supportDesk";

export type TopicId = "ride" | "payment" | "lost" | "safety" | "account" | "app" | "pay" | "other";
export type Lang = "sv" | "en" | "fr" | "ar";

export const TOPICS: { id: TopicId; label: string; for: ("rider" | "driver")[]; words: string[] }[] = [
  { id: "ride", label: "Problem with a ride", for: ["rider", "driver"], words: ["route", "late", "driver", "ride", "trip"] },
  { id: "payment", label: "Payment or refund", for: ["rider"], words: ["charged", "refund", "card", "price", "payment"] },
  { id: "lost", label: "Lost item", for: ["rider", "driver"], words: ["forgot", "lost", "left", "phone", "bag"] },
  { id: "safety", label: "Safety", for: ["rider", "driver"], words: ["unsafe", "rude", "accident", "threat"] },
  { id: "account", label: "Account and login", for: ["rider", "driver"], words: ["login", "account", "code", "email"] },
  { id: "app", label: "The app does not work", for: ["rider", "driver"], words: ["crash", "app", "bug", "error"] },
  { id: "pay", label: "Driver pay", for: ["driver"], words: ["payout", "earnings", "bonus", "commission"] },
  { id: "other", label: "Something else", for: ["rider", "driver"], words: [] },
];

export const LANGS: Record<Lang, string> = { sv: "Swedish", en: "English", fr: "French", ar: "Arabic" };
const COUNTRY_LANGS: Record<MarketId, Lang[]> = { SE: ["sv", "sv", "en"], FR: ["fr", "fr", "en"], TN: ["ar", "fr", "fr"] };

export type Limit = { firstReplyMin: number; solveHours: number };
export type Template = { id: string; topic: TopicId | "any"; lang: Lang; title: string; text: string };
export type DeskSettings = { limits: Record<TopicId, Limit>; autoSort: boolean; rating: boolean; lateAlerts: boolean; templates: Template[] };
export type TicketState = { topic?: TopicId; waiting?: boolean; solvedBy?: string; solvedAt?: string; note?: string; rating?: number; caseIds?: string[] };
export type Desk = { draftRev: number; settings: Record<MarketId, DeskSettings>; tickets: Record<string, TicketState> };

const LIMITS: Record<TopicId, Limit> = {
  safety: { firstReplyMin: 5, solveHours: 4 },
  payment: { firstReplyMin: 60, solveHours: 24 },
  ride: { firstReplyMin: 60, solveHours: 24 },
  lost: { firstReplyMin: 30, solveHours: 48 },
  account: { firstReplyMin: 120, solveHours: 24 },
  app: { firstReplyMin: 120, solveHours: 48 },
  pay: { firstReplyMin: 120, solveHours: 48 },
  other: { firstReplyMin: 240, solveHours: 72 },
};

function templates(country: MarketId): Template[] {
  const local: Lang = country === "SE" ? "sv" : country === "FR" ? "fr" : "ar";
  const localText: Record<Lang, { hello: string; refund: string; lost: string }> = {
    sv: { hello: "Hej! Tack för att du hörde av dig. Vi tittar på det nu.", refund: "Vi har gått igenom resan och återbetalat mellanskillnaden. Den syns på kortet inom 3–5 dagar.", lost: "Vi har kontaktat föraren om din sak och hör av oss så snart vi vet mer." },
    fr: { hello: "Bonjour ! Merci de nous avoir contactés. Nous regardons cela maintenant.", refund: "Nous avons vérifié la course et remboursé la différence. Elle apparaîtra sous 3 à 5 jours.", lost: "Nous avons contacté le chauffeur au sujet de votre objet et revenons vers vous rapidement." },
    ar: { hello: "مرحبا! شكرا لتواصلك معنا. نحن ننظر في الأمر الآن.", refund: "راجعنا الرحلة وأعدنا الفرق. سيظهر خلال 3 إلى 5 أيام.", lost: "تواصلنا مع السائق بخصوص غرضك وسنعود إليك قريبا." },
    en: { hello: "Hi! Thanks for getting in touch. We are looking at it now.", refund: "We checked the ride and refunded the difference. It shows on your card within 3–5 days.", lost: "We contacted the driver about your item and will get back to you as soon as we know more." },
  };
  const make = (lang: Lang): Template[] => [
    { id: `hello-${lang}`, topic: "any", lang, title: "First answer", text: localText[lang].hello },
    { id: `refund-${lang}`, topic: "payment", lang, title: "Refund done", text: localText[lang].refund },
    { id: `lost-${lang}`, topic: "lost", lang, title: "Lost item: asked the driver", text: localText[lang].lost },
  ];
  return [...make(local), ...make("en"), ...(country === "TN" ? make("fr") : [])];
}

export function defaultDeskSettings(country: MarketId): DeskSettings {
  return { limits: { ...LIMITS }, autoSort: true, rating: true, lateAlerts: true, templates: templates(country) };
}

export function emptyDesk(): Desk {
  return { draftRev: 1, settings: { SE: defaultDeskSettings("SE"), FR: defaultDeskSettings("FR"), TN: defaultDeskSettings("TN") }, tickets: {} };
}

export function normalizeDesk(value: unknown): Desk {
  const base = emptyDesk();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<Desk>;
  const settings = { ...base.settings };
  for (const item of MARKETS) {
    const saved = raw.settings?.[item.id];
    if (saved) settings[item.id] = { ...base.settings[item.id], ...saved, limits: { ...base.settings[item.id].limits, ...saved.limits }, templates: Array.isArray(saved.templates) ? saved.templates : base.settings[item.id].templates };
  }
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, settings, tickets: raw.tickets ?? {} };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

/** The first message the person wrote. Demo text until the apps send real tickets. */
export function firstMessage(row: DemoRecord, topic: TopicId, who: "rider" | "driver"): string {
  const texts: Record<TopicId, string[]> = {
    ride: ["The driver took a much longer route than the map showed.", "My driver was 15 minutes late and the price went up."],
    payment: ["I was charged twice for the same ride.", "The price was higher than the quote. Can I get a refund?"],
    lost: ["I forgot my bag in the car this morning.", "I left my phone in the back seat."],
    safety: ["The driver was rude and drove very fast.", "I did not feel safe during the ride."],
    account: ["I cannot log in, the code never comes.", "I want to change the email on my account."],
    app: ["The app crashes when I open the map.", "The app shows an error when I try to pay."],
    pay: ["My payout is lower than my earnings show.", "I did not get the bonus for the airport area."],
    other: ["I have a question about the service.", "Can I book a car for tomorrow morning?"],
  };
  const list = texts[topic];
  const text = list[hash(row.id) % list.length];
  return who === "driver" && topic === "ride" ? "The rider gave the wrong pickup and I waited 10 minutes." : text;
}

/** Sort a ticket by its words; without words, by the demo id. */
export function autoTopic(text: string, who: "rider" | "driver", seed: number): TopicId {
  const lower = text.toLowerCase();
  const found = TOPICS.find((topic) => topic.for.includes(who) && topic.words.some((word) => lower.includes(word)));
  if (found) return found.id;
  const allowed = TOPICS.filter((topic) => topic.for.includes(who));
  return allowed[seed % allowed.length].id;
}

export type Facts = {
  id: string;
  zoneId: string;
  country: MarketId;
  who: "rider" | "driver";
  name: string;
  topic: TopicId;
  lang: Lang;
  text: string;
  openedAt: number;
  firstReplyAt: number | null;
  owner: string | null;
  state: "new" | "taken" | "waiting" | "solved";
  solvedBy: string | null;
  solvedAt: number | null;
  rating: number | null;
  replyLate: boolean;
  solveLate: boolean;
};

/** Everything the inbox needs about one ticket. */
export function factsOf(row: DemoRecord, book: SupportBook, desk: Desk, now: number, who: "rider" | "driver"): Facts {
  const country = marketOfZone(row.zoneId)?.id ?? "SE";
  const settings = desk.settings[country];
  const seed = hash(row.id);
  const state = desk.tickets[row.id] ?? {};
  const raw = TOPICS[seed % TOPICS.length].id;
  const sortTopic = autoTopic(firstMessage(row, raw, who), who, seed);
  const topic = state.topic ?? (settings.autoSort ? sortTopic : "other");
  const text = firstMessage(row, topic, who);
  const langs = COUNTRY_LANGS[country];
  const lang = langs[(seed >>> 3) % langs.length];
  const ops = book.tickets[row.id];
  const openedAt = now - (10 + (seed % (36 * 60))) * 60_000;
  const reply = ops?.messages.find((message) => message.kind === "reply");
  const firstReplyAt = reply ? Date.parse(reply.at) : row.status === "claimed" ? openedAt + (5 + (seed % 50)) * 60_000 : null;
  const owner = ops?.owner ?? (row.status === "claimed" ? ["maja", "nora", "lena"][seed % 3] : null);
  const solvedAt = state.solvedAt ? Date.parse(state.solvedAt) : null;
  const status: Facts["state"] = solvedAt ? "solved" : state.waiting ? "waiting" : owner ? "taken" : "new";
  const limit = settings.limits[topic];
  const replyLate = !firstReplyAt && now - openedAt > limit.firstReplyMin * 60_000;
  const solveLate = !solvedAt && now - openedAt > limit.solveHours * 3_600_000;
  return { id: row.id, zoneId: row.zoneId, country, who, name: row.name, topic, lang, text, openedAt, firstReplyAt, owner, state: status, solvedBy: state.solvedBy ?? null, solvedAt, rating: state.rating ?? null, replyLate, solveLate };
}

export function setTopic(desk: Desk, id: string, topic: TopicId): Desk {
  return { ...desk, draftRev: desk.draftRev + 1, tickets: { ...desk.tickets, [id]: { ...desk.tickets[id], topic } } };
}

export function setWaiting(desk: Desk, id: string, waiting: boolean): Desk {
  return { ...desk, draftRev: desk.draftRev + 1, tickets: { ...desk.tickets, [id]: { ...desk.tickets[id], waiting } } };
}

/** Solve a ticket. With ratings on, the person is asked to rate the help; the demo answer comes from the id. */
export function solve(desk: Desk, id: string, by: string, note: string, at: string, rating: boolean): { desk: Desk; error?: string } {
  if (!note.trim()) return { desk, error: "Write what you did, so the next admin knows." };
  const stars = rating ? 3 + (hash(`${id}:${at.slice(0, 10)}`) % 3) : undefined;
  return { desk: { ...desk, draftRev: desk.draftRev + 1, tickets: { ...desk.tickets, [id]: { ...desk.tickets[id], waiting: false, solvedBy: by, solvedAt: at, note: note.trim(), rating: stars } } } };
}

export function reopen(desk: Desk, id: string): Desk {
  const current = { ...desk.tickets[id] };
  delete current.solvedAt;
  delete current.solvedBy;
  delete current.rating;
  return { ...desk, draftRev: desk.draftRev + 1, tickets: { ...desk.tickets, [id]: current } };
}

export function linkCase(desk: Desk, id: string, caseId: string): Desk {
  const current = desk.tickets[id] ?? {};
  return { ...desk, draftRev: desk.draftRev + 1, tickets: { ...desk.tickets, [id]: { ...current, caseIds: [...(current.caseIds ?? []), caseId] } } };
}

export type TeamRow = { agentId: string; solved: number; open: number; avgFirstReplyMin: number | null; avgRating: number | null };

/** Numbers per admin: solved, open, first answer time and rating. */
export function teamNumbers(list: readonly Facts[]): TeamRow[] {
  const rows = new Map<string, { solved: number; open: number; replies: number[]; ratings: number[] }>();
  for (const item of list) {
    const id = item.solvedBy ?? item.owner;
    if (!id) continue;
    const row = rows.get(id) ?? { solved: 0, open: 0, replies: [], ratings: [] };
    if (item.state === "solved") row.solved += 1;
    else row.open += 1;
    if (item.firstReplyAt) row.replies.push((item.firstReplyAt - item.openedAt) / 60_000);
    if (item.rating) row.ratings.push(item.rating);
    rows.set(id, row);
  }
  const avg = (values: number[]) => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null);
  return [...rows.entries()].map(([agentId, row]) => {
    const reply = avg(row.replies);
    return { agentId, solved: row.solved, open: row.open, avgFirstReplyMin: reply === null ? null : Math.round(reply), avgRating: avg(row.ratings) };
  }).sort((a, b) => b.solved - a.solved || b.open - a.open);
}

export function templatesFor(settings: DeskSettings, topic: TopicId, lang: Lang): Template[] {
  return settings.templates.filter((item) => (item.topic === "any" || item.topic === topic) && item.lang === lang).concat(settings.templates.filter((item) => (item.topic === "any" || item.topic === topic) && item.lang !== lang));
}

export function settingsError(settings: DeskSettings): string | null {
  for (const topic of TOPICS) {
    const limit = settings.limits[topic.id];
    if (!limit || limit.firstReplyMin < 1 || limit.solveHours < 1) return `${topic.label}: limits must be at least 1.`;
    if (limit.firstReplyMin > limit.solveHours * 60) return `${topic.label}: the first answer must come before the ticket is solved.`;
  }
  if (settings.templates.some((item) => !item.title.trim() || !item.text.trim())) return "Every ready-made reply needs a title and a text.";
  return null;
}
