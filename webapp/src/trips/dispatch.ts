import { defaultDispatch, dispatchError, type DispatchRule } from "./present.ts";

export type DispatchVersion = {
  rev: number;
  at: string;
  actorId: string;
  rules: DispatchRule[];
};

export type DispatchBook = {
  draftRev: number;
  rules: DispatchRule[];
  history: DispatchVersion[];
};

function cloneRules(rules: readonly DispatchRule[]): DispatchRule[] {
  return rules.map((rule) => ({ ...rule }));
}

export function emptyDispatchBook(): DispatchBook {
  return {
    draftRev: 1,
    rules: defaultDispatch(),
    history: [],
  };
}

export function normalizeDispatchBook(value: unknown): DispatchBook {
  if (Array.isArray(value)) {
    return {
      draftRev: 1,
      rules: cloneRules(value as DispatchRule[]),
      history: [],
    };
  }
  if (!value || typeof value !== "object") return emptyDispatchBook();
  const raw = value as Partial<DispatchBook>;
  const rules = Array.isArray(raw.rules) && raw.rules.length > 0 ? cloneRules(raw.rules) : defaultDispatch();
  return {
    draftRev: typeof raw.draftRev === "number" && raw.draftRev > 0 ? raw.draftRev : 1,
    rules,
    history: Array.isArray(raw.history)
      ? raw.history
          .filter((item): item is DispatchVersion => Boolean(item && typeof item.rev === "number" && Array.isArray(item.rules)))
          .map((item) => ({ ...item, rules: cloneRules(item.rules) }))
      : [],
  };
}

export function saveDispatchBook(
  current: DispatchBook,
  nextRules: readonly DispatchRule[],
  actorId: string,
  nowIso: string,
): { book: DispatchBook; error?: string } {
  const error = nextRules.map(dispatchError).find(Boolean);
  if (error) return { book: current, error };
  if (nextRules.length !== defaultDispatch().length) return { book: current, error: "Every dispatch zone must have a rule." };

  const nextRev = current.draftRev + 1;
  const snapshot: DispatchVersion = {
    rev: nextRev,
    at: nowIso,
    actorId,
    rules: cloneRules(nextRules),
  };

  return {
    book: {
      draftRev: nextRev,
      rules: cloneRules(nextRules),
      history: [snapshot, ...current.history].slice(0, 20),
    },
  };
}

export function restoreDispatchVersion(
  current: DispatchBook,
  versionRev: number,
  actorId: string,
  nowIso: string,
): { book: DispatchBook; error?: string } {
  const version = current.history.find((item) => item.rev === versionRev);
  if (!version) return { book: current, error: "Dispatch version was not found." };
  return saveDispatchBook(current, version.rules, actorId, nowIso);
}
