import { catalogFor, type CatalogEntry } from "../data/catalog.ts";
import { CURRENCY, TIME_ZONE } from "../domain/contract.ts";
import { addAudit, assertWritable, findHit, loadDb, pause, readFault, resetDb, rowsFor, writeFault, type Fault } from "./demoStore.ts";
import { ApiError, apiRequest } from "./httpClient.ts";
import type { DemoDb, DemoRecord, InboxItem, ZoneScope } from "./seed.ts";

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
  sliceKey?: string;
  value?: unknown;
  collection?: string;
  patch?: Record<string, string | number | boolean | null>;
};

export type AdminApi = {
  kind: "fixture" | "http";
  demo: boolean;
  ready: () => Promise<{ currency: typeof CURRENCY; timeZone: typeof TIME_ZONE; demo: boolean }>;
  page: (pageId: string) => Promise<PageResult>;
  list: (name: string, scope: ZoneScope) => Promise<DemoRecord[]>;
  search: (query: string, scope: ZoneScope) => Promise<{ kind: string; id: string; label: string; path: string }[]>;
  command: (input: CommandInput) => Promise<{ message: string; db: DemoDb }>;
  reset: () => Promise<DemoDb>;
  getFault: () => Promise<Fault>;
  setFault: (fault: Fault) => Promise<void>;
  inbox: () => Promise<InboxItem[]>;
  freshness: () => Promise<string>;
  readSlice: <T>(key: string, fallback: T) => Promise<T>;
};

const DEMO_DELAY_MS = 200;

function unsupported(): never {
  throw new ApiError(0, "Admin API is not connected.");
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
      if (fault === "offline") assertWritable(fault);
      return rowsFor(loadDb(), name, scope, fault);
    },
    async search(query, scope) {
      await pause(delayMs, "none");
      return findHit(loadDb(), query, scope);
    },
    async command(input) {
      const fault = readFault();
      await pause(delayMs, fault);
      assertWritable(fault);
      let db = loadDb();
      if (input.collection && input.patch) {
        const key = input.collection as keyof DemoDb;
        const rows = db[key];
        if (Array.isArray(rows)) {
          db = {
            ...db,
            [key]: rows.map((row) => (row.id === input.targetId ? { ...row, ...input.patch } : row)),
          };
        }
      }
      if (input.sliceKey) db = { ...db, slices: { ...db.slices, [input.sliceKey]: input.value } };
      db = addAudit(db, {
        actorId: input.actorId,
        action: input.action,
        targetId: input.targetId,
        before: input.before,
        after: input.after,
        reason: input.reason,
        result: "committed",
      });
      return { message: "Saved in demo.", db };
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
