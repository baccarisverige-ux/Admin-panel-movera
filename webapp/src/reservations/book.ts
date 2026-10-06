import type { DemoRecord } from "../api/seed.ts";

export type ReservationStatus = "waiting" | "booked" | "assigned" | "cancelled" | "completed";

export type ReservationPolicy = {
  version: string;
  bookingHorizonDays: number;
  assignmentLeadMinutes: number;
  giveUpMinutes: number;
  includedWaitingMinutes: number;
  freeCancelAfterAcceptMinutes: number;
};

export type Reservation = {
  id: string;
  pickupAt: string;
  driverId: string | null;
  policyVersion: string;
  status: ReservationStatus;
};

export type ReservationContact = {
  id: string;
  at: string;
  actorId: string;
  channel: "call" | "sms";
  note: string;
};

export type ReservationOffer = {
  id: string;
  at: string;
  actorId: string;
  driverId: string;
  result: "offered" | "accepted" | "declined" | "expired";
};

export type ReservationOps = {
  reservationId: string;
  pickupAt: string;
  returnPickupAt: string | null;
  category: DemoRecord["category"];
  policy: ReservationPolicy;
  contacts: ReservationContact[];
  offers: ReservationOffer[];
  activity: string[];
};

export type ReservationBook = {
  draftRev: number;
  currentPolicy: ReservationPolicy;
  policies: Record<string, ReservationPolicy>;
  reservations: Record<string, ReservationOps>;
};

export const GIVE_UP_MINUTES = 5;

export const DEFAULT_RESERVATION_POLICY: ReservationPolicy = {
  version: "res-2",
  bookingHorizonDays: 7,
  assignmentLeadMinutes: 30,
  giveUpMinutes: GIVE_UP_MINUTES,
  includedWaitingMinutes: 5,
  freeCancelAfterAcceptMinutes: 2,
};

export const LEGACY_RESERVATION_POLICY: ReservationPolicy = {
  version: "res-1",
  bookingHorizonDays: 5,
  assignmentLeadMinutes: 45,
  giveUpMinutes: 5,
  includedWaitingMinutes: 5,
  freeCancelAfterAcceptMinutes: 0,
};

export function emptyReservationBook(): ReservationBook {
  return {
    draftRev: 1,
    currentPolicy: { ...DEFAULT_RESERVATION_POLICY },
    policies: {
      [LEGACY_RESERVATION_POLICY.version]: { ...LEGACY_RESERVATION_POLICY },
      [DEFAULT_RESERVATION_POLICY.version]: { ...DEFAULT_RESERVATION_POLICY },
    },
    reservations: {},
  };
}

export function normalizeReservationBook(value: unknown): ReservationBook {
  if (!value || typeof value !== "object") return emptyReservationBook();
  const raw = value as Partial<ReservationBook>;
  const currentPolicy = raw.currentPolicy ? { ...DEFAULT_RESERVATION_POLICY, ...raw.currentPolicy } : { ...DEFAULT_RESERVATION_POLICY };
  return {
    draftRev: typeof raw.draftRev === "number" && raw.draftRev > 0 ? raw.draftRev : 1,
    currentPolicy,
    policies: raw.policies && typeof raw.policies === "object"
      ? structuredClone(raw.policies)
      : {
          [LEGACY_RESERVATION_POLICY.version]: { ...LEGACY_RESERVATION_POLICY },
          [DEFAULT_RESERVATION_POLICY.version]: { ...DEFAULT_RESERVATION_POLICY },
          [currentPolicy.version]: { ...currentPolicy },
        },
    reservations: raw.reservations && typeof raw.reservations === "object" ? structuredClone(raw.reservations) : {},
  };
}

