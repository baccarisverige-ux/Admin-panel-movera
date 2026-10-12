import {
  approve,
  applyPreset,
  BUILT_IN_PRESETS,
  cancelDecision,
  changeLines,
  copyParts,
  countryDefault,
  draftRules,
  emptyDispatchBook,
  inTime,
  liveRules,
  modeNow,
  publish,
  rankDrivers,
  requestControl,
  rulesFile,
  simulate,
  undoTo,
  withEvent,
  zoneDefault,
  zoneIssues,
  type DriverFacts,
} from "./rules.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const base = zoneDefault("Z001");
assert(zoneIssues(base).length === 0, "default rules are valid");
assert(zoneDefault("ARN").airport.on && zoneDefault("ARN").airport.order === "fifo", "airports queue first in, first out");
assert(zoneDefault("FR-PC").riderCancel.fee === 5 && zoneDefault("Z001").riderCancel.fee === 50, "fees follow the country");
assert(zoneIssues({ ...base, radar: { ...base.radar, on: false }, exclusive: { ...base.exclusive, on: false } })[0].includes("Radar or Exclusive"), "a zone needs a mode");
assert(zoneIssues({ ...base, radius: { ...base.radius, steps: [5, 3] } }).some((line) => line.includes("larger")), "search steps grow");
assert(zoneIssues({ ...base, choose: { ...base.choose, how: "auto" }, radar: { ...base.radar, on: false } }).some((line) => line.includes("Automatic")), "auto needs both modes");

assert(inTime({ from: "22:00", to: "04:00" }, "23:30") && inTime({ from: "22:00", to: "04:00" }, "02:00") && !inTime({ from: "22:00", to: "04:00" }, "12:00"), "time rules pass midnight");
assert(modeNow(base, undefined, 2, "12:00").mode === "radar", "busy zone uses radar");
assert(modeNow(base, undefined, 0.5, "12:00").mode === "exclusive", "calm zone uses exclusive");
assert(modeNow(base, { paused: true, mode: null, by: "", at: "" }, 2, "12:00").mode === null, "paused zone offers nothing");
const night = { ...base, choose: { ...base.choose, times: [{ id: "t", on: true, from: "22:00", to: "04:00", mode: "radar" as const }] } };
assert(modeNow(night, undefined, 0.1, "23:00").mode === "radar", "time rule wins");

const driver = (id: string, patch: Partial<DriverFacts>): DriverFacts => ({
  id, name: id, lat: 59.334, lng: 18.063, zoneId: "Z001", finishing: null, rating: 4.8, acceptancePct: 90, cancelPct: 3, idleMin: 5,
  categories: ["economy"], extras: [], female: false, ridesThisHour: 0, skipsInRow: 0, noInRow: 0, favourite: false, goingHome: false,
  homeDirectionOk: true, priorityUntilMin: 0, queuePos: null, restNeeded: false, ...patch,
});
const request = { zoneId: "Z001", at: [59.334, 18.063] as [number, number], category: "economy", extras: [], womenOnly: false, tripKm: 8, blocked: [] as string[] };
const country = countryDefault("SE");
const ranked = rankDrivers(base, country, request, [
  driver("far", { lat: 59.36, lng: 18.1 }),
  driver("near", { lat: 59.335, lng: 18.064 }),
  driver("low", { lat: 59.335, lng: 18.064, rating: 4.0 }),
  driver("rest", { restNeeded: true }),
  driver("cat", { categories: ["comfort"] }),
]);
assert(ranked[0].driver.id === "near", "nearest good driver first");
assert(ranked.find((row) => row.driver.id === "low")?.out?.includes("Rating"), "low rating blocked");
assert(ranked.find((row) => row.driver.id === "rest")?.out?.includes("rest"), "tired driver blocked");
assert(ranked.find((row) => row.driver.id === "cat")?.out?.includes("category"), "category is checked");
const women = rankDrivers(base, country, { ...request, womenOnly: true }, [driver("m", {}), driver("f", { female: true })]);
assert(women[0].driver.id === "f" && women[1].out, "women-only rides");

const steps = simulate(base, ranked, "radar");
assert(steps[0].title.startsWith("Radar"), "radar first");
assert(steps.some((step) => step.title === "Switch to Exclusive"), "radar falls back to exclusive");
assert(steps.some((step) => step.title === "Suggest a higher price"), "rider sees raise price");
assert(steps[steps.length - 1].title === "Search stops", "search ends");

const fee = cancelDecision({ id: "c", tripId: "t", zoneId: "Z001", rider: "r", driverId: "d", driver: "d", acceptedAt: "", cancelledAt: "", minutesAfterAccept: 4, atAccept: { km: 4, etaMin: 10 }, atCancel: { km: 2, etaMin: 5 }, path: [], pickup: [0, 0] }, base);
assert(fee.fee && fee.closerPct === 50, "driver came closer: fee");
const free = cancelDecision({ id: "c", tripId: "t", zoneId: "Z001", rider: "r", driverId: "d", driver: "d", acceptedAt: "", cancelledAt: "", minutesAfterAccept: 4, atAccept: { km: 4, etaMin: 10 }, atCancel: { km: 3.9, etaMin: 10 }, path: [], pickup: [0, 0] }, base);
assert(!free.fee, "driver did not move: no fee");

