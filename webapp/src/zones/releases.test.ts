import { emptyBook, publishZones, rollbackZones, stockholmZones, submitReview, updateDraft, validateZones, ZONE_TYPES, zonesAt } from "./releases.ts";
import { zoneDrawModes } from "./drawModes.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = stockholmZones();
assert(zoneDrawModes().some((mode) => mode.mode === "render"), "terra draw render mode is named");
for (const type of ZONE_TYPES) assert(seed.some((zone) => zone.kind === type.id), `seed has ${type.id}`);
assert(seed.filter((zone) => zone.kind === "operating").length === 9, "9 operating zones");
assert(seed.some((zone) => zone.name === "Arlanda"), "Arlanda");
assert(seed.some((zone) => zone.name === "Bromma airport"), "Bromma");
assert(validateZones(seed).every((issue) => issue.level !== "error"), "seed has no blocking errors");
assert(validateZones(seed).some((issue) => issue.level === "warn"), "large service area warns");

const bowtie = updateDraft(emptyBook("nora"), "op-norrmalm", [[59.33, 18.05], [59.34, 18.07], [59.33, 18.07], [59.34, 18.05]], "nora");
assert(validateZones(bowtie.draft).some((issue) => issue.message.includes("crosses itself")), "self-crossing is blocked");

const outside = updateDraft(emptyBook("nora"), "op-norrmalm", [[60.5, 18], [60.5, 18.1], [60.6, 18.1], [60.6, 18]], "nora");
assert(validateZones(outside.draft).some((issue) => issue.message.includes("outside")), "operating zone must sit in the service area");

let book = emptyBook("nora");
book = updateDraft(book, "op-norrmalm", [[59.33, 18.06], [59.331, 18.07], [59.332, 18.06]], "nora");
const early = publishZones(book, "lena");
assert(early.error === "Send the draft for review before publishing.", "review comes first");
const reviewed = submitReview(book, "nora");
assert(!reviewed.error && reviewed.book.status === "in_review", "author sends for review");
book = reviewed.book;
const blocked = publishZones(book, "nora");
assert(blocked.error === "A second agent must publish.", "author cannot publish");
const published = publishZones(book, "lena");
assert(!published.error && published.book.versions.length === 2, "second agent publishes");
book = published.book;
const rolled = rollbackZones(book);
assert(rolled.versions.length === 1, "rollback drops the latest");
assert(rolled.published[0]?.id === rolled.draft[0]?.id, "draft follows the remaining version");
assert(zonesAt(seed, 59.334, 18.063).some((zone) => zone.name === "Norrmalm"), "test point hits Norrmalm");
assert(zonesAt(seed, 59.334, 18.063).some((zone) => zone.kind === "service"), "test point hits the service area");

console.log("zones ok");