function reservationIndex(id: string): number {
  const parsed = Number(id.replace(/\D/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
}

function fallbackPickupAt(record: Pick<DemoRecord, "id">): string {
  const index = reservationIndex(record.id);
  return new Date(Date.parse("2026-10-06T06:30:00.000Z") + index * 45 * 60_000).toISOString();
}

function fallbackCategory(record: Pick<DemoRecord, "id" | "category">): DemoRecord["category"] {
  if (record.category) return record.category;
  const categories: NonNullable<DemoRecord["category"]>[] = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet"];
  return categories[reservationIndex(record.id) % categories.length];
}

export function reservationOps(book: ReservationBook, record: DemoRecord): ReservationOps {
  const stored = book.reservations[record.id];
  if (stored) return stored;
  const pickupAt = record.pickupAt ?? fallbackPickupAt(record);
  const returnPickupAt = record.returnAt ?? (reservationIndex(record.id) % 8 === 0
    ? new Date(Date.parse(pickupAt) + 8 * 60 * 60_000).toISOString()
    : null);
  return {
    reservationId: record.id,
    pickupAt,
    returnPickupAt,
    category: fallbackCategory(record),
    policy: {
      ...(book.policies[record.policyVersion ?? book.currentPolicy.version] ?? book.currentPolicy),
      version: record.policyVersion ?? book.currentPolicy.version,
    },
    contacts: [],
    offers: [],
    activity: [`Reservation ${record.id} opened with policy ${record.policyVersion ?? book.currentPolicy.version}`],
  };
}

function withOps(book: ReservationBook, record: DemoRecord, next: ReservationOps): ReservationBook {
  return {
    ...book,
    draftRev: book.draftRev + 1,
    reservations: { ...book.reservations, [record.id]: next },
  };
}

export function minutesUntil(pickupAt: string, nowIso: string): number {
  return (Date.parse(pickupAt) - Date.parse(nowIso)) / 60000;
}

export function needsDriverSoon(reservation: Reservation, nowIso: string): boolean {
  return reservation.status === "booked" && !reservation.driverId && minutesUntil(reservation.pickupAt, nowIso) < 60;
}

export function reservationWarning(record: DemoRecord, ops: ReservationOps, nowIso: string): string | null {
  if (record.status === "cancelled" || record.status === "completed") return null;
  const minutes = minutesUntil(ops.pickupAt, nowIso);
  if (minutes < 0) return "Pickup time has passed.";
  if (!record.driverId && minutes <= ops.policy.giveUpMinutes) return `Give-up threshold reached: ${ops.policy.giveUpMinutes} minutes.`;
  if (!record.driverId && minutes < 60) return "Needs a driver within 60 minutes.";
  if (!record.driverId && minutes <= ops.policy.assignmentLeadMinutes) return `Inside assignment lead: ${ops.policy.assignmentLeadMinutes} minutes.`;
  return null;
}

export function assignReservation(reservation: Reservation, driverId: string): Reservation {
  return { ...reservation, driverId, status: "assigned" };
}

export function cancelReservation(reservation: Reservation): Reservation {
  return { ...reservation, status: "cancelled", driverId: reservation.driverId };
}

export function unassignReservation(record: DemoRecord): Partial<DemoRecord> {
  if (record.status === "cancelled" || record.status === "completed") return {};
  return { driverId: null, status: "waiting" };
}

export function reservationCandidates(
  record: DemoRecord,
  ops: ReservationOps,
  drivers: readonly DemoRecord[],
  vehicles: readonly DemoRecord[],
): DemoRecord[] {
  return drivers.filter((driver) => {
    if (driver.status !== "active") return false;
    if (driver.id === record.driverId) return false;
    const vehicle = vehicles.find((item) => item.driverId === driver.id);
    if (!vehicle || vehicle.status !== "eligible") return false;
    return vehicle.category === ops.category;
  });
}

export function touchReservation(
  book: ReservationBook,
  record: DemoRecord,
  actorId: string,
  message: string,
): ReservationBook {
  const current = reservationOps(book, record);
  return withOps(book, record, {
    ...current,
    activity: [`${message} · ${actorId}`, ...current.activity].slice(0, 40),
  });
}

export function recordReservationContact(
  book: ReservationBook,
  record: DemoRecord,
  actorId: string,
  channel: ReservationContact["channel"],
  note: string,
  nowIso: string,
): { book: ReservationBook; error?: string } {
  if (!note.trim()) return { book, error: "A contact note is required." };
  const current = reservationOps(book, record);
  const contact: ReservationContact = {
    id: `${record.id}-contact-${current.contacts.length + 1}`,
    at: nowIso,
    actorId,
    channel,
    note: note.trim(),
  };
  return {
    book: withOps(book, record, {
      ...current,
      contacts: [contact, ...current.contacts],
      activity: [`${channel.toUpperCase()} contact logged by ${actorId}: ${note.trim()}`, ...current.activity].slice(0, 40),
    }),
  };
}

export function recordReservationOffer(
  book: ReservationBook,
  record: DemoRecord,
  driverId: string,
  actorId: string,
  result: ReservationOffer["result"],
  nowIso: string,
): ReservationBook {
  const current = reservationOps(book, record);
  const offer: ReservationOffer = {
    id: `${record.id}-offer-${current.offers.length + 1}`,
    at: nowIso,
    actorId,
    driverId,
    result,
  };
  return withOps(book, record, {
    ...current,
    offers: [offer, ...current.offers],
    activity: [`Offer ${result} for ${driverId} by ${actorId}`, ...current.activity].slice(0, 40),
  });
}

export function scheduleReturnRide(
  book: ReservationBook,
  record: DemoRecord,
  returnPickupAt: string | null,
  actorId: string,
): { book: ReservationBook; error?: string } {
  const current = reservationOps(book, record);
  if (returnPickupAt) {
    const when = Date.parse(returnPickupAt);
    if (!Number.isFinite(when)) return { book, error: "Return pickup time is invalid." };
    if (when <= Date.parse(current.pickupAt)) return { book, error: "Return pickup must be after the outbound pickup." };
  }
  return {
    book: withOps(book, record, {
      ...current,
      returnPickupAt,
      activity: [returnPickupAt ? `Return ride scheduled by ${actorId}` : `Return ride removed by ${actorId}`, ...current.activity].slice(0, 40),
    }),
  };
}

export function saveReservationPolicy(
  book: ReservationBook,
  next: ReservationPolicy,
  actorId: string,
): { book: ReservationBook; error?: string } {
  const integers: [string, number, number, number][] = [
    ["Booking horizon", next.bookingHorizonDays, 1, 30],
    ["Assignment lead", next.assignmentLeadMinutes, 5, 240],
    ["Give-up time", next.giveUpMinutes, 1, 60],
    ["Included waiting", next.includedWaitingMinutes, 0, 60],
    ["Free-cancel window", next.freeCancelAfterAcceptMinutes, 0, 30],
  ];
  for (const [label, value, min, max] of integers) {
    if (!Number.isInteger(value) || value < min || value > max) {
      return { book, error: `${label} must be a whole number from ${min} to ${max}.` };
    }
  }
  if (next.giveUpMinutes > next.assignmentLeadMinutes) {
    return { book, error: "Give-up time cannot exceed assignment lead time." };
  }
  const versionNumber = Number(book.currentPolicy.version.replace(/\D/g, "")) || 1;
  const currentPolicy = { ...next, version: `res-${versionNumber + 1}` };
  return {
    book: {
      ...book,
      draftRev: book.draftRev + 1,
      currentPolicy,
      policies: { ...book.policies, [currentPolicy.version]: { ...currentPolicy } },
      reservations: { ...book.reservations },
    },
  };
}

const STOCKHOLM = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function stockholmLocalValue(iso: string): string {
  const parts = Object.fromEntries(STOCKHOLM.formatToParts(new Date(iso)).map((item) => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function stockholmLabel(iso: string): string {
  return STOCKHOLM.format(new Date(iso)).replace(" ", " · ");
}

export function stockholmLocalToIso(
  local: string,
  disambiguation: "earlier" | "later" = "earlier",
): { iso?: string; error?: string; ambiguous?: boolean } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return { error: "Use a valid local Stockholm date and time." };
  const [, year, month, day, hour, minute] = match;
  const naive = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const candidates = [60, 120]
    .map((offsetMinutes) => new Date(naive - offsetMinutes * 60_000).toISOString())
    .filter((iso, index, all) => stockholmLocalValue(iso) === local && all.indexOf(iso) === index)
    .sort();
  if (candidates.length === 0) return { error: "That Stockholm local time does not exist because of the DST clock change." };
  const iso = disambiguation === "later" ? candidates[candidates.length - 1] : candidates[0];
  return { iso, ambiguous: candidates.length > 1 };
}
