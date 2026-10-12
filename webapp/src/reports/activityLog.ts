/**
 * What saves do not show: when admins sign in and out, and what they export.
 * Kept apart from the demo database so recording it never changes a revision or slows a save.
 * With the real backend the server records these itself.
 */

export type ActivityKind = "signin" | "signout" | "export" | "view";
export type Activity = { id: string; at: string; actorId: string; kind: ActivityKind; what: string; zone?: string };

const KEY = "movera-admin-activity-log";
const EVENT = "movera-activity";
const LIMIT = 3000;

function read(): Activity[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Activity[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

let cache: { raw: string | null; list: Activity[] } = { raw: null, list: [] };

export function readActivity(): Activity[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, list: read() };
  return cache.list;
}

export function logActivity(entry: Omit<Activity, "id" | "at"> & { at?: string }): void {
  if (!entry.actorId) return;
  try {
    const list = read();
    const at = entry.at ?? new Date().toISOString();
    list.push({ ...entry, at, id: `act-${Date.parse(at).toString(36)}-${list.length}` });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-LIMIT)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Recording is best effort; the action itself already happened.
  }
}

export function subscribeActivity(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Record a download the admin made: what it was and, when known, the zone. */
export function logExport(actorId: string | undefined, what: string, zone?: string): void {
  if (actorId) logActivity({ actorId, kind: "export", what, zone });
}
