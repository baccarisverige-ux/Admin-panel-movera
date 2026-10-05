import { approveConfig, configDiff, effectiveValue, emptyConfig, missingTranslations, publishConfig, rollbackConfig, setFeature, setMaxStops, setZoneOverride, submitConfigApproval } from "./book.ts";
import type { ReasonText } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

let book = setFeature(emptyConfig("nora"), "wallet", false, "nora");
assert(book.draft.features.luxury === false, "luxury stays off");
assert(book.draft.features.wallet === false, "wallet can be turned off");
assert(book.status === "draft", "edit returns to draft");
const blocked = publishConfig(book, "nora", "2026-10-05T10:00:00Z");
assert(blocked.error === "A second agent must publish.", "second person");
const sent = submitConfigApproval(book, "nora");
assert(!sent.error && sent.book.status === "in_review", "sent");
assert(approveConfig(sent.book, "nora").error === "A second agent must approve.", "author cannot approve");
const approved = approveConfig(sent.book, "lena");
assert(!approved.error && approved.book.status === "approved", "approved");
assert(publishConfig(book, "lena", "2026-10-05T10:00:00Z").error === "Approve the draft before publishing.", "draft cannot publish");
const live = publishConfig(approved.book, "lena", "2026-10-05T10:00:00Z");
assert(!live.error && live.book.published.features.wallet === false, "published");
assert(live.book.publications.length === 1, "history");
book = live.book;
const back = rollbackConfig(book);
assert(back.published.features.wallet === true, "rollback restores wallet");

const broken: ReasonText = { id: "x", group: "rider_finding", sv: "", en: "Hi" };
book = { ...emptyConfig(), draft: { ...emptyConfig().draft, reasons: [broken] } };
assert(missingTranslations(book.draft.reasons).includes("x"), "missing swedish");
assert(publishConfig(book, "lena", "2026-10-05T10:00:00Z").error?.includes("Missing translation"), "publish blocked");

book = emptyConfig("nora");
book = { ...book, authorId: "nora", approverId: "lena", status: "approved", draft: { ...book.draft, scheduleAt: "2026-10-06T00:00:00Z" } };
assert(publishConfig(book, "lena", "2026-10-05T10:00:00Z").error?.includes("Scheduled"), "future schedule waits");

const changed = setZoneOverride(setFeature(emptyConfig("nora"), "wallet", false, "nora"), "op-norrmalm", "reservations", false, "nora");
const lines = configDiff(changed.published, changed.draft);
assert(lines.some((line) => line.includes("Wallet on → off")), "diff shows the wallet change");
assert(lines.some((line) => line.includes("op-norrmalm")), "diff shows the zone override");
const effect = effectiveValue(changed.draft, "reservations", "op-norrmalm");
assert(effect.level === "zone" && effect.value === "off", "zone wins");
assert(effect.chain.includes("market not set") && effect.chain.includes("platform not set"), "precedence chain");
const stops = setMaxStops(emptyConfig(), 2, "nora");
assert(configDiff(stops.published, stops.draft).some((line) => line.includes("Max stops 3 → 2")), "max stops");
const fresh = emptyConfig();
assert(fresh.draft.switches.length === 13, "both apps");
assert(fresh.draft.reasons.length === 29, "reasons");
assert(fresh.draft.updates.length === 4, "platforms");
assert(!fresh.draft.switches.some((item) => item.id === "luxury"), "no luxury switch");
assert(fresh.draft.booking.maxStops === 3, "three stops");

console.log("config ok");
