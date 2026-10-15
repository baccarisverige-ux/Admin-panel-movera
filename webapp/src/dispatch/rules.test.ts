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
  homePopupSkippedBelowMin,
  inTime,
  liveRules,
  modeNow,
  normalizeDispatchBook,
  publish,
  rankDrivers,
  requestControl,
  reservationStepAt,
  reservationTimeline,
  rulesFile,
  simulate,
  stepAfterDriverCancel,
  undoTo,
  withEvent,
  zoneDefault,
  zoneIssues,
  type DispatchBook,
  type DriverFacts,
  type Preset,
  type ReservationRules,
  type ZoneDispatch,
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

// Ride check: four triggers, each on or off, with their numbers.
const rcDefault = base.rideCheck;
assert(rcDefault.farOn && rcDefault.farM === 500 && rcDefault.stopOn && rcDefault.stopMin === 4, "by default dropped far away from 500 m and a long stop from 4 min");
assert(rcDefault.routeOn && rcDefault.routeKm === 2 && rcDefault.longerOn && rcDefault.longerPct === 50 && rcDefault.crashOn, "by default 2 km off the route, 50% longer, and possible crash on");
const withRc = (patch: Partial<ZoneDispatch["rideCheck"]>): ZoneDispatch => ({ ...base, rideCheck: { ...rcDefault, ...patch } });
const rcIssues = (patch: Partial<ZoneDispatch["rideCheck"]>) => zoneIssues(withRc(patch)).filter((line) => line.startsWith("Ride check:"));
assert(rcIssues({ farM: 50 })[0] === "Ride check: dropped far away must be 100 to 5000 m from the drop-off.", "dropped far away has a limit");
assert(rcIssues({ stopMin: 0 })[0] === "Ride check: a long stop must be 1 to 30 minutes.", "long stop has a limit");
assert(rcIssues({ routeKm: 25 })[0] === "Ride check: off the route must be 0.5 to 20 km.", "off the route has a limit");
assert(rcIssues({ longerPct: 5 })[0] === "Ride check: longer than expected must be 10 to 300%.", "longer than expected has a limit");
assert(rcIssues({ farOn: false, farM: 0, stopOn: false, stopMin: 99, routeOn: false, routeKm: 0, longerOn: false, longerPct: 0 }).length === 0, "a trigger that is off is not checked");
assert(rcIssues({ farM: Number.NaN }).length === 1, "an empty number is not valid");
const rcLines = changeLines(base, withRc({ stopMin: 6, crashOn: false, farM: 800 }));
assert(rcLines.includes("Long stop from (min): 4 → 6"), "change line for the long stop");
assert(rcLines.includes("Ride check on a possible crash: on → off"), "change line for possible crash");
assert(rcLines.includes("Dropped far away from (m): 500 → 800"), "change line for dropped far away");
assert(copyParts(withRc({ stopMin: 9 }), zoneDefault("Z002"), ["safety"]).rideCheck.stopMin === 9, "copying the Safety tab copies Ride check");
assert(copyParts(withRc({ stopMin: 9 }), zoneDefault("Z002"), ["modes"]).rideCheck.stopMin === 4, "other tabs leave Ride check alone");
assert(BUILT_IN_PRESETS.every((preset) => zoneIssues(applyPreset(zoneDefault("Z001"), preset, "SE")).length === 0 && applyPreset(zoneDefault("Z001"), preset, "SE").rideCheck.farM === 500), "built-in presets stay valid and carry Ride check");
// Saves from before Ride check get the defaults; broken values fall back, the rest is kept.
const { rideCheck: _rc, ...rcOld } = base;
void _rc;
const rcBook = normalizeDispatchBook(JSON.parse(JSON.stringify({
  ...emptyDispatchBook(),
  live: { Z001: rcOld, Z002: { ...base, rideCheck: { stopMin: 7, farOn: "yes", routeKm: null } } },
})));
assert(JSON.stringify(liveRules(rcBook, "Z001").rideCheck) === JSON.stringify(rcDefault) && zoneIssues(liveRules(rcBook, "Z001")).length === 0, "old live rules get Ride check");
const rcPartial = liveRules(rcBook, "Z002").rideCheck;
assert(rcPartial.stopMin === 7 && rcPartial.farOn === true && rcPartial.routeKm === 2 && rcPartial.longerPct === 50, "a part-saved Ride check keeps its values and fills the rest");
assert(changeLines(liveRules(rcBook, "Z001"), draftRules(rcBook, "Z001")).length === 0, "old rules without Ride check do not show as changed");
const rcPreset: Preset = { id: "P-check", name: "Old", note: "", builtIn: false, values: rcOld as unknown as Preset["values"] };
assert(applyPreset(zoneDefault("Z003"), rcPreset, "SE").rideCheck.longerPct === 50, "an old preset gets Ride check");
assert(rulesFile(rcBook, "SE", "now").zones[0].rules.rideCheck.farM === 500 && rulesFile(rcBook, "SE", "now").glossary.rideCheck.includes("farM"), "the rules file has Ride check");

