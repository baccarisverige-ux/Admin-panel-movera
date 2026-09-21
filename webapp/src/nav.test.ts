import { ADMIN_PAGES, pageForPath } from "./nav";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(ADMIN_PAGES.length === 22, "expected 22 admin screens");
assert(pageForPath("/trips").id === "trips", "trips route");
assert(pageForPath("/unknown").id === "dashboard", "unknown path falls back");

console.log("admin nav ok");
