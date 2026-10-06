import {
  addHole,
  coreZones,
  effectiveZonesAt,
  emptyBook,
  kmlToZones,
  mergeZones,
  priorityZones,
  publishZones,
  reorderZonePriorities,
  rollbackZones,
  rotateZone,
  splitZone,
  stockholmZones,
  submitReview,
  updateDraft,
  validateZones,
  zoneImpact,
  zoneRuleSummary,
  ZONE_TYPES,
  zonesAt,
} from "./releases.ts";
import { zoneDrawModes } from "./drawModes.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const seed = stockholmZones();
const modes = zoneDrawModes().map((mode) => mode.mode);
assert(modes.includes("render"), "terra draw render mode is named");
assert(modes.includes("circle") && modes.includes("select") && modes.includes("polygon"), "circle, select and polygon tools exist");
assert(modes.includes("freehand"), "freehand tool exists");
for (const type of ZONE_TYPES) assert(seed.some((zone) => zone.kind === type.id), `seed has ${type.id}`);
assert(seed.filter((zone) => zone.kind === "operating").length === 9, "9 operating zones");
assert(coreZones(seed).length === 12, "12 core zones");
assert(seed.some((zone) => zone.name === "Arlanda"), "Arlanda");
assert(seed.some((zone) => zone.name === "Bromma airport"), "Bromma");
assert(seed.every((zone) => /^#[0-9A-Fa-f]{6}$/.test(zone.color)), "each seeded zone has a color");
assert(seed.every((zone) => Number.isFinite(zone.priority)), "each seeded zone has priority");
assert(validateZones(seed).every((issue) => issue.level !== "error"), `seed has no blocking errors: ${validateZones(seed).map((issue) => issue.message).join("; ")}`);
assert(validateZones(seed).some((issue) => issue.level === "warn"), "large service area warns");

const bowtie = updateDraft(emptyBook("nora"), "op-norrmalm", [[59.33, 18.05], [59.34, 18.07], [59.33, 18.07], [59.34, 18.05]], "nora");
assert(validateZones(bowtie.draft).some((issue) => issue.message.includes("crosses itself")), "self-crossing is blocked");

const outside = updateDraft(emptyBook("nora"), "op-norrmalm", [[60.5, 18], [60.5, 18.1], [60.6, 18.1], [60.6, 18]], "nora");
assert(validateZones(outside.draft).some((issue) => issue.message.includes("outside")), "operating zone must sit in the service area");

const holed = addHole(emptyBook("nora"), "op-norrmalm", [[59.332, 18.07], [59.332, 18.09], [59.342, 18.09], [59.342, 18.07]], "nora");
assert(!holed.error && holed.book.draft.find((zone) => zone.id === "op-norrmalm")?.holes.length === 1, "a hole inside the zone is kept");
const badHole = addHole(emptyBook("nora"), "op-norrmalm", [[59.1, 17.5], [59.1, 17.6], [59.12, 17.6]], "nora");
assert(badHole.error, "a hole outside the zone is rejected");

const impact = zoneImpact(seed, seed);
assert(impact.deltaKm === 0 && impact.drivers > 0 && impact.trips > 0, "impact counts drivers and trips inside the draft");

const split = splitZone(emptyBook("nora"), "op-norrmalm", "nora");
assert(!split.error && split.newId, "rectangular zone can be split");
assert(split.book.draft.some((zone) => zone.id === split.newId), "split creates a second stable id");
const merged = mergeZones(split.book, "op-norrmalm", split.newId!, "nora");
assert(!merged.error, "compatible split rectangles can merge again");
assert(merged.book.draft.find((zone) => zone.id === split.newId)?.archived, "merge archives the source id instead of deleting history");

const rotated = rotateZone(emptyBook("nora"), "op-norrmalm", 15, "nora");
assert(JSON.stringify(rotated.draft.find((zone) => zone.id === "op-norrmalm")?.points) !== JSON.stringify(emptyBook("nora").draft.find((zone) => zone.id === "op-norrmalm")?.points), "rotate changes polygon coordinates");

const kml = `<?xml version="1.0"?><kml><Document><Placemark><name>Norrmalm</name><Polygon><outerBoundaryIs><LinearRing><coordinates>18.060,59.325 18.105,59.325 18.105,59.350 18.060,59.350 18.060,59.325</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
const imported = kmlToZones(kml, emptyBook("nora"), "nora");
assert(!imported.error, "matching KML placemark imports");
assert(imported.book.draft.find((zone) => zone.id === "op-norrmalm")?.points[1]?.[1] === 18.105, "KML coordinates are stored in WGS84 lat/lng");

const priorityBook = reorderZonePriorities(emptyBook("nora"), ["nopick-1", "boost-1", "event-1"], "nora");
const priority = priorityZones(priorityBook.draft);
assert(priority[0]?.id === "nopick-1" && priority[1]?.id === "boost-1", "draggable priority order is persisted");
const overlap = effectiveZonesAt(priorityBook.draft, 59.329, 18.08);
assert(overlap.some((zone) => zone.kind === "no_pickup"), "effective stack includes overlapping rule zone");
const noPickup = overlap.find((zone) => zone.kind === "no_pickup");
assert(noPickup && zoneRuleSummary(noPickup).includes("priority"), "test-point rule summary exposes applied priority");

let book = emptyBook("nora");
book = updateDraft(book, "op-norrmalm", [[59.326, 18.061], [59.326, 18.08], [59.34, 18.08], [59.34, 18.061]], "nora");
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
const rolled = rollbackZones(book, "lena");
assert(rolled.versions.length === 3, "rollback is recorded as a new version");
assert(rolled.published[0]?.id === rolled.draft[0]?.id, "draft follows the restored snapshot");
assert(zonesAt(seed, 59.334, 18.063).some((zone) => zone.name === "Norrmalm"), "test point hits Norrmalm");
assert(zonesAt(seed, 59.334, 18.063).some((zone) => zone.kind === "service"), "test point hits the service area");

console.log("zones ok");
