import { createFixtureAdminApi } from "./create.ts";
import { PHONE, PLATE, TRIP_ID, createSeed } from "./seed.ts";
import { statusLabel } from "../domain/labels.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = createSeed();
assert(seed.drivers.length === 60, "60 drivers");
assert(seed.vehicles.length === 45, "45 vehicles");
assert(seed.fleets.length === 3, "3 fleets");
assert(seed.riders.length === 250, "250 riders");
assert(seed.trips.length === 600, "600 trips");
assert(seed.reservations.length === 40, "40 reservations");
assert(seed.tickets.length === 35, "35 tickets");
assert(seed.incidents.length === 6, "6 incidents");
assert(seed.payments.length === 300, "300 payments");
assert(seed.refunds.length === 20, "20 refunds");
assert(seed.templates.length === 19, "19 templates");
assert(seed.banners.length === 6, "6 banners");
assert(seed.events.length === 4, "4 events");
assert(seed.bonuses.length === 3, "3 bonuses");
assert(seed.staff.length === 12, "12 staff");
assert(statusLabel("in_trip") === "On a trip", "status label");
assert(!statusLabel("in_trip").includes("_"), "no raw status");
const r1 = seed.riders.find((rider) => rider.id === "R0001");
const r2 = seed.riders.find((rider) => rider.id === "R0002");
assert(r1 && r2 && r1.phone !== r2.phone, "R0001 and R0002 must not share a phone");
assert(r1?.phone === PHONE, "R0001 keeps the known demo phone");

const api = createFixtureAdminApi(0);
await api.reset();
const plate = await api.search(PLATE, null);
assert(plate.some((hit) => hit.path.startsWith("/vehicles/")), "plate search");
const trip = await api.search(TRIP_ID, null);
assert(trip.some((hit) => hit.id === TRIP_ID), "trip search");
const phone = await api.search(PHONE, null);
assert(phone.some((hit) => hit.kind === "rider"), "phone search");
await api.setFault("409");
await api.command({ action: "admin.rider.block", targetId: "R0001", reason: "Safety review", actorId: "nora", before: "active", after: "blocked" }).then(
  () => {
    throw new Error("409 should reject");
  },
  (error: unknown) => {
    assert(error instanceof Error && /newest version/.test(error.message), "409 message");
  },
);
await api.setFault("none");
await api.reset();
const fresh = await api.list("drivers", null);
assert(fresh.length === 60, "reset restores drivers");
const scoped = await api.list("drivers", ["Z001", "Z002"]);
assert(scoped.length > 0 && scoped.every((row) => row.zoneId === "Z001" || row.zoneId === "Z002"), "list respects multi-zone scope");
const hiddenPlate = await api.search(PLATE, ["Z009"]);
assert(hiddenPlate.length === 0, "search cannot escape its allowed zones");

await api.reset();
const rev = await api.revision();
const first = await api.command({
  action: "admin.rider.block",
  targetId: "R0001",
  reason: "Safety review",
  actorId: "nora",
  actorRole: "super",
  actorScope: { zones: "all", market: "SE-STO" },
  scope: "Z001",
  idempotencyKey: "block-r1",
  expectedRev: rev,
  entityState: "active",
  before: "active",
  after: "blocked",
  collection: "riders",
  patch: { status: "blocked" },
});
const replay = await api.command({
  action: "admin.rider.block",
  targetId: "R0001",
  reason: "Safety review",
  actorId: "nora",
  actorRole: "super",
  actorScope: { zones: "all", market: "SE-STO" },
  scope: "Z001",
  idempotencyKey: "block-r1",
  expectedRev: rev,
  entityState: "active",
  before: "active",
  after: "blocked",
  collection: "riders",
  patch: { status: "blocked" },
});
assert(first.operationId === replay.operationId && first.rev === replay.rev, "same idempotency key replays one effect");
const afterReplayAudit = await api.audit();
assert(afterReplayAudit.filter((entry) => entry.operationId === first.operationId).length === 1, "replay creates one audit entry");

await api.command({
  action: "admin.rider.block",
  targetId: "R0002",
  reason: "Safety review",
  actorId: "nora",
  actorRole: "super",
  actorScope: { zones: "all", market: "SE-STO" },
  scope: "Z002",
  idempotencyKey: "stale-r2",
  expectedRev: rev,
  before: "active",
  after: "blocked",
}).then(
  () => { throw new Error("stale revision should reject"); },
  (error: unknown) => assert(error instanceof Error && /newest version/.test(error.message), "stale revision is a truthful conflict"),
);

const deniedRev = await api.revision();
await api.command({
  action: "admin.payment.refund",
  targetId: "PAY0001",
  reason: "Safety review",
  actorId: "maja",
  actorRole: "support",
  actorScope: { zones: ["Z001"], market: "SE-STO" },
  scope: "Z001",
  idempotencyKey: "support-refund",
  expectedRev: deniedRev,
  before: "captured",
  after: "refunded",
  amountOre: 10_000,
}).then(
  () => { throw new Error("support refund should reject"); },
  (error: unknown) => assert(error instanceof Error && /role/.test(error.message), "permission denial comes from ActionSpec"),
);

const approvalRev = await api.revision();
const pending = await api.command({
  action: "admin.audit.refund250",
  targetId: "RF-LARGE",
  reason: "Safety review",
  actorId: "astrid",
  actorRole: "finance",
  actorScope: { zones: "all", market: "SE-STO" },
  scope: "all",
  idempotencyKey: "large-refund",
  expectedRev: approvalRev,
  before: "open",
  after: "refunded",
  amountOre: 25_000,
});
assert(pending.status === "pending_approval", "large refund waits for approval");
assert((await api.approvals()).some((item) => item.targetId === "RF-LARGE" && item.status === "pending"), "approval queue stores high-impact action");

console.log("seed ok");
