import { emptyConfig, missingTranslations, publishConfig, rollbackConfig, setFeature } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

let book = setFeature(emptyConfig("nora"), "wallet", false, "nora");
assert(book.draft.features.luxury === false, "luxury stays off");
assert(book.draft.features.wallet === false, "wallet can be turned off");
const blocked = publishConfig(book, "nora", "2026-10-05T10:00:00Z");
assert(blocked.error === "A second agent must publish.", "second person");
const live = publishConfig(book, "lena", "2026-10-05T10:00:00Z");
assert(!live.error && live.book.published.features.wallet === false, "published");
book = live.book;
const back = rollbackConfig(book);
assert(back.published.features.wallet === true, "rollback restores wallet");

book = emptyConfig();
book = { ...book, draft: { ...book.draft, reasons: [{ id: "x", sv: "", en: "Hi" }], scheduleAt: null } };
assert(missingTranslations(book.draft.reasons).includes("x"), "missing swedish");
assert(publishConfig(book, "lena", "2026-10-05T10:00:00Z").error?.includes("Missing translation"), "publish blocked");

book = emptyConfig("nora");
book = { ...book, authorId: "nora", draft: { ...book.draft, scheduleAt: "2026-10-06T00:00:00Z" } };
assert(publishConfig(book, "lena", "2026-10-05T10:00:00Z").error?.includes("Scheduled"), "future schedule waits");

console.log("config ok");
