import { can, type AgentScope, type Role } from "../auth/permissions.ts";
import { commandById } from "../commands/registry.ts";
import { catalogFor, type CatalogEntry } from "../data/catalog.ts";
import { CURRENCY, TIME_ZONE } from "../domain/contract.ts";
import {
  addAudit,
  findHit,
  loadDb,
  pause,
  readFault,
  resetDb,
  rowsFor,
  saveDb,
  writeFault,
  type Fault,
} from "./demoStore.ts";
import { ApiError, apiRequest, classifyStatus } from "./httpClient.ts";
import type { ApprovalRow, AuditRow, DemoDb, DemoRecord, InboxItem, OperationRow, ZoneScope } from "./seed.ts";

export type ApiEnv = {
  PROD: boolean;
  VITE_DATA?: string;
  VITE_ADMIN_API?: string;
};

export type PageResult = CatalogEntry;

export type CommandInput = {
  action: string;
  targetId: string;
  reason: string;
  actorId: string;
  before: string;
  after: string;
  actorRole?: Role;
  actorScope?: AgentScope;
  scope?: string;
  idempotencyKey?: string;
  expectedRev?: number;
  entityState?: string;
  amountOre?: number;
  sliceKey?: string;
  value?: unknown;
  collection?: string;
  patch?: Record<string, string | number | boolean | null>;
};

export type CommandResult = {
  message: string;
  db: DemoDb;
  operationId: string;
  status: "committed" | "pending_approval";
  rev: number;
};

export type AdminApi = {
  kind: "fixture" | "http";
  demo: boolean;
  ready: () => Promise<{ currency: typeof CURRENCY; timeZone: typeof TIME_ZONE; demo: boolean }>;
  page: (pageId: string) => Promise<PageResult>;
  list: (name: string, scope: ZoneScope) => Promise<DemoRecord[]>;
  search: (query: string, scope: ZoneScope) => Promise<{ kind: string; id: string; label: string; path: string }[]>;
  command: (input: CommandInput) => Promise<CommandResult>;
  revision: () => Promise<number>;
  audit: () => Promise<AuditRow[]>;
  approvals: () => Promise<ApprovalRow[]>;
  operation: (idempotencyKey: string, actorId: string) => Promise<OperationRow | null>;
  reset: () => Promise<DemoDb>;
  getFault: () => Promise<Fault>;
  setFault: (fault: Fault) => Promise<void>;
  inbox: () => Promise<InboxItem[]>;
  freshness: () => Promise<string>;
  readSlice: <T>(key: string, fallback: T) => Promise<T>;
};

const DEMO_DELAY_MS = 200;
const DEFAULT_SCOPE: AgentScope = { zones: "all", market: "SE-STO" };

const TARGET_COLLECTIONS = [
  "drivers",
  "riders",
  "vehicles",
  "fleets",
  "trips",
  "reservations",
  "tickets",
  "incidents",
  "payments",
  "refunds",
  "payouts",
  "wallet",
  "templates",
  "banners",
  "events",
  "bonuses",
  "staff",
] as const;

type TargetCollection = (typeof TARGET_COLLECTIONS)[number];

function isTargetCollection(value: string): value is TargetCollection {
  return TARGET_COLLECTIONS.includes(value as TargetCollection);
}

function targetRecord(db: DemoDb, targetId: string, collection?: string): DemoRecord | null {
  if (collection && isTargetCollection(collection)) {
    return db[collection].find((row) => row.id === targetId) ?? null;
  }
  for (const key of TARGET_COLLECTIONS) {
    const row = db[key].find((item) => item.id === targetId);
    if (row) return row;
  }
  return null;
}

function targetScope(db: DemoDb, targetId: string, collection: string | undefined, requested: string | undefined): string {
  const record = targetRecord(db, targetId, collection);
  if (record?.zoneId) return record.zoneId;
  if (db.zones.some((zone) => zone.id === targetId)) return targetId;
  return requested ?? "all";
}