// Publish: small changes go live now, big ones wait for a second admin.
let book = emptyDispatchBook();
const small = { ...base, radar: { ...base.radar, drivers: 8 } };
assert(changeLines(base, small)[0] === "Radar drivers: 5 → 8", "change line reads well");
const first = publish(book, { Z001: small }, {}, ["Z001"], "nora", "2026-10-12T10:00", "More drivers");
assert(!first.error && first.live[0] === "Z001", "small change is live");
book = first.book;
assert(liveRules(book, "Z001").radar.drivers === 8 && book.versions.length === 1, "version saved");
const big = { ...liveRules(book, "Z001"), choose: { ...base.choose, how: "manual" as const, main: "radar" as const, backup: "exclusive" as const } };
const second = publish(book, { Z001: big }, {}, ["Z001"], "nora", "2026-10-12T11:00", "");
assert(second.waiting[0] === "Z001" && second.book.approvals.length === 1, "big change waits");
assert(approve(second.book, second.book.approvals[0].id, "nora", "x").error, "the same admin cannot approve");
const ok = approve(second.book, second.book.approvals[0].id, "lena", "2026-10-12T11:05");
assert(!ok.error && liveRules(ok.book, "Z001").choose.main === "radar" && ok.book.versions[0].approvedBy === "lena", "second admin approves");
const back = undoTo(ok.book, ok.book.versions[0].rev, "nora", "2026-10-12T12:00");
assert(liveRules(back.book, "Z001").choose.how === "auto", "undo goes back");
assert(draftRules(back.book, "Z001").radar.drivers === 8, "draft follows live");

const paused = requestControl(book, "Z001", { paused: true, mode: null }, "nora", "now");
assert(paused.waiting && !paused.book.control.Z001, "pause waits for approval");
const resumed = requestControl({ ...book, control: { Z001: { paused: true, mode: null, by: "x", at: "" } } }, "Z001", { paused: false, mode: null }, "nora", "now");
assert(!resumed.waiting && !resumed.book.control.Z001.paused, "resume is immediate");

const copied = copyParts(small, zoneDefault("Z002"), ["modes"]);
assert(copied.zoneId === "Z002" && copied.radar.drivers === 8, "copy keeps the zone");
const airport = applyPreset(zoneDefault("FR-PC"), BUILT_IN_PRESETS.find((item) => item.id === "airport")!, "FR");
assert(airport.airport.on && airport.riderCancel.fee === 5 && airport.zoneId === "FR-PC", "preset keeps the country's money");
const file = rulesFile(book, "SE", "now");
assert(file.zones.length > 5 && file.zones[0].rules.radar.drivers === 8, "rules file has every zone");

const arena = emptyDispatchBook().events[0];
assert(withEvent(base, arena, [59.372, 17.999]).rules.radar.drivers === 12, "event rules inside the area");
assert(withEvent(base, arena, [59.334, 18.063]).event === null, "normal rules outside the area");
const once = simulate(base, rankDrivers(base, country, request, [driver("a", {}), driver("b", { lat: 59.335 })]), "exclusive");
assert(once.filter((step) => step.title === "Exclusive to a").length === 1, "a driver who said no is not asked again");

// Radar in the driver app and going offline.
assert(zoneIssues({ ...base, radarApp: { ...base.radarApp, popup: 9 } }).some((line) => line.includes("popup")), "popup has a limit");
assert(zoneIssues({ ...base, radarApp: { ...base.radarApp, fullOn: false, popupOn: false } }).some((line) => line.includes("cannot see")), "radar needs a screen");
const offline = rankDrivers(base, country, request, [driver("quiet", { noInRow: 6 })]);
assert(offline[0].out?.includes("offline"), "driver goes offline after offers not accepted");
assert(!rankDrivers({ ...base, autoOffline: { on: false, after: 5 } }, country, request, [driver("quiet", { noInRow: 6 })])[0].out?.includes("offline"), "auto offline can be off");
const busyDriver = driver("busy", { finishing: { inMin: 2, dropKm: 0.5 } });
const noDriving = { ...base, radarApp: { ...base.radarApp, drivingOn: false } };
assert(!simulate(noDriving, rankDrivers(noDriving, country, request, [busyDriver]), "radar")[0].detail.includes("busy"), "no radar offers while driving when off");
assert(simulate(base, rankDrivers(base, country, request, [busyDriver]), "radar")[0].detail.includes("busy"), "radar offers while driving when on");
assert(changeLines(base, { ...base, autoOffline: { on: true, after: 8 } })[0] === "Offline after offers not accepted: 5 → 8", "change line for auto offline");

console.log("dispatch rules ok");
