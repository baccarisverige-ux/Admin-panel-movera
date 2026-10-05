import { frontendGateC, gateC } from "./frontendC.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const rows = frontendGateC();
const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
assert(rows.length === 16, "sixteen");
for (const id of ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T09", "T10", "T11", "T14", "T15"]) {
  assert(byId[id]?.pass, `${id} ${byId[id]?.note}`);
}
for (const id of ["T08", "T12", "T13", "T16"]) {
  assert(byId[id]?.pass === false, `${id} must stay open`);
}
assert(gateC().passed === false, "official Gate C is not claimed");
assert(gateC().reason.includes("were not changed"), "apps stay untouched");

console.log("frontend gate C ok");