function targetState(db: DemoDb, targetId: string, collection: string | undefined, supplied: string | undefined): string | undefined {
  return supplied ?? targetRecord(db, targetId, collection)?.status;
}

function unsupported(): never {
  throw new ApiError(0, "Admin API is not connected.");
}

function operationKey(actorId: string, idempotencyKey: string): string {
  return `${actorId}:${idempotencyKey}`;
}

function operationId(actorId: string, idempotencyKey: string): string {
  const compact = idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36);
  return `op-${actorId}-${compact || "command"}`;
}

function scopeAllowed(actorScope: AgentScope, scope: string): boolean {
  if (!scope || scope === "all") return true;
  return actorScope.zones === "all" || actorScope.zones.includes(scope);
}

function faultStatus(fault: Fault): number | null {
  if (fault === "none" || fault === "slow" || fault === "empty") return null;
  if (fault === "offline") return 0;
  return Number(fault);
}

function rejectionResult(status: number): AuditRow["result"] {
  if (status === 403) return "denied";
  if (status === 409) return "conflict";
  return "rejected";
}

function rememberRejected(
  db: DemoDb,
  input: Required<Pick<CommandInput, "action" | "targetId" | "reason" | "actorId" | "before" | "after">> & {
    idempotencyKey: string;
    scope: string;
  },
  opId: string,
  status: number,
  message: string,
): DemoDb {
  const result = rejectionResult(status);
  let next = addAudit(
    db,
    {
      operationId: opId,
      actorId: input.actorId,
      action: input.action,
      targetId: input.targetId,
      scope: input.scope,
      before: input.before,
      after: input.after,
      reason: input.reason,
      result,
    },
    false,
  );
  const operation: OperationRow = {
    operationId: opId,
    idempotencyKey: input.idempotencyKey,
    action: input.action,
    targetId: input.targetId,
    status: "rejected",
    httpStatus: status,
    message,
    rev: next.rev,
    at: new Date().toISOString(),
  };
  next = {
    ...next,
    operations: {
      ...next.operations,
      [operationKey(input.actorId, input.idempotencyKey)]: operation,
    },
  };
  return saveDb(next);
}

function rememberTransientFailure(
  db: DemoDb,
  input: Required<Pick<CommandInput, "action" | "targetId" | "reason" | "actorId" | "before" | "after">> & {
    scope: string;
  },
  opId: string,
  status: number,
): DemoDb {
  return addAudit(
    db,
    {
      operationId: opId,
      actorId: input.actorId,
      action: input.action,
      targetId: input.targetId,
      scope: input.scope,
      before: input.before,
      after: input.after,
      reason: input.reason,
      result: rejectionResult(status),
    },
    false,
  );
}

function replayOperation(db: DemoDb, operation: OperationRow): CommandResult {
  if (operation.status === "rejected") throw new ApiError(operation.httpStatus, operation.message);
  return {
    message: operation.message,
    db,
    operationId: operation.operationId,
    status: operation.status,
    rev: operation.rev,
  };
}

