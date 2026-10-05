import { redeemReferral } from "./referral.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const code = { code: "SARA20", ownerId: "R9", uses: 0, cap: 2 };
assert(redeemReferral(code, "R9").error?.includes("own code"), "self referral refused");
const once = redeemReferral(code, "R1");
assert(once.referral.uses === 1, "one use");
const full = redeemReferral({ ...code, uses: 2 }, "R2");
assert(full.error?.includes("cap"), "cap stops it");

console.log("referral ok");
