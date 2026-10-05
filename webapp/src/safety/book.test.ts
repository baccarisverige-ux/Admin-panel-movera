import { impossibleTravel, publicIncident, resolveIncident, takeIncident } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const sos = { id: "INC-1", state: "queued" as const, locationAt: "2026-10-05T10:00:00Z", accuracyM: 12, ownerId: null };
assert(resolveIncident(sos).error, "must be taken first");
const taken = takeIncident(sos, "erik");
assert(resolveIncident(taken).incident.state === "resolved", "resolved");
const view = publicIncident(taken);
assert(!("pin" in view), "PIN is not in the view");
assert(view.locationAt === sos.locationAt && view.accuracyM === 12, "location time and accuracy");
assert(impossibleTravel(600, 10), "600 m in 10 s is impossible");
assert(!impossibleTravel(100, 10), "walking speed is fine");

console.log("safety ok");
