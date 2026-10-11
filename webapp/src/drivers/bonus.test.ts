import {
  bonusState,
  emptyBonusBook,
  evaluateBonus,
  inAudience,
  inWindow,
  localParts,
  longestChain,
  maxPerDriver,
  newBonus,
  normalizeBonusBook,
  rideCounts,
  ruleLines,
  saveBonus,
  setBonusStatus,
  timeLine,
  validateBonus,
  windowMinutes,
  type BonusRide,
  type DriverBonus,
  type DriverDay,
} from "./bonus.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
const TZ = "Europe/Stockholm";
// Monday 12 October 2026. Stockholm is UTC+2 in October.
const at = (local: string) => Date.parse(`2026-10-12T${local}:00+02:00`);
const ride = (id: string, start: string, minutes: number, extra: Partial<BonusRide> = {}): BonusRide => ({
  id,
  start: at(start),
  end: at(start) + minutes * 60_000,
  fare: 200,
  km: 8,
  category: "economy",
  zoneId: "Z001",
  pickup: [59.334, 18.063],
  dropoff: [59.31, 18.07],
  ...extra,
});
const day = (rides: BonusRide[], extra: Partial<DriverDay> = {}): DriverDay => ({ rides, cancelPct: 5, acceptPct: 90, rating: 4.9, onlineMin: 120, ...extra });
const base = (): DriverBonus => ({ ...newBonus("rides", "SE", "nora", at("06:00")), id: "B1", from: "2026-10-01" });

// Local time and windows.
assert(localParts(at("07:30"), TZ).day === 0 && localParts(at("07:30"), TZ).minutes === 450, "Monday 07:30 in Stockholm");
const rush = base();
assert(inWindow(rush, at("07:00"), TZ) && inWindow(rush, at("08:59"), TZ), "07:00 and 08:59 are inside 07–09");
assert(!inWindow(rush, at("09:00"), TZ) && !inWindow(rush, at("06:59"), TZ), "09:00 and 06:59 are outside");
assert(!inWindow(rush, Date.parse("2026-10-17T07:30:00+02:00"), TZ), "Saturday is not a weekday");
assert(!inWindow({ ...rush, from: "2026-10-13" }, at("07:30"), TZ), "before the first day");
assert(!inWindow({ ...rush, until: "2026-10-11" }, at("07:30"), TZ), "after the last day");
const night = { ...rush, start: "22:00", end: "02:00", days: [4] };
assert(inWindow(night, Date.parse("2026-10-16T23:30:00+02:00"), TZ), "Friday 23:30 is in the Friday night window");
assert(inWindow(night, Date.parse("2026-10-17T01:30:00+02:00"), TZ), "Saturday 01:30 still belongs to Friday night");
assert(!inWindow(night, Date.parse("2026-10-18T01:30:00+02:00"), TZ), "Sunday 01:30 belongs to Saturday night, not picked");
assert(windowMinutes(night) === 240 && windowMinutes(rush) === 120, "window lengths");
assert(timeLine(rush) === "Mon–Fri · 07:00–09:00" && timeLine({ ...rush, days: [0, 1, 2, 3, 4, 5, 6] }).startsWith("Every day"), "time in words");

// Ride target: 3 rides between 07 and 09.
assert(evaluateBonus(rush, day([ride("a", "07:05", 15), ride("b", "07:30", 15), ride("c", "08:10", 20)]), TZ).earned === 150, "3 rides earn 150");
const two = evaluateBonus(rush, day([ride("a", "07:05", 15), ride("b", "07:30", 15), ride("c", "09:10", 20)]), TZ);
assert(two.earned === 0 && two.counted === 2 && two.target === 3, "a ride after 09:00 does not count");
const cancels = evaluateBonus(rush, day([ride("a", "07:05", 15), ride("b", "07:30", 15), ride("c", "08:10", 20)], { cancelPct: 12 }), TZ);
assert(!cancels.eligible && cancels.earned === 0 && cancels.failed[0]!.includes("Cancel rate 12%"), "cancel rate above 10% earns nothing");
const relaxed = { ...rush, rules: { ...rush.rules, maxCancelPct: { on: false, value: 10 } } };
assert(evaluateBonus(relaxed, day([ride("a", "07:05", 15), ride("b", "07:30", 15), ride("c", "08:10", 20)], { cancelPct: 40 }), TZ).earned === 150, "a rule switched off does not block");

