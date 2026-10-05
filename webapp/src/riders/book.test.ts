import { advancePrivacy, blockRider, creditWallet, findRiders, RIDERS, signOutRider } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(findRiders(RIDERS, "070 111").length === 0, "spaces must match stored phone");
assert(findRiders(RIDERS, "111 22 33").length === 1, "find by phone");
assert(findRiders(RIDERS, "T1002")[0]?.name === "Omar Haddad", "find by trip");
assert(findRiders(RIDERS, "emma").length === 1, "find by name");
assert(blockRider(RIDERS[0]!, true, "").error === "A reason is required.", "block needs a reason");
assert(blockRider(RIDERS[0]!, true, "Fraud").rider.blocked, "block sticks");
const stepped = advancePrivacy(advancePrivacy({ ...RIDERS[1]!, privacy: "new" }));
assert(stepped.privacy === "done", "privacy reaches done");
assert(creditWallet(RIDERS[0]!, 60_000).error?.includes("500 kr"), "credit ceiling");
assert(creditWallet(RIDERS[0]!, 10_000).rider.walletOre === 20_000, "one credit line");
assert(signOutRider(RIDERS[0]!).sessions === 0, "signed out");

console.log("riders ok");
