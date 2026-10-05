import {
  AGENTS,
  can,
  deactivateAgent,
  isIdle,
  permissionForPage,
  rowMatchesZone,
  scopeZone,
  signIn,
} from "./permissions.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const nora = AGENTS[0]!;
const maja = AGENTS[2]!;

assert(signIn(AGENTS, { email: "nora@movera.se", password: "movera", code: "123456" }).ok, "nora signs in");
assert(!signIn(AGENTS, { email: "nora@movera.se", password: "movera", code: "000000" }).ok, "wrong code");
assert(!signIn(AGENTS, { email: "nobody@movera.se", password: "movera", code: "123456" }).ok, "unknown agent");

assert(can("super", "system.read"), "super can do anything");
assert(!can("support", "settings.read"), "support cannot open settings");
assert(can("ops", "settings.read"), "ops can open settings");
assert(!can("support", permissionForPage("payments")), "support cannot open payments");
assert(can("finance", permissionForPage("payments")), "finance can open payments");

const idleAt = 1_000_000;
assert(!isIdle(idleAt, idleAt + 14 * 60 * 1000), "14 minutes is still active");
assert(isIdle(idleAt, idleAt + 15 * 60 * 1000), "15 minutes signs out");

const deactivated = deactivateAgent(AGENTS, "maja", nora);
assert(Array.isArray(deactivated) && deactivated.find((agent) => agent.id === "maja")?.active === false, "super deactivates");
assert("error" in deactivateAgent(AGENTS, "nora", nora), "cannot deactivate yourself");
assert("error" in deactivateAgent(AGENTS, "nora", maja), "support cannot deactivate");
const after = deactivateAgent(AGENTS, "maja", nora);
assert(Array.isArray(after) && !signIn(after, { email: maja.email, password: maja.password, code: maja.code }).ok, "deactivated cannot sign in");

assert(scopeZone("?zone=Norrmalm") === "Norrmalm", "scope from the url");
assert(scopeZone("") === "all", "missing scope is all");
assert(rowMatchesZone(["Z001", "Norrmalm", "Stockholm"], "norrmalm"), "row matches zone");
assert(!rowMatchesZone(["Z002", "Södermalm", "Stockholm"], "Norrmalm"), "other zone hidden");

console.log("auth ok");