// Reservations: who gets them, the Home popup, Exclusive, Radar trips and what happens when a driver cancels.
const resv = base.reservation;
assert(resv.listTo === "all" && resv.listMinRating === 4.5, "by default every driver in the zone gets reservations in Scheduled rides");
assert(resv.homePopup && resv.homePopupAfterMin === 10, "by default the Home popup starts 10 min after booking");
assert(resv.toExclusive && resv.exclusiveBeforeMin === 20 && resv.toRadar && resv.radarBeforeMin === 15, "by default Exclusive 20 min and Radar trips 15 min before pickup");
assert(resv.onDriverCancel === "byTime", "by default a cancelled reservation goes back by the time left");
const withResv = (patch: Partial<ReservationRules>): ZoneDispatch => ({ ...base, reservation: { ...resv, ...patch } });
const resvIssues = (patch: Partial<ReservationRules>) => zoneIssues(withResv(patch)).filter((line) => line.startsWith("Reservations:"));
assert(resvIssues({ radarBeforeMin: 20 })[0] === "Reservations: Radar trips must come after Exclusive (a smaller number of minutes before pickup).", "Radar trips come after Exclusive");
assert(resvIssues({ radarBeforeMin: 25 }).length === 1, "Radar at 25 min only breaks the order with Exclusive");
assert(resvIssues({ toExclusive: false, radarBeforeMin: 30 })[0] === "Reservations: Radar trips must come after the search starts (a smaller number of minutes).", "Radar trips come after the search starts");
assert(resvIssues({ toExclusive: false, radarBeforeMin: 25 }).length === 0, "without Exclusive, Radar only needs to be after the search starts");
assert(resvIssues({ toRadar: false, radarBeforeMin: 25 }).length === 0, "a Radar step that is off is not checked");
assert(resvIssues({ listTo: "rating", listMinRating: 6 })[0] === "Reservations: the lowest rating for Scheduled rides must be 1 to 5.", "rating for Scheduled rides has a limit");
assert(resvIssues({ listTo: "all", listMinRating: 6 }).length === 0, "the rating only counts with High rating only");
assert(resvIssues({ homePopupAfterMin: 0 })[0] === "Reservations: the Home popup must start 1 to 1440 minutes (24 h) after the rider booked.", "Home popup has a limit");
assert(resvIssues({ exclusiveBeforeMin: 0, radarBeforeMin: 0 }).includes("Reservations: Exclusive must start 1 to 180 minutes before pickup."), "Exclusive has a limit");
assert(resvIssues({ onDriverCancel: "home", homePopup: false })[0] === "Reservations: after a driver cancels it cannot go to the Home popup, because the Home popup is off.", "cancel to Home needs the popup");
assert(resvIssues({ onDriverCancel: "exclusive", toExclusive: false })[0] === "Reservations: after a driver cancels it cannot become Exclusive, because \"Becomes an Exclusive trip\" is off.", "cancel to Exclusive needs Exclusive");
assert(resvIssues({ on: false, radarBeforeMin: 25, onDriverCancel: "home", homePopup: false }).length === 0, "reservations off: nothing to check");

