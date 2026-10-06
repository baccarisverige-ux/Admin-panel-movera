import {
  emptyDispatchBook,
  normalizeDispatchBook,
  restoreDispatchVersion,
  saveDispatchBook,
} from "./dispatch.ts";
import { defaultDispatch } from "./present.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const empty = emptyDispatchBook();
assert(empty.draftRev === 1, "dispatch revision starts at one");
assert(empty.rules.length === 11, "all seeded zones have dispatch rules");

const migrated = normalizeDispatchBook(defaultDispatch());
assert(migrated.draftRev === 1 && migrated.rules.length === 11, "legacy dispatch arrays migrate");

const edited = defaultDispatch().map((rule) => rule.zoneId === "Z001" ? { ...rule, offerSeconds: 9.5 } : rule);
const saved = saveDispatchBook(empty, edited, "daniel", "2026-10-06T00:00:00.000Z");
assert(!saved.error, "valid dispatch edit saves");
assert(saved.book.draftRev === 2, "dispatch save advances conflict revision");
assert(saved.book.rules.find((rule) => rule.zoneId === "Z001")?.offerSeconds === 9.5, "edited rule persists");
assert(saved.book.history[0]?.rev === 2 && saved.book.history[0]?.actorId === "daniel", "dispatch history records actor and revision");

const invalid = saveDispatchBook(saved.book, edited.map((rule) => rule.zoneId === "Z001" ? { ...rule, offerSeconds: 0 } : rule), "daniel", "2026-10-06T00:05:00.000Z");
assert(invalid.error?.includes("Offer"), "invalid offer window is rejected");
assert(invalid.book.draftRev === 2, "rejected dispatch does not advance revision");

const changedAgain = saveDispatchBook(saved.book, edited.map((rule) => rule.zoneId === "Z001" ? { ...rule, offerSeconds: 12 } : rule), "lena", "2026-10-06T00:10:00.000Z");
const restored = restoreDispatchVersion(changedAgain.book, 2, "daniel", "2026-10-06T00:15:00.000Z");
assert(!restored.error, "existing dispatch version restores");
assert(restored.book.draftRev === 4, "restore creates a new revision");
assert(restored.book.rules.find((rule) => rule.zoneId === "Z001")?.offerSeconds === 9.5, "restore uses historical rule values");

console.log("dispatch ok");
