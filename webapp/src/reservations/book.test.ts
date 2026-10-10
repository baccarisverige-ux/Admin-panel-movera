import {
  DEFAULT_RESERVATION_POLICY,
  GIVE_UP_MINUTES,
  assignReservation,
  cancelReservation,
  emptyReservationBook,
  needsDriverSoon,
  normalizeReservationBook,
  recordReservationContact,
  reservationCandidates,
  reservationOps,
  reservationWarning,
  saveReservationPolicy,
  scheduleReturnRide,
  stockholmLocalToIso,
} from "./book.ts";
import type { DemoRecord } from "../api/seed.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const soon = { id: "B1", pickupAt: "2026-10-05T11:30:00Z", driverId: null, policyVersion: "res-2", status: "booked" as const };
assert(needsDriverSoon(soon, "2026-10-05T10:40:00Z"), "under 60 minutes without a driver");
assert(!needsDriverSoon(soon, "2026-10-05T09:00:00Z"), "not flagged when there is time");
const assigned = assignReservation(soon, "D1");
assert(assigned.status === "assigned" && !needsDriverSoon(assigned, "2026-10-05T10:40:00Z"), "assignment updates status and warning");
const cancelled = cancelReservation(assigned);
assert(cancelled.status === "cancelled" && cancelled.policyVersion === "res-2", "policy version stays after cancel");
assert(GIVE_UP_MINUTES === 5, "give-up default");

let book = emptyReservationBook();
const record: DemoRecord = {
  id: "B021",
  name: "Rider",
  phone: "+46 70 100 00 21",
  zoneId: "Z001",
  status: "waiting",
  driverId: null,
  category: "economy",
  pickupAt: "2026-10-06T12:00:00.000Z",
  returnAt: null,
  policyVersion: "res-1",
};

const oldOps = reservationOps(book, record);
assert(oldOps.policy.version === "res-1", "reservation uses its stored policy version");
assert(oldOps.policy.bookingHorizonDays === 5, "legacy policy snapshot values resolve");

const nextPolicy = { ...DEFAULT_RESERVATION_POLICY, bookingHorizonDays: 10 };
const policySave = saveReservationPolicy(book, nextPolicy);
assert(!policySave.error, "valid policy saves");
book = policySave.book;
assert(book.currentPolicy.version === "res-3", "policy save creates a new version");
assert(reservationOps(book, record).policy.version === "res-1", "old booking still points at res-1");
assert(reservationOps(book, record).policy.bookingHorizonDays === 5, "old booking values remain immutable");

const giveUpRecord: DemoRecord = { ...record, id: "B022", pickupAt: "2026-10-06T10:04:00.000Z", policyVersion: "res-2" };
const giveUpOps = reservationOps(book, giveUpRecord);
assert(reservationWarning(giveUpRecord, giveUpOps, "2026-10-06T10:00:00.000Z")?.includes("Give-up"), "give-up warning wins at threshold");

const drivers: DemoRecord[] = [
  { id: "D1", name: "Eligible", phone: "", zoneId: "Z001", status: "active" },
  { id: "D2", name: "Suspended", phone: "", zoneId: "Z001", status: "suspended" },
  { id: "D3", name: "Wrong category", phone: "", zoneId: "Z001", status: "active" },
];
const vehicles: DemoRecord[] = [
  { id: "V1", name: "", phone: "", zoneId: "Z001", status: "eligible", driverId: "D1", category: "economy" },
  { id: "V2", name: "", phone: "", zoneId: "Z001", status: "eligible", driverId: "D2", category: "economy" },
  { id: "V3", name: "", phone: "", zoneId: "Z001", status: "eligible", driverId: "D3", category: "premium" },
];
assert(reservationCandidates(record, reservationOps(book, record), drivers, vehicles).map((item) => item.id).join() === "D1", "candidate requires active driver and eligible matching vehicle");

const contact = recordReservationContact(book, record, "daniel", "sms", "Pickup confirmed", "2026-10-06T10:00:00.000Z");
assert(!contact.error, "contact note saves");
book = contact.book;
assert(reservationOps(book, record).contacts[0]?.channel === "sms", "contact history persists");

const badReturn = scheduleReturnRide(book, record, "2026-10-06T11:00:00.000Z", "daniel");
assert(badReturn.error?.includes("after"), "return must be after outbound pickup");
const goodReturn = scheduleReturnRide(book, record, "2026-10-06T18:00:00.000Z", "daniel");
assert(!goodReturn.error, "later return ride saves");

const springGap = stockholmLocalToIso("2026-03-29T02:30");
assert(springGap.error?.includes("does not exist"), "spring-forward missing local time is rejected");
const fallEarlier = stockholmLocalToIso("2026-10-25T02:30", "earlier");
const fallLater = stockholmLocalToIso("2026-10-25T02:30", "later");
assert(fallEarlier.ambiguous && fallLater.ambiguous, "fall-back repeated local time is marked ambiguous");
assert(Boolean(fallEarlier.iso && fallLater.iso), "both repeated-hour choices resolve");
assert(Math.abs(Date.parse(fallLater.iso!) - Date.parse(fallEarlier.iso!)) === 60 * 60_000, "repeated-hour choices are one hour apart");

assert(normalizeReservationBook({}).currentPolicy.version === "res-2", "empty legacy slice normalizes safely");

console.log("reservations ok");

import { reservationClosed } from "./book.ts";
if (!reservationClosed("no_show") || !reservationClosed("cancelled") || reservationClosed("assigned")) throw new Error("no-show is a closed reservation status");
