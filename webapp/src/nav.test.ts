import { can } from "./auth/permissions.ts";
import { MENU, MENU_GROUPS, pageForPath } from "./nav.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(MENU_GROUPS.length === 8, "eight groups");
assert(new Set(MENU.map((item) => item.id)).size === MENU.length, "ids are unique");
assert(pageForPath("/trips")?.id === "trips", "trips route");
assert(pageForPath("/drivers/D2847")?.id === "drivers", "driver record");
assert(pageForPath("/tickets/S1")?.id === "support", "ticket record");
assert(pageForPath("/no-such") === undefined, "unknown path is not a page");
assert(MENU.some((item) => item.id === "drivers" && item.path === "/drivers"), "drivers address");
assert(!MENU.some((item) => item.path === "/franchise" || item.path === "/database" || item.path === "/api"), "old pages are gone");
assert(pageForPath("/incidents")?.group === "Operations", "incidents sit in Operations");
assert(pageForPath("/risk")?.group === "Operations", "risk sits in Operations");

const support = MENU.filter((item) => can("support", item.permission));
assert(support.some((item) => item.id === "support") && support.some((item) => item.id === "riders"), "support sees its work");
assert(!support.some((item) => item.group === "Finance" || item.group === "Platform"), "support does not see finance or platform");

console.log("admin nav ok");
