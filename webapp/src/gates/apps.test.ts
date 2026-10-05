import { APPS, tripContractMatchesApps } from "./apps.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(APPS.map((app) => app.id).join() === "rider,driver", "both frontends");
assert(APPS[0]?.sha.startsWith("334cb56") && APPS[1]?.sha.startsWith("35ef72f"), "recorded SHAs");
assert(tripContractMatchesApps(), "admin trip statuses match the app wire names");

console.log("apps ok");