export function createFixtureAdminApi(delayMs = DEMO_DELAY_MS): AdminApi {
  return {
    kind: "fixture",
    demo: true,

    async ready() {
      await pause(delayMs, "none");
      return { currency: CURRENCY, timeZone: TIME_ZONE, demo: true };
    },

    async page(pageId) {
      await pause(delayMs, "none");
      return catalogFor(pageId);
    },

    async list(name, scope) {
      const fault = readFault();
      await pause(delayMs, fault);
      const status = faultStatus(fault);
      if (status !== null) throw new ApiError(status, classifyStatus(status));
      return rowsFor(loadDb(), name, scope, fault);
    },

    async search(query, scope) {
      await pause(delayMs, "none");
      return findHit(loadDb(), query, scope);
    },

    async command(raw) {
      const fault = readFault();
      await pause(delayMs, fault);

      let db = loadDb();
      const spec = commandById(raw.action);
      const actorRole = raw.actorRole ?? "super";
      const actorScope = raw.actorScope ?? DEFAULT_SCOPE;
      const idempotencyKey = raw.idempotencyKey ?? `direct-${db.rev}-${raw.action}-${raw.targetId}`;
      const expectedRev = raw.expectedRev ?? db.rev;
      const resolvedScope = targetScope(db, raw.targetId, raw.collection, raw.scope);
      const resolvedState = targetState(db, raw.targetId, raw.collection, raw.entityState);
      const opId = operationId(raw.actorId, idempotencyKey);
      const input = {
        action: raw.action,
        targetId: raw.targetId,
        reason: raw.reason,
        actorId: raw.actorId,
        before: raw.before,
        after: raw.after,
        idempotencyKey,
        scope: resolvedScope,
      };

      const cached = db.operations[operationKey(raw.actorId, idempotencyKey)];
      if (cached) return replayOperation(db, cached);

      const reject = (status: number, message: string, cache = true): never => {
        if (cache) db = rememberRejected(db, input, opId, status, message);
        else db = rememberTransientFailure(db, input, opId, status);
        throw new ApiError(status, message);
      };

      if (!spec) reject(422, `Unknown action ${raw.action}.`);
      if (!can(actorRole, spec.permission)) reject(403, "Your role cannot do that.");
      if (!scopeAllowed(actorScope, resolvedScope)) reject(403, "That record is outside your active scope.");
      if (spec.reason && !raw.reason.trim()) reject(422, "A reason is required.");
      if (expectedRev !== db.rev) reject(409, "Someone else changed this. Reload and review the newest version.");
      if (spec.allowedStates && resolvedState && !spec.allowedStates.includes(resolvedState)) {
        reject(422, `${spec.label} is not allowed while the record is ${resolvedState}.`);
      }
      if (raw.collection && raw.patch && !targetRecord(db, raw.targetId, raw.collection)) {
        reject(422, "The target record no longer exists.");
      }

      const injectedStatus = faultStatus(fault);
      if (injectedStatus !== null) {
        const transient = injectedStatus === 0 || injectedStatus === 429 || injectedStatus === 503;
        reject(
          injectedStatus,
          injectedStatus === 409 ? "This record changed. The newest version is still here." : classifyStatus(injectedStatus),
          !transient,
        );
      }

      if (spec.approvalThresholdOre && (raw.amountOre ?? 0) >= spec.approvalThresholdOre) {
        const approval: ApprovalRow = {
          id: `approval-${db.approvals.length + 1}`,
          action: raw.action,
          targetId: raw.targetId,
          requestedBy: raw.actorId,
          amountOre: raw.amountOre ?? 0,
          reason: raw.reason,
          status: "pending",
        };
        let next: DemoDb = { ...db, approvals: [approval, ...db.approvals] };
        next = addAudit(next, {
          operationId: opId,
          actorId: raw.actorId,
          action: raw.action,
          targetId: raw.targetId,
          scope: resolvedScope,
          before: raw.before,
          after: "pending approval",
          reason: raw.reason,
          result: "pending_approval",
        });
        const operation: OperationRow = {
          operationId: opId,
          idempotencyKey,
          action: raw.action,
          targetId: raw.targetId,
          status: "pending_approval",
          httpStatus: 202,
          message: "Pending approval. A second authorised agent must decide this action.",
          rev: next.rev,
          at: new Date().toISOString(),
        };
        next = saveDb({
          ...next,
          operations: {
            ...next.operations,
            [operationKey(raw.actorId, idempotencyKey)]: operation,
          },
        });
        return {
          message: operation.message,
          db: next,
          operationId: opId,
          status: "pending_approval",
          rev: next.rev,
        };
      }

      if (raw.collection && raw.patch) {
        const key = raw.collection as keyof DemoDb;
        const rows = db[key];
        if (Array.isArray(rows)) {
          db = {
            ...db,
            [key]: rows.map((row) => (row.id === raw.targetId ? { ...row, ...raw.patch } : row)),
          };
        }
      }

      if (raw.sliceKey) {
        db = {
          ...db,
          slices: {
            ...db.slices,
            [raw.sliceKey]: raw.value,
          },
        };
      }

      db = addAudit(db, {
        operationId: opId,
        actorId: raw.actorId,
        action: raw.action,
        targetId: raw.targetId,
        scope: resolvedScope,
        before: raw.before,
        after: raw.after,
        reason: raw.reason,
        result: "committed",
      });

      const operation: OperationRow = {
        operationId: opId,
        idempotencyKey,
        action: raw.action,
        targetId: raw.targetId,
        status: "committed",
        httpStatus: 200,
        message: "Saved in demo.",
        rev: db.rev,
        at: new Date().toISOString(),
      };
      db = saveDb({
        ...db,
        operations: {
          ...db.operations,
          [operationKey(raw.actorId, idempotencyKey)]: operation,
        },
      });
      return {
        message: operation.message,
        db,
        operationId: opId,
        status: "committed",
        rev: db.rev,
      };
    },

    async revision() {
      return loadDb().rev;
    },

    async audit() {
      return loadDb().audits;
    },

    async approvals() {
      return loadDb().approvals;
    },

    async operation(idempotencyKey, actorId) {
      return loadDb().operations[operationKey(actorId, idempotencyKey)] ?? null;
    },

    async reset() {
      await pause(delayMs, "none");
      return resetDb();
    },

    async getFault() {
      return readFault();
    },

    async setFault(fault) {
      writeFault(fault);
    },

    async inbox() {
      return loadDb().inbox;
    },

    async freshness() {
      return loadDb().updatedAt;
    },

    async readSlice(key, fallback) {
      const fault = readFault();
      await pause(delayMs, fault);
      if (fault === "empty") return fallback;
      const status = faultStatus(fault);
      if (status !== null) throw new ApiError(status, classifyStatus(status));
      const value = loadDb().slices[key];
      return (value ?? fallback) as typeof fallback;
    },
  };
}

