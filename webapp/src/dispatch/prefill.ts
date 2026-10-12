/** Hand an event over to the driver bonus builder: same area, same time, same message. */

const KEY = "movera-bonus-prefill";

export type BonusPrefill = { name: string; ring: [number, number][]; from: string; until: string; note: string };

export function giveBonusPrefill(value: BonusPrefill): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Without storage the builder still opens, just empty.
  }
}

export function clearBonusPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Read the prefill. Call clearBonusPrefill after the builder opened, so a reload does not open it again. */
export function takeBonusPrefill(): BonusPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<BonusPrefill>;
    if (!Array.isArray(value.ring) || value.ring.length < 3 || typeof value.from !== "string" || typeof value.until !== "string") return null;
    return { name: String(value.name ?? "Event bonus"), ring: value.ring, from: value.from, until: value.until, note: String(value.note ?? "") };
  } catch {
    return null;
  }
}
