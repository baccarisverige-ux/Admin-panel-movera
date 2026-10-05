import { createFixtureAdminApi } from "./create.ts";
import { ApiError } from "./httpClient.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const ALL = { zones: "all" as const, market: "SE-STO" as const };
const Z001 = { zones: ["Z001"], market: "SE-STO" as const };

async function expectStatus(work: Promise<unknown>, status: number, message: string) {
  await work.then(
    () => {
      throw new Error(`${message}: expected rejection`);
    },
    (error: unknown) => {
      assert(error instanceof ApiError && error.status === status, `${message}: expected ${status}`);
    },
  );
}

const api = createFixtureAdminApi(0);

await api.reset();
const uiRev = await api.revision();
const uiResult = await api.command({
  action: "admin.auth.pickAgent",
  targetId: "lena",
  reason: "No person affected",
  actorId: "signed-out",
  actorRole: "super",
  actorScope: ALL,
  idempotencyKey: "pick-agent-ui",
  expectedRev: uiRev,
  before: "",
  after: "Pick demo agent",
});
assert(uiResult.status === "committed" && uiResult.rev === uiRev, "pure UI command does not change business revision");
assert((await api.audit()).length === 0, "pure UI command does not create business audit rows");

await api.reset();
const firstRev = await api.revision();
const smallInput = {
  action: "admin.payment.refund",
  targetId: "PAY0002",
  reason: "Charged twice",
  actorId: "astrid",
  actorRole: "finance" as const,
  actorScope: ALL,
  idempotencyKey: "generic-small-refund",
  expectedRev: firstRev,
  collection: "payments",
  patch: { status: "refunded" },
  before: "captured",
  after: "refunded",
  amountOre: 5_000,
};
const small = await api.command(smallInput);
assert(small.status === "committed", "small refund commits");
const retry = await api.command(smallInput);
assert(retry.operationId === small.operationId, "same idempotency key replays the same operation");
const refundAudits = (await api.audit()).filter((row) => row.operationId === small.operationId && row.result === "committed");
assert(refundAudits.length === 1, "double click creates one committed audit effect");

await expectStatus(
  api.command({
    action: "admin.rider.block",
    targetId: "R0001",
    reason: "Safety review",
    actorId: "lena",
    actorRole: "ops",
    actorScope: ALL,
    idempotencyKey: "stale-revision",
    expectedRev: firstRev,
    collection: "riders",
    patch: { status: "blocked" },
    before: "active",
    after: "blocked",
  }),
  409,
  "stale revision",
);

const currentAfterRefund = await api.revision();
await expectStatus(
  api.command({
    action: "admin.payment.refund",
    targetId: "PAY0003",
    reason: "Support request",
    actorId: "maja",
    actorRole: "support",
    actorScope: ALL,
    idempotencyKey: "permission-denied",
    expectedRev: currentAfterRefund,
    collection: "payments",
    patch: { status: "refunded" },
    before: "captured",
    after: "refunded",
    amountOre: 5_000,
  }),
  403,
  "permission denial",
);

const currentAfterPermission = await api.revision();
await expectStatus(
  api.command({
    action: "admin.rider.block",
    targetId: "R0002",
    reason: "Safety review",
    actorId: "lena",
    actorRole: "ops",
    actorScope: Z001,
    idempotencyKey: "scope-denied",
    expectedRev: currentAfterPermission,
    collection: "riders",
    patch: { status: "blocked" },
    before: "active",
    after: "blocked",
  }),
  403,
  "record outside actor scope",
);

const trips = await api.list("trips", null);
const completed = trips.find((trip) => trip.status === "completed");
assert(completed, "seed contains a completed trip");
const currentAfterScope = await api.revision();
await expectStatus(
  api.command({
    action: "admin.trip.cancel",
    targetId: completed!.id,
    reason: "Safety review",
    actorId: "lena",
    actorRole: "ops",
    actorScope: ALL,
    idempotencyKey: "wrong-state",
    expectedRev: currentAfterScope,
    collection: "trips",
    patch: { status: "cancelled_by_admin" },
    before: "completed",
    after: "cancelled_by_admin",
  }),
  422,
  "state guard",
);

const currentAfterState = await api.revision();
await expectStatus(
  api.command({
    action: "admin.rider.block",
    targetId: "R0001",
    reason: "",
    actorId: "lena",
    actorRole: "ops",
    actorScope: ALL,
    idempotencyKey: "missing-reason",
    expectedRev: currentAfterState,
    collection: "riders",
    patch: { status: "blocked" },
    before: "active",
    after: "blocked",
  }),
  422,
  "reason requirement",
);

await api.reset();
const approvalRev = await api.revision();
const large = await api.command({
  action: "admin.payment.refund",
  targetId: "PAY0002",
  reason: "Large correction",
  actorId: "astrid",
  actorRole: "finance",
  actorScope: ALL,
  idempotencyKey: "large-refund",
  expectedRev: approvalRev,
  collection: "payments",
  patch: { status: "refunded" },
  before: "captured",
  after: "refunded",
  amountOre: 25_000,
});
assert(large.status === "pending_approval", "large refund waits for approval");
assert((await api.approvals()).filter((row) => row.targetId === "PAY0002" && row.status === "pending").length === 1, "one approval row created");
const paymentAfterApprovalRequest = (await api.list("payments", null)).find((row) => row.id === "PAY0002");
assert(paymentAfterApprovalRequest?.status === "captured", "pending approval does not mutate the payment");

await api.reset();
const transientRev = await api.revision();
await api.setFault("503");
const transientInput = {
  action: "admin.rider.block",
  targetId: "R0001",
  reason: "Safety review",
  actorId: "lena",
  actorRole: "ops" as const,
  actorScope: ALL,
  idempotencyKey: "transient-retry",
  expectedRev: transientRev,
  collection: "riders",
  patch: { status: "blocked" },
  before: "active",
  after: "blocked",
};
await expectStatus(api.command(transientInput), 503, "transient failure");
await api.setFault("none");
const recovered = await api.command(transientInput);
assert(recovered.status === "committed", "same idempotency key can safely retry after pre-commit transient failure");

console.log("generic command engine ok");