const flow = reservationTimeline(base, 180);
assert(flow.map((step) => step.id).join(",") === "list,home,exclusive,radar,pickup", "steps come in order: list, Home popup, Exclusive, Radar trips, pickup");
assert(flow.map((step) => step.afterBookedMin).join(",") === "0,10,160,165,180", "booked 3 h ahead: popup after 10 min, Exclusive 20 min and Radar 15 min before pickup");
assert(flow.every((step, index) => !step.skipped && (index === 0 || step.afterBookedMin >= flow[index - 1].afterBookedMin)), "every step happens, one after the other");
assert(flow[0].detail.startsWith("All drivers in the zone"), "the list step says who gets it");
const radarStep = flow.find((step) => step.id === "radar")!;
assert(!radarStep.title.includes("Exclusive") && radarStep.detail.includes("Never labelled Exclusive"), "Radar trips are never labelled Exclusive");
assert(reservationTimeline(withResv({ listTo: "rating", listMinRating: 4.8 }), 180)[0].detail.startsWith("Only drivers rated 4.8"), "list step with a rating");
// More ways to pick who gets it in Scheduled rides, and opening it to everyone later.
assert(resv.listGroupSize === 10 && resv.listHomeKm === 5 && resv.listNearKm === 5 && resv.listAreaTrips === 5 && resv.listOpenAll && resv.listOpenAllAfterMin === 30, "defaults for the group choices");
assert(resvIssues({ listTo: "random", listGroupSize: 0 })[0] === "Reservations: the random group must be 1 to 500 drivers.", "random group size has a limit");
assert(resvIssues({ listTo: "homeNear", listHomeKm: 80 })[0] === "Reservations: home near pickup must be 0.5 to 50 km.", "home distance has a limit");
assert(resvIssues({ listTo: "nearNow", listNearKm: 0 })[0] === "Reservations: near pickup now must be 0.5 to 50 km.", "near-now distance has a limit");
assert(resvIssues({ listTo: "areaRegulars", listAreaTrips: 0 })[0] === "Reservations: trips from the area must be 1 to 200.", "area trips have a limit");
assert(resvIssues({ listTo: "favourites", listOpenAllAfterMin: 0 })[0] === "Reservations: opening to all drivers must be 1 to 1440 minutes after booking.", "opening to all has a limit");
assert(resvIssues({ listTo: "all", listOpenAllAfterMin: 0, listGroupSize: 0 }).length === 0, "group settings only count with their choice");
assert(reservationTimeline(withResv({ listTo: "random", listGroupSize: 12 }), 180)[0].detail === "A random group of 12 drivers see it in Scheduled rides. Still untaken after 30 min: every driver in the zone sees it.", "list step with a random group");
assert(reservationTimeline(withResv({ listTo: "homeNear", listHomeKm: 3, listOpenAll: false }), 180)[0].detail === "Only drivers whose home is within 3 km of the pickup see it in Scheduled rides.", "list step with home near pickup, not opened to all");
assert(changeLines(base, withResv({ listTo: "homeNear" }))[0] === "Scheduled rides go to: all drivers in the zone → drivers whose home is near the pickup", "change line for home near pickup");
const late = reservationTimeline(base, 25);
assert(late.find((step) => step.id === "home")?.skipped?.includes("already Exclusive"), "booked 25 min ahead: Exclusive comes before the popup");
assert(late.find((step) => step.id === "exclusive")?.afterBookedMin === 5, "booked 25 min ahead: Exclusive after 5 min");
const soon = reservationTimeline(base, 15);
assert(soon.find((step) => step.id === "exclusive")?.afterBookedMin === 0 && soon.find((step) => step.id === "exclusive")?.detail.includes("at once"), "booked inside the Exclusive time: Exclusive at once");
assert(reservationTimeline(withResv({ homePopup: false }), 180).find((step) => step.id === "home")?.skipped === "Off.", "popup off shows as off");
assert(reservationTimeline({ ...base, radar: { ...base.radar, on: false } }, 180).find((step) => step.id === "radar")?.skipped === "Skipped: Radar is off in this zone.", "no Radar trips when Radar is off in the zone");
assert(homePopupSkippedBelowMin(base) === 30 && homePopupSkippedBelowMin(withResv({ homePopup: false })) === null, "rides booked under 30 min ahead skip the popup");

assert(reservationStepAt(base, 5, 100) === "list" && reservationStepAt(base, 10, 100) === "home", "list first, popup after its minutes");
assert(reservationStepAt(base, 160, 20) === "exclusive" && reservationStepAt(base, 165, 15) === "radar", "Exclusive, then Radar trips, by minutes before pickup");
assert(stepAfterDriverCancel(base, 120, 60) === "home", "cancel by time: the popup time has passed");
assert(stepAfterDriverCancel(withResv({ onDriverCancel: "list" }), 120, 60) === "list", "cancel back to the list: the popup waits again");
assert(stepAfterDriverCancel(withResv({ onDriverCancel: "home" }), 2, 600) === "home", "cancel to the popup at once");
assert(stepAfterDriverCancel(withResv({ onDriverCancel: "exclusive" }), 2, 600) === "exclusive", "cancel to Exclusive at once");
assert(stepAfterDriverCancel(withResv({ onDriverCancel: "list" }), 170, 10) === "radar", "a step closer to pickup wins over the chosen one");

const listChange = changeLines(base, withResv({ listTo: "rating", homePopupAfterMin: 15, onDriverCancel: "list" }));
assert(listChange.includes("Scheduled rides go to: all drivers in the zone → drivers with a high rating"), "change line for who gets Scheduled rides");
assert(listChange.includes("Home popup after booking: 10 → 15"), "change line for the popup time");
assert(listChange.includes("After a driver cancels: by time left → Scheduled rides"), "change line for the cancel rule");

