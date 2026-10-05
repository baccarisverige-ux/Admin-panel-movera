import { assignReservation, cancelReservation, GIVE_UP_MINUTES, needsDriverSoon } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const soon = { id: "B1", pickupAt: "2026-10-05T11:30:00Z", driverId: null, policyVersion: "res-2", status: "booked" as const };
assert(needsDriverSoon(soon, "2026-10-05T10:40:00Z"), "under 60 minutes without a driver");
assert(!needsDriverSoon(soon, "2026-10-05T09:00:00Z"), "not flagged when there is time");
const assigned = assignReservation(soon, "D1");
assert(!needsDriverSoon(assigned, "2026-10-05T10:40:00Z"), "assigned is not flagged");
const cancelled = cancelReservation(assigned);
assert(cancelled.status === "cancelled" && cancelled.policyVersion === "res-2", "policy version stays");
assert(GIVE_UP_MINUTES === 5, "give-up default");

console.log("reservations ok");
