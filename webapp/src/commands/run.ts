export type CommandStatus = 200 | 403 | 409 | 422;

export type AuditResult = "committed" | "denied" | "conflict" | "pending_approval";

export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  targetId: string;
  before: string;
  after: string;
  reason: string;
  result: AuditResult;
};

export type Refund = {
  status: "open" | "pending_approval" | "refunded";
  amountOre: number;
  firstAgentId?: string;
};

export type CommandDb = {
  rev: number;
  refunds: Record<string, Refund>;
  audits: AuditEntry[];
  byKey: Record<string, CommandOutcome>;
};

export type CommandInput = {
  action: "admin.refund.decide";
  idempotencyKey: string;
  expectedRev: number;
  actorId: string;
  targetId: string;
  reason: string;
  amountOre: number;
};

export type CommandOutcome = {
  status: CommandStatus;
  result: AuditResult;
  rev: number;
  message: string;
};

export const REFUND_THRESHOLD_ORE = 20_000;

export function emptyDb(): CommandDb {
  return { rev: 1, refunds: {}, audits: [], byKey: {} };
}

export function runCommand(db: CommandDb, input: CommandInput, nowIso: string): { db: CommandDb; outcome: CommandOutcome } {
  const cached = db.byKey[input.idempotencyKey];
  if (cached) return { db, outcome: cached };

  const fail = (status: CommandStatus, result: AuditResult, message: string) => {
    const outcome: CommandOutcome = { status, result, rev: db.rev, message };
    const audits = [...db.audits, audit(db, input, nowIso, result, message)];
    const next = { ...db, audits, byKey: { ...db.byKey, [input.idempotencyKey]: outcome } };
    return { db: next, outcome };
  };

  if (!input.reason.trim()) return fail(422, "denied", "A reason is required.");
  if (input.expectedRev !== db.rev) return fail(409, "conflict", "Someone else saved this first. Reload and try again.");

  const current = db.refunds[input.targetId] ?? { status: "open" as const, amountOre: input.amountOre };
  if (current.status === "refunded") {
    const outcome: CommandOutcome = { status: 200, result: "committed", rev: db.rev, message: "Already refunded. No second payment." };
    return { db: { ...db, byKey: { ...db.byKey, [input.idempotencyKey]: outcome } }, outcome };
  }

  const needsSecond = input.amountOre >= REFUND_THRESHOLD_ORE;
  if (needsSecond && current.status !== "pending_approval") {
    const outcome: CommandOutcome = { status: 200, result: "pending_approval", rev: db.rev + 1, message: "A second agent must approve 200 kr or more." };
    const next: CommandDb = {
      rev: db.rev + 1,
      refunds: { ...db.refunds, [input.targetId]: { ...current, status: "pending_approval", firstAgentId: input.actorId, amountOre: input.amountOre } },
      audits: [...db.audits, audit(db, input, nowIso, "pending_approval", outcome.message)],
      byKey: { ...db.byKey, [input.idempotencyKey]: outcome },
    };
    return { db: next, outcome };
  }

  if (needsSecond && current.firstAgentId === input.actorId) {
    return fail(403, "denied", "You cannot approve your own refund.");
  }

  const outcome: CommandOutcome = { status: 200, result: "committed", rev: db.rev + 1, message: "Refund committed once." };
  const next: CommandDb = {
    rev: db.rev + 1,
    refunds: { ...db.refunds, [input.targetId]: { ...current, status: "refunded", amountOre: input.amountOre } },
    audits: [...db.audits, audit(db, input, nowIso, "committed", `${current.status} → refunded`)],
    byKey: { ...db.byKey, [input.idempotencyKey]: outcome },
  };
  return { db: next, outcome };
}

function audit(db: CommandDb, input: CommandInput, nowIso: string, result: AuditResult, after: string): AuditEntry {
  const before = db.refunds[input.targetId]?.status ?? "open";
  return {
    id: `aud-${db.audits.length + 1}`,
    at: nowIso,
    actorId: input.actorId,
    action: input.action,
    targetId: input.targetId,
    before,
    after,
    reason: input.reason,
    result,
  };
}