// Saved rules from before these settings still load: drafts, live, history and undo, approvals, presets.
const oldReservation = { on: true, searchBeforeMin: 30, assignEarly: true, assignHoursBefore: 12, backup: false, toExclusive: true, exclusiveBeforeMin: 20 };
const oldZone = (patch: Record<string, unknown> = {}) => ({ ...base, reservation: { ...oldReservation, ...patch } }) as unknown as ZoneDispatch;
const oldBook = normalizeDispatchBook(JSON.parse(JSON.stringify({
  ...emptyDispatchBook(),
  draftRev: 7,
  live: { Z001: oldZone(), Z002: oldZone({ exclusiveBeforeMin: 10 }), Z003: oldZone({ exclusiveBeforeMin: 1, searchBeforeMin: 5 }) },
  draft: { Z004: oldZone({ listTo: "nobody", onDriverCancel: "never" }) },
  versions: [
    { rev: 7, at: "2026-09-01T10:00", actorId: "nora", note: "", zoneIds: ["Z001"], lines: ["Norrmalm: Backup driver: on → off"], live: { Z001: oldZone() }, liveCountries: {} },
    { rev: 6, at: "2026-08-01T10:00", actorId: "nora", note: "", zoneIds: ["Z001"], lines: [], live: { Z001: oldZone({ exclusiveBeforeMin: 12 }) }, liveCountries: {} },
  ],
}))) as DispatchBook;
const oldLive = liveRules(oldBook, "Z001");
assert(oldLive.reservation.backup === false && oldLive.reservation.listTo === "all" && oldLive.reservation.homePopupAfterMin === 10 && oldLive.reservation.toRadar && oldLive.reservation.radarBeforeMin === 15 && oldLive.reservation.onDriverCancel === "byTime", "old live rules get the new reservation settings");
assert(zoneIssues(oldLive).length === 0, "old live rules stay valid");
assert(liveRules(oldBook, "Z002").reservation.radarBeforeMin === 5 && zoneIssues(liveRules(oldBook, "Z002")).length === 0, "old rules with Exclusive at 10 min get Radar at 5 min");
assert(!liveRules(oldBook, "Z003").reservation.toRadar && zoneIssues(liveRules(oldBook, "Z003")).length === 0, "no room for Radar: the Radar step starts off");
const oldDraft = draftRules(oldBook, "Z004");
assert(oldDraft.reservation.listTo === "all" && oldDraft.reservation.onDriverCancel === "byTime", "unknown choices in a draft fall back to the defaults");
assert(changeLines(liveRules(oldBook, "Z001"), draftRules(oldBook, "Z001")).length === 0, "old rules do not show as changed");
const undone = undoTo(oldBook, 7, "nora", "2026-10-12T12:00");
assert(!undone.error && liveRules(undone.book, "Z001").reservation.exclusiveBeforeMin === 12 && liveRules(undone.book, "Z001").reservation.radarBeforeMin === 6, "undo to an old version fills the new settings");
const pending = publish(oldBook, { Z001: { ...oldLive, reservation: { ...oldLive.reservation, homePopupAfterMin: 20 } } }, {}, ["Z001"], "nora", "2026-10-12T13:00", "");
assert(!pending.error && pending.live[0] === "Z001" && liveRules(pending.book, "Z001").reservation.homePopupAfterMin === 20, "a reservation change publishes now");
assert(pending.book.versions[0].lines.join() === "Norrmalm: Home popup after booking: 10 → 20", "only the real change is listed");
const waitingOld = { ...oldBook, approvals: [{ id: "AP-old", kind: "publish" as const, zoneIds: ["Z001"], lines: ["Norrmalm: Main mode: Automatic → By hand"], by: "nora", at: "x", zones: { Z001: oldZone() } }] };
const approvedOld = approve(waitingOld, "AP-old", "lena", "2026-10-12T14:00");
assert(!approvedOld.error && liveRules(approvedOld.book, "Z001").reservation.toRadar, "an old waiting approval still goes live with the new settings");
const { zoneId: _zone, ...oldValues } = oldZone({ exclusiveBeforeMin: 10 });
void _zone;
const oldPreset: Preset = { id: "P-old", name: "Old", note: "", builtIn: false, values: oldValues };
const fromOldPreset = applyPreset(zoneDefault("Z002"), oldPreset, "SE");
assert(fromOldPreset.zoneId === "Z002" && fromOldPreset.reservation.homePopup && fromOldPreset.reservation.radarBeforeMin === 5 && zoneIssues(fromOldPreset).length === 0, "an old saved preset gets the new settings");
const resvFile = rulesFile(oldBook, "SE", "now");
assert(resvFile.zones[0].rules.reservation.homePopupAfterMin === 10 && resvFile.glossary.reservationTie.includes("random"), "rules file has the reservation steps and the tie rule");

console.log("dispatch rules ok");