export function createHttpAdminApi(baseUrl = ""): AdminApi {
  return {
    kind: "http",
    demo: false,

    async ready() {
      const body = (await apiRequest(baseUrl, "/ready")) as { currency?: string; timeZone?: string };
      if (body.currency !== CURRENCY || body.timeZone !== TIME_ZONE) {
        throw new Error("The ready payload is not Stockholm SEK.");
      }
      return { currency: CURRENCY, timeZone: TIME_ZONE, demo: false };
    },

    async page(pageId) {
      return (await apiRequest(baseUrl, `/pages/${encodeURIComponent(pageId)}`)) as PageResult;
    },

    list: async () => unsupported(),
    search: async () => unsupported(),
    command: async () => unsupported(),
    revision: async () => unsupported(),
    audit: async () => unsupported(),
    approvals: async () => unsupported(),
    operation: async () => unsupported(),
    reset: async () => unsupported(),
    getFault: async () => unsupported(),
    setFault: async () => unsupported(),
    inbox: async () => unsupported(),
    freshness: async () => unsupported(),
    readSlice: async () => unsupported(),
  };
}

export function createAdminApi(env: ApiEnv, delayMs = DEMO_DELAY_MS): AdminApi {
  const api = env.VITE_ADMIN_API ?? "";
  if (api === "http" || api.startsWith("http://") || api.startsWith("https://")) {
    return createHttpAdminApi(api === "http" ? "" : api);
  }
  if (env.PROD && env.VITE_DATA !== "demo") {
    throw new Error("Production refuses the simulation adapter.");
  }
  return createFixtureAdminApi(delayMs);
}
