import { ApiError, classifyStatus } from "./httpClient.ts";
import { createSeed, inScope, searchDb, type DemoDb, type DemoRecord } from "./seed.ts";

export type Fault = "none" | "401" | "403" | "409" | "422" | "429" | "503" | "offline" | "slow" | "empty";

const DB_KEY = "movera-demo-v3";
const FAULT_KEY = "movera-demo-fault";

type StorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

function storage(): StorageLike {
  if (typeof localStorage === "undefined") return memoryStorage;
  return localStorage;
}

export function loadDb(): DemoDb {
  const raw = storage().getItem(DB_KEY);
  if (!raw) return createSeed();
  try {
    const parsed = JSON.parse(raw) as DemoDb;
    if (!parsed || !Array.isArray(parsed.drivers)) return createSeed();
    return parsed;
  } catch {
    return createSeed();
  }
}

export function saveDb(db: DemoDb): DemoDb {
  const next = { ...db, updatedAt: new Date().toISOString() };
  storage().setItem(DB_KEY, JSON.stringify(next));
  return next;
}

export function resetDb(): DemoDb {
  const next = createSeed();
  storage().setItem(DB_KEY, JSON.stringify(next));
  storage().setItem(FAULT_KEY, "none");
  return next;
}

export function readFault(): Fault {
  const value = storage().getItem(FAULT_KEY);
  if (value === "401" || value === "403" || value === "409" || value === "422" || value === "429" || value === "503" || value === "offline" || value === "slow" || value === "empty") return value;
  return "none";
}

export function writeFault(fault: Fault): void {
  storage().setItem(FAULT_KEY, fault);
}

export async function pause(delayMs: number, fault: Fault): Promise<void> {
  const wait = fault === "slow" ? Math.max(delayMs, 1200) : delayMs;
  if (wait <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, wait));
}

export function assertWritable(fault: Fault): void {
  if (fault === "none" || fault === "slow" || fault === "empty") return;
  if (fault === "offline") throw new ApiError(0, classifyStatus(0));
  const status = Number(fault);
  throw new ApiError(status, status === 409 ? "This record changed. The newest version is still here." : classifyStatus(status));
}

export function rowsFor(db: DemoDb, name: string, scope: string | null, fault: Fault): DemoRecord[] {
  if (fault === "empty") return [];
  const table = db[name as keyof DemoDb];
  if (!Array.isArray(table)) return [];
  return inScope(table as DemoRecord[], scope);
}

export function findHit(db: DemoDb, query: string) {
  return searchDb(db, query);
}

export function addAudit(db: DemoDb, entry: Omit<DemoDb["audits"][number], "id" | "at">): DemoDb {
  const next: DemoDb = {
    ...db,
    rev: db.rev + 1,
    audits: [
      { ...entry, id: `aud-${db.audits.length + 1}`, at: new Date().toISOString() },
      ...db.audits,
    ],
  };
  return saveDb(next);
}