// Back to back.
const chain = [ride("a", "07:00", 15), ride("b", "07:25", 15), ride("c", "08:20", 15), ride("d", "08:40", 10)];
assert(longestChain(chain, 20).map((item) => item.id).join() === "a,b", "gap of 10 min keeps the chain, 40 min breaks it");
const backToBack = { ...rush, rules: { ...rush.rules, backToBack: { on: true, value: 20 } } };
assert(evaluateBonus(backToBack, day(chain), TZ).counted === 2 && evaluateBonus(backToBack, day(chain), TZ).earned === 0, "only 2 rides in a row: no bonus");
assert(evaluateBonus(backToBack, day([ride("a", "07:00", 15), ride("b", "07:25", 15), ride("c", "07:50", 15)]), TZ).earned === 150, "3 rides in a row: bonus");

// Steps.
const steps: DriverBonus = { ...rush, start: "06:00", end: "23:00", reward: { ...rush.reward, type: "steps", steps: [{ rides: 3, amount: 100 }, { rides: 5, amount: 200 }, { rides: 8, amount: 350 }] } };
const many = (count: number) => Array.from({ length: count }, (_, index) => ride(`r${index}`, `${String(7 + index).padStart(2, "0")}:00`, 30));
assert(evaluateBonus(steps, day(many(2)), TZ).earned === 0 && evaluateBonus(steps, day(many(2)), TZ).target === 3, "2 rides: nothing yet, next step 3");
assert(evaluateBonus(steps, day(many(4)), TZ).earned === 100 && evaluateBonus(steps, day(many(4)), TZ).target === 5, "4 rides: first step, next 5");
assert(evaluateBonus(steps, day(many(9)), TZ).earned === 350 && evaluateBonus(steps, day(many(9)), TZ).target === null, "9 rides: top step");
assert(validateBonus({ ...steps, reward: { ...steps.reward, steps: [{ rides: 5, amount: 200 }, { rides: 3, amount: 300 }] } })?.includes("more rides"), "steps must go up");

// Extra per ride, with caps and filters.
const perRide: DriverBonus = { ...steps, reward: { ...steps.reward, type: "per_ride", amount: 40 }, rules: { ...steps.rules, maxRides: { on: true, value: 3 }, maxPayout: { on: true, value: 500 }, minFare: { on: true, value: 150 } } };
assert(evaluateBonus(perRide, day([...many(5), ride("cheap", "08:30", 10, { fare: 90 })]), TZ).earned === 120, "max 3 rides count, the cheap ride is out");
assert(evaluateBonus({ ...perRide, rules: { ...perRide.rules, maxPayout: { on: true, value: 100 } } }, day(many(5)), TZ).capped, "payout cap");
assert(evaluateBonus({ ...perRide, rules: { ...perRide.rules, categories: { on: true, value: ["comfort"] } } }, day(many(5)), TZ).earned === 0, "category rule");
assert(rideCounts(perRide, ride("x", "08:00", 10, { km: 1 }), TZ) === null && rideCounts({ ...perRide, rules: { ...perRide.rules, minKm: { on: true, value: 2 } } }, ride("x", "08:00", 10, { km: 1 }), TZ) === "ride too short", "minimum distance");
assert(validateBonus({ ...perRide, rules: { ...perRide.rules, maxPayout: { on: false, value: 0 } } })?.includes("most one driver"), "per ride needs a payout cap");

