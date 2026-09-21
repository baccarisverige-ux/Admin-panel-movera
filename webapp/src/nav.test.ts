import { ADMIN_PAGES, pageForPath } from "./nav.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(ADMIN_PAGES.length === 22, "expected 22 admin screens");
assert(pageForPath("/trips").id === "trips", "trips route");
assert(pageForPath("/unknown").id === "dashboard", "unknown path falls back");
assert(
  ADMIN_PAGES.some((page) => page.id === "users" && page.label === "User Management"),
  "users label matches static title",
);
assert(
  new Set(ADMIN_PAGES.map((page) => page.id)).size === 22,
  "page ids are unique",
);

console.log("admin nav ok");
