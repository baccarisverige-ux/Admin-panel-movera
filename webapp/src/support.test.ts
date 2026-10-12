import type { DemoRecord } from "./api/seed.ts";
import { autoTopic, emptyDesk, factsOf, linkCase, reopen, settingsError, setTopic, setWaiting, solve, teamNumbers, templatesFor } from "./support/desk.ts";
import { emptySupport } from "./support/ops.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const now = Date.parse("2026-10-12T12:00:00Z");
const ticket = (id: string, status = "open", zoneId = "Z001"): DemoRecord => ({ id, name: "Maja Lind", phone: "+46 70 000 00 01", zoneId, status });
const desk = emptyDesk();
const book = emptySupport();

assert(autoTopic("I was charged twice, please refund", "rider", 0) === "payment", "words decide the topic");
assert(autoTopic("My payout is low", "driver", 0) === "pay", "driver pay for drivers");
assert(autoTopic("nothing special", "rider", 7) !== "pay", "riders never get the driver pay topic");
const fresh = factsOf(ticket("S001"), book, desk, now, "rider");
assert(fresh.state === "new" && fresh.owner === null && fresh.country === "SE" && ["sv", "en"].includes(fresh.lang), "a new Swedish ticket");
assert(factsOf(ticket("S1001", "open", "FR-OCE"), book, desk, now, "rider").lang !== "sv", "French tickets are not in Swedish");
assert(factsOf(ticket("S002", "claimed"), book, desk, now, "rider").state === "taken", "claimed tickets have someone on them");
const moved = setTopic(desk, "S001", "lost");
assert(factsOf(ticket("S001"), book, moved, now, "rider").topic === "lost", "the topic can be changed");
assert(factsOf(ticket("S001"), book, setWaiting(desk, "S001", true), now, "rider").state === "waiting", "waiting for the customer");
assert(solve(desk, "S001", "nora", " ", "2026-10-12T12:00:00Z", true).error, "solving needs a note");
const solved = solve(desk, "S001", "nora", "Refunded", "2026-10-12T12:00:00Z", true).desk;
const after = factsOf(ticket("S001"), book, solved, now, "rider");
assert(after.state === "solved" && after.solvedBy === "nora" && (after.rating ?? 0) >= 3, "solved by a name, with a rating");
assert(solve(desk, "S001", "nora", "Done", "2026-10-12T12:00:00Z", false).desk.tickets.S001.rating === undefined, "no rating when ratings are off");
assert(factsOf(ticket("S001"), book, reopen(solved, "S001"), now, "rider").state !== "solved", "reopen");
assert(linkCase(desk, "S001", "INC-S001").tickets.S001.caseIds?.[0] === "INC-S001", "incident linked");
const team = teamNumbers([after, factsOf(ticket("S002", "claimed"), book, desk, now, "rider")]);
assert(team.find((row) => row.agentId === "nora")?.solved === 1, "numbers per admin");
assert(templatesFor(desk.settings.SE, "payment", "sv")[0].lang === "sv", "the ticket's language comes first");
assert(settingsError({ ...desk.settings.SE, limits: { ...desk.settings.SE.limits, safety: { firstReplyMin: 600, solveHours: 4 } } }), "the first answer must come before solving");
assert(settingsError({ ...desk.settings.SE, templates: [{ id: "x", topic: "any", lang: "sv", title: "", text: "Hej" }] }), "a reply needs a title");

console.log("support ok");
