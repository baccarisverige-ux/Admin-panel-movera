export type Lang = "sv" | "en";

export type ReasonText = { id: string; sv: string; en: string };

export type ConfigDraft = {
  features: { luxury: false; reservations: boolean; wallet: boolean };
  versions: { rider: string; driver: string };
  reasons: ReasonText[];
  scheduleAt: string | null;
};

export type ConfigBook = {
  authorId: string;
  rev: number;
  draft: ConfigDraft;
  published: ConfigDraft;
  history: ConfigDraft[];
};

export const REASONS: ReasonText[] = [
  { id: "wait_too_long", sv: "Väntan var för lång", en: "Wait was too long" },
  { id: "plans_changed", sv: "Planerna ändrades", en: "Plans changed" },
  { id: "rider_no_show", sv: "Resenären kom inte", en: "Rider no show" },
];

export function emptyConfig(authorId = "nora"): ConfigBook {
  const draft: ConfigDraft = {
    features: { luxury: false, reservations: true, wallet: true },
    versions: { rider: "1.0.0", driver: "1.0.0" },
    reasons: REASONS,
    scheduleAt: null,
  };
  return { authorId, rev: 1, draft, published: draft, history: [draft] };
}

export function missingTranslations(reasons: readonly ReasonText[]): string[] {
  return reasons.filter((reason) => !reason.sv.trim() || !reason.en.trim()).map((reason) => reason.id);
}

export function setFeature(book: ConfigBook, key: "reservations" | "wallet", value: boolean, authorId: string): ConfigBook {
  return {
    ...book,
    authorId,
    draft: { ...book.draft, features: { ...book.draft.features, luxury: false, [key]: value } },
  };
}

export function publishConfig(book: ConfigBook, actorId: string, nowIso: string): { book: ConfigBook; error?: string } {
  const missing = missingTranslations(book.draft.reasons);
  if (missing.length > 0) return { book, error: `Missing translation: ${missing.join(", ")}` };
  if (book.draft.features.luxury !== false) return { book, error: "luxury is not a feature." };
  if (actorId === book.authorId) return { book, error: "A second agent must publish." };
  if (book.draft.scheduleAt && book.draft.scheduleAt > nowIso) {
    return { book, error: `Scheduled for ${book.draft.scheduleAt}. Not live yet.` };
  }
  const snapshot: ConfigDraft = JSON.parse(JSON.stringify(book.draft)) as ConfigDraft;
  return {
    book: { ...book, rev: book.rev + 1, published: snapshot, history: [...book.history, snapshot] },
  };
}

export function rollbackConfig(book: ConfigBook): ConfigBook {
  if (book.history.length < 2) return book;
  const history = book.history.slice(0, -1);
  const published = history[history.length - 1]!;
  return { ...book, history, published, draft: published, rev: book.rev + 1 };
}
