import { emptyDb, runCommand, type CommandInput } from "./run.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const base = (over: Partial<CommandInput> = {}): CommandInput => ({
  action: "admin.refund.decide",
  idempotencyKey: "k1",
  expectedRev: 1,
  actorId: "nora",
  targetId: "RF-1",
  reason: "Charged twice",
  amountOre: 25_000,
  ...over,
});

let db = emptyDb();
const first = runCommand(db, base(), "2026-10-05T08:00:00Z");
db = first.db;
assert(first.outcome.result === "pending_approval", "large refund waits");
const retry = runCommand(db, base(), "2026-10-05T08:00:01Z");
assert(retry.db === db, "same key does not write again");
assert(retry.db.audits.length === 1, "one audit for the double click");

const own = runCommand(db, base({ idempotencyKey: "k2", expectedRev: db.rev, actorId: "nora" }), "2026-10-05T08:01:00Z");
assert(own.outcome.status === 403, "requester cannot approve");

const clash = runCommand(db, base({ idempotencyKey: "k3", expectedRev: 1, actorId: "astrid" }), "2026-10-05T08:02:00Z");
assert(clash.outcome.status === 409, "stale version conflicts");

const second = runCommand(db, base({ idempotencyKey: "k4", expectedRev: db.rev, actorId: "astrid" }), "2026-10-05T08:03:00Z");
db = second.db;
assert(second.outcome.result === "committed", "second agent commits");
assert(db.refunds["RF-1"]?.status === "refunded", "refunded once");

const again = runCommand(db, base({ idempotencyKey: "k5", expectedRev: db.rev, actorId: "lena", amountOre: 25_000 }), "2026-10-05T08:04:00Z");
assert(again.outcome.message.includes("No second payment"), "retry does not pay twice");
assert(again.db.rev === db.rev, "rev unchanged when already refunded");

const small = runCommand(emptyDb(), base({ idempotencyKey: "s", targetId: "RF-2", amountOre: 5000 }), "2026-10-05T08:05:00Z");
assert(small.outcome.result === "committed", "under 200 kr commits immediately");

console.log("commands ok");
