import { emptyBook, publishZones, rollbackZones, stockholmZones, updateDraft } from "./releases.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = stockholmZones();
assert(seed.filter((zone) => zone.kind === "operating").length === 9, "9 operating zones");
assert(seed.some((zone) => zone.name === "Arlanda"), "Arlanda");
assert(seed.some((zone) => zone.name === "Bromma airport"), "Bromma");
assert(seed.some((zone) => zone.kind === "no_pickup"), "no pickup");
assert(seed.some((zone) => zone.kind === "boost"), "boost");
assert(seed.some((zone) => zone.kind === "event"), "event");

let book = emptyBook("nora");
book = updateDraft(book, "op-norrmalm", [[59.33, 18.06], [59.331, 18.07], [59.332, 18.06]], "nora");
const blocked = publishZones(book, "nora");
assert(blocked.error === "A second agent must publish.", "author cannot publish");
const published = publishZones(book, "lena");
assert(!published.error && published.book.versions.length === 2, "second agent publishes");
book = published.book;
const rolled = rollbackZones(book);
assert(rolled.versions.length === 1, "rollback drops the latest");
assert(rolled.published === rolled.versions[0], "published matches the remaining version");

console.log("zones ok");