// Boost and guarantee.
const boost: DriverBonus = { ...perRide, reward: { ...perRide.reward, type: "multiplier", multiplier: 1.5 }, rules: { ...perRide.rules, maxRides: { on: false, value: 3 }, minFare: { on: false, value: 0 } } };
assert(evaluateBonus(boost, day(many(2)), TZ).earned === 160, "×1.5 on 2 rides of 200 at 80% share is 160");
const guarantee: DriverBonus = { ...rush, reward: { ...rush.reward, type: "guarantee", amount: 300 }, rules: { ...rush.rules, maxPayout: { on: true, value: 1000 } } };
assert(evaluateBonus(guarantee, day([ride("a", "07:10", 20)], { onlineMin: 120 }), TZ).earned === 440, "2 h at 300/h = 600, minus 160 earned = 440");
assert(evaluateBonus(guarantee, day([ride("a", "07:10", 20)], { onlineMin: 600 }), TZ).earned === 440, "online time counts only inside the window");

// Area bonus.
const area: DriverBonus = { ...newBonus("area", "SE", "nora", at("06:00")), from: "2026-10-01", areas: [{ id: "A", name: "Arlanda", ring: [[59.63, 17.9], [59.63, 17.96], [59.67, 17.96], [59.67, 17.9]] }] };
const fromAirport = ride("air", "07:10", 40, { pickup: [59.649, 17.929], dropoff: [59.334, 18.063] });
const toAirport = ride("to", "07:10", 40, { pickup: [59.334, 18.063], dropoff: [59.649, 17.929] });
assert(rideCounts(area, fromAirport, TZ) === null && rideCounts(area, toAirport, TZ) === "pickup outside the area", "pickup inside counts");
assert(rideCounts({ ...area, areaCounts: "dropoff" }, toAirport, TZ) === null, "drop-off inside counts");
assert(rideCounts({ ...area, areaCounts: "both" }, fromAirport, TZ) === "not inside the area", "both must be inside");
assert(validateBonus({ ...area, areas: [] }) === "Draw at least one area on the map.", "area bonus needs an area");
assert(validateBonus({ ...area, areas: [{ id: "B", name: "Bow", ring: [[0, 0], [1, 1], [1, 0], [0, 1]] }] })?.includes("crosses itself"), "a crossing area is refused");

// Zones for ride bonuses.
assert(rideCounts({ ...rush, zones: ["Z002"] }, ride("a", "07:10", 10), TZ) === "outside the zones", "zone filter");

// Driver rules.
const strict = { ...rush, rules: { ...rush.rules, minAcceptPct: { on: true, value: 85 }, minRating: { on: true, value: 4.8 }, minOnlineMin: { on: true, value: 90 } } };
const failed = evaluateBonus(strict, day(many(3), { acceptPct: 70, rating: 4.6, onlineMin: 30 }), TZ);
assert(failed.failed.length === 3 && failed.earned === 0, "acceptance, rating and online time are checked");
assert(validateBonus({ ...strict, rules: { ...strict.rules, minOnlineMin: { on: true, value: 200 } } })?.includes("longer than the window"), "online time fits the window");

// Who gets it.
const driver = { id: "D1", fleetId: "F1", status: "active", rating: 4.9, joinedDays: 10 };
assert(inAudience(rush, driver) && !inAudience(rush, { ...driver, status: "on_hold" }), "only active drivers");
assert(inAudience({ ...rush, audience: "new" }, driver) && !inAudience({ ...rush, audience: "new" }, { ...driver, joinedDays: 60 }), "new drivers");
assert(inAudience({ ...rush, audience: "fleet", fleetId: "F1" }, driver) && !inAudience({ ...rush, audience: "fleet", fleetId: "F2" }, driver), "one fleet");
assert(inAudience({ ...rush, audience: "picked", driverIds: ["D1"] }, driver) && !inAudience({ ...rush, audience: "top" }, { ...driver, rating: 4.7 }), "picked and top");

