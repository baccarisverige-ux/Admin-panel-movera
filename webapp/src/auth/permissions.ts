import { MENU } from "../nav.ts";

export type Role = "super" | "ops" | "support" | "safety" | "finance";

export type Agent = {
  id: string;
  email: string;
  name: string;
  password: string;
  code: string;
  role: Role;
  active: boolean;
};

export const DEMO_PASSWORD = "movera";
export const DEMO_CODE = "123456";
export const IDLE_MS = 15 * 60 * 1000;

export const AGENTS: Agent[] = [
  { id: "nora", email: "nora@movera.se", name: "Nora Lind", password: DEMO_PASSWORD, code: DEMO_CODE, role: "super", active: true },
  { id: "lena", email: "lena@movera.se", name: "Lena Berg", password: DEMO_PASSWORD, code: DEMO_CODE, role: "ops", active: true },
  { id: "maja", email: "support@movera.se", name: "Maja Holm", password: DEMO_PASSWORD, code: DEMO_CODE, role: "support", active: true },
  { id: "erik", email: "safety@movera.se", name: "Erik Söder", password: DEMO_PASSWORD, code: DEMO_CODE, role: "safety", active: true },
  { id: "astrid", email: "finance@movera.se", name: "Astrid Ek", password: DEMO_PASSWORD, code: DEMO_CODE, role: "finance", active: true },
];

const ALL = ["*"] as const;

export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  super: ALL,
  ops: ["overview.read", "trips.read", "drivers.read", "zones.read", "settings.read", "settings.edit", "team.read", "audit.read", "approval.decide", "riders.read"],
  support: ["overview.read", "trips.read", "riders.read", "support.reply"],
  safety: ["overview.read", "trips.read", "safety.edit", "incidents.read"],
  finance: ["overview.read", "finance.read", "payments.refund", "audit.read", "approval.decide"],
};

export function permissionForPage(pageId: string): string {
  return MENU.find((item) => item.id === pageId)?.permission ?? "overview.read";
}

export function can(role: Role, permission: string): boolean {
  const list = ROLE_PERMISSIONS[role];
  return list.includes("*") || list.includes(permission);
}

export function signIn(
  agents: readonly Agent[],
  input: { email: string; password: string; code: string },
): { ok: true; agent: Agent } | { ok: false; error: string } {
  const agent = agents.find((item) => item.email.toLowerCase() === input.email.trim().toLowerCase());
  if (!agent || !agent.active) return { ok: false, error: "Unknown agent or the account is deactivated." };
  if (agent.password !== input.password) return { ok: false, error: "Wrong password." };
  if (agent.code !== input.code) return { ok: false, error: "Wrong code." };
  return { ok: true, agent };
}

export function isIdle(lastActivityMs: number, nowMs: number, idleMs = IDLE_MS): boolean {
  return nowMs - lastActivityMs >= idleMs;
}

export function deactivateAgent(agents: readonly Agent[], id: string, actor: Agent): Agent[] | { error: string } {
  if (!can(actor.role, "team.edit") && actor.role !== "super") {
    return { error: "You cannot change agents." };
  }
  if (actor.id === id) return { error: "You cannot deactivate yourself." };
  return agents.map((agent) => (agent.id === id ? { ...agent, active: false } : agent));
}

export function scopeZone(search: string): string {
  const value = new URLSearchParams(search).get("zone");
  return value && value.length > 0 ? value : "all";
}

export function rowMatchesZone(cells: readonly string[], zone: string): boolean {
  if (zone === "all") return true;
  const needle = zone.toLowerCase();
  return cells.some((cell) => cell.toLowerCase().includes(needle));
}
