import type { MarketId } from "../markets/markets.ts";

/**
 * Shift handover: what is still open, who works on what and what changed during the shift,
 * filled in by itself, plus the admin's own notes. The next admin confirms they read it.
 */

export const HANDOVER_KEY = "handoverOps";

export type Snapshot = {
  openAlerts: number;
  critical: number;
  openIncidents: number;
  working: { title: string; by: string }[];
  notTaken: { title: string; level: string }[];
  changes: { at: string; by: string; text: string }[];
};

export type Handover = {
  id: string;
  country: MarketId;
  /** "all" or a comma-separated zone list, the zones the shift covered. */
  zones: string;
  by: string;
  at: string;
  to: string | null;
  text: string;
  todo: string[];
  snapshot: Snapshot;
  readBy: { id: string; at: string }[];
};

export type HandoverOps = { draftRev: number; mustRead: boolean; items: Handover[] };

export function emptyHandoverOps(): HandoverOps {
  return { draftRev: 1, mustRead: true, items: [] };
}

export function normalizeHandoverOps(value: unknown): HandoverOps {
  const base = emptyHandoverOps();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<HandoverOps>;
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, mustRead: raw.mustRead !== false, items: Array.isArray(raw.items) ? raw.items : [] };
}

/** The last handover of the country, the start of the current shift. */
export function lastHandover(ops: HandoverOps, country: MarketId): Handover | null {
  return ops.items.filter((item) => item.country === country).sort((a, b) => a.at.localeCompare(b.at)).at(-1) ?? null;
}

/** When the current shift started: the last handover, or eight hours ago. */
export function shiftStart(ops: HandoverOps, country: MarketId, now: number): number {
  const last = lastHandover(ops, country);
  return last ? Date.parse(last.at) : now - 8 * 3_600_000;
}

/** Handovers someone else wrote that this admin has not confirmed yet: for them, or for anyone. */
export function unread(ops: HandoverOps, country: MarketId, agentId: string): Handover[] {
  if (!ops.mustRead) return [];
  return ops.items
    .filter((item) => item.country === country && item.by !== agentId && (!item.to || item.to === agentId) && !item.readBy.some((read) => read.id === agentId))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3);
}

export function handOver(ops: HandoverOps, input: Omit<Handover, "id" | "readBy">): { ops: HandoverOps; error?: string } {
  if (!input.text.trim() && !input.todo.length) return { ops, error: "Write what the next shift should know, or add a to-do." };
  const item: Handover = { ...input, text: input.text.trim(), todo: input.todo.map((line) => line.trim()).filter(Boolean), id: `HO-${ops.items.length + 1}`, readBy: [] };
  return { ops: { ...ops, draftRev: ops.draftRev + 1, items: [...ops.items, item] } };
}

export function markRead(ops: HandoverOps, id: string, agentId: string, at: string): { ops: HandoverOps; error?: string } {
  const item = ops.items.find((row) => row.id === id);
  if (!item) return { ops, error: "That handover is gone." };
  if (item.by === agentId) return { ops, error: "You wrote this handover." };
  if (item.readBy.some((read) => read.id === agentId)) return { ops, error: "Already read." };
  return { ops: { ...ops, draftRev: ops.draftRev + 1, items: ops.items.map((row) => (row.id === id ? { ...row, readBy: [...row.readBy, { id: agentId, at }] } : row)) } };
}