// Validation and saving.
assert(validateBonus(rush) === null, "the default bonus is valid");
assert(validateBonus({ ...rush, note: "x".repeat(141) })?.includes("140 characters") && validateBonus({ ...rush, note: "Wait at door 4" }) === null, "message to drivers up to 140 characters");
assert(validateBonus({ ...rush, start: "9:5" }) === "Times look like 07:00.", "time format");
assert(validateBonus({ ...rush, start: "08:00", end: "08:00" })?.includes("cannot be the same"), "empty window");
assert(validateBonus({ ...rush, days: [] }) === "Pick at least one day.", "days");
assert(validateBonus({ ...rush, budget: 100 })?.includes("more than the whole budget"), "budget below one payout");
assert(maxPerDriver(rush) === 150 && maxPerDriver(perRide) === 120, "most per driver");
const book = emptyBonusBook();
assert(book.bonuses.every((item) => validateBonus(item) === null), "seed bonuses are valid");
const saved = saveBonus(book, rush, "nora", at("06:00"));
assert(!saved.error && saved.book.bonuses.length === 3 && saved.book.draftRev === 2 && saved.id !== "B1", "a new bonus gets its own id");
const edited = saveBonus(saved.book, { ...saved.book.bonuses[0]!, name: "Rush" }, "lena", at("06:00"));
assert(edited.book.bonuses.length === 3 && edited.book.bonuses[0]!.name === "Rush" && edited.book.bonuses[0]!.editedBy === "lena", "editing keeps the id");
assert(saveBonus(book, { ...rush, name: " " }, "nora", 0).error, "bad bonus is not saved");
const paused = setBonusStatus(book, "B-SEED-1", "paused");
assert(paused.bonuses[0]!.status === "paused" && bonusState(paused.bonuses[0]!, at("07:30"), TZ) === "paused", "pause");
assert(setBonusStatus(setBonusStatus(book, "B-SEED-1", "ended"), "B-SEED-1", "active").bonuses[0]!.status === "ended", "an ended bonus stays ended");
assert(bonusState(book.bonuses[0]!, at("06:00"), TZ) === "today" && bonusState(book.bonuses[0]!, at("07:30"), TZ) === "live" && bonusState(book.bonuses[0]!, at("12:00"), TZ) === "done", "later today, live now, done for today");
assert(bonusState(book.bonuses[0]!, Date.parse("2026-10-17T07:30:00+02:00"), TZ) === "scheduled", "not on Saturday");
assert(normalizeBonusBook({ draftRev: 4, bonuses: [{ id: "X", kind: "rides", country: "FR", name: "Old" }] }).bonuses[0]!.rules.maxCancelPct.on === true, "older saved bonuses get the rules");
assert(ruleLines(backToBack, (value) => `${value} kr`, (id) => id).some((line) => line.includes("back to back")), "rules in words");


// Demo progress today.
import("./bonusDemo.ts").then(({ windowSoFar, bonusSummary }) => {
  assert(windowSoFar(rush, at("06:30"), TZ) === null, "window not started");
  assert(windowSoFar(rush, at("08:00"), TZ)?.elapsed === 60 && windowSoFar(rush, at("08:00"), TZ)?.start === at("07:00"), "one hour into the window");
  assert(windowSoFar(rush, at("12:00"), TZ)?.elapsed === 120, "a finished window counts in full");
  assert(windowSoFar(night, Date.parse("2026-10-17T01:00:00+02:00"), TZ)?.elapsed === 180, "after midnight in a night window");
  const crowd = Array.from({ length: 40 }, (_, index) => ({ facts: { id: `D${index}`, fleetId: null, status: "active", rating: 4.9, joinedDays: 100 }, home: [59.334, 18.063] as [number, number], zoneId: "Z001" }));
  const open = bonusSummary(relaxed, crowd, at("12:00"), TZ);
  assert(open.drivers === 40 && open.reached > 0 && open.paid === open.reached * 150, "everyone who reached it gets 150");
  const tight = bonusSummary({ ...relaxed, budget: 300 }, crowd, at("12:00"), TZ);
  assert(tight.paid <= 300 && tight.budgetLeft === 300 - tight.paid, "the budget stops payouts");
  console.log("driver bonus ok");
});
