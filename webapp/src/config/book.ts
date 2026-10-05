export type Lang = "sv" | "en";

export type ReasonText = { id: string; sv: string; en: string };

export type ConfigDraft = {
  features: { luxury: false; reservations: boolean; wallet: boolean };
  versions: { rider: string; driver: string };
  reasons: ReasonText[];
  scheduleAt: string | null;
  zoneOverrides: Record<string, { reservations?: boolean; wallet?: boolean }>;
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
    reasons: REASONS.map((reason) => ({ ...reason })),
    scheduleAt: null,
    zoneOverrides: {},
  };
  const published = JSON.parse(JSON.stringify(draft)) as ConfigDraft;
  return { authorId, rev: 1, draft, published, history: [JSON.parse(JSON.stringify(draft)) as ConfigDraft] };
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

export function setAppVersion(book: ConfigBook, which: "rider" | "driver", value: string, authorId: string): ConfigBook {
  return { ...book, authorId, draft: { ...book.draft, versions: { ...book.draft.versions, [which]: value } } };
}

export function setReason(book: ConfigBook, id: string, lang: Lang, text: string, authorId: string): ConfigBook {
  return {
    ...book,
    authorId,
    draft: { ...book.draft, reasons: book.draft.reasons.map((reason) => (reason.id === id ? { ...reason, [lang]: text } : reason)) },
  };
}

export function setSchedule(book: ConfigBook, scheduleAt: string | null, authorId: string): ConfigBook {
  return { ...book, authorId, draft: { ...book.draft, scheduleAt } };
}

export function setZoneOverride(
  book: ConfigBook,
  zoneId: string,
  key: "reservations" | "wallet",
  value: boolean | null,
  authorId: string,
): ConfigBook {
  const current = { ...(book.draft.zoneOverrides[zoneId] ?? {}) };
  if (value === null) delete current[key];
  else current[key] = value;
  const zoneOverrides = { ...book.draft.zoneOverrides };
  if (Object.keys(current).length === 0) delete zoneOverrides[zoneId];
  else zoneOverrides[zoneId] = current;
  return { ...book, authorId, draft: { ...book.draft, zoneOverrides } };
}

export function configDiff(published: ConfigDraft, draft: ConfigDraft): string[] {
  const lines: string[] = [];
  const onOff = (value: boolean) => (value ? "on" : "off");
  if (published.features.reservations !== draft.features.reservations) {
    lines.push(`Reservations ${onOff(published.features.reservations)} → ${onOff(draft.features.reservations)}`);
  }
  if (published.features.wallet !== draft.features.wallet) {
    lines.push(`Wallet ${onOff(published.features.wallet)} → ${onOff(draft.features.wallet)}`);
  }
  if (published.versions.rider !== draft.versions.rider) lines.push(`Rider app ${published.versions.rider} → ${draft.versions.rider}`);
  if (published.versions.driver !== draft.versions.driver) lines.push(`Driver app ${published.versions.driver} → ${draft.versions.driver}`);
  if ((published.scheduleAt ?? "") !== (draft.scheduleAt ?? "")) {
    lines.push(`Schedule ${published.scheduleAt ?? "now"} → ${draft.scheduleAt ?? "now"}`);
  }
  for (const reason of draft.reasons) {
    const before = published.reasons.find((item) => item.id === reason.id);
    if (!before) lines.push(`New reason ${reason.id}`);
    else if (before.sv !== reason.sv || before.en !== reason.en) lines.push(`Reason ${reason.id} text changed`);
  }
  const ids = new Set([...Object.keys(published.zoneOverrides ?? {}), ...Object.keys(draft.zoneOverrides ?? {})]);
  for (const id of ids) {
    if (JSON.stringify(published.zoneOverrides?.[id] ?? {}) !== JSON.stringify(draft.zoneOverrides?.[id] ?? {})) {
      lines.push(`Zone ${id} override changed`);
    }
  }
  return lines;
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
