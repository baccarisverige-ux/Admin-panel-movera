import { chapter16, gateB } from "./scenarios.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const rows = chapter16();
const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
assert(rows.length === 16, "sixteen scenarios");
assert(rows.every((row) => row.staging === false), "none of these ran on staging");
for (const id of ["T07", "T10", "T11", "T14", "T15"]) {
  assert(byId[id]?.pass, `${id} should pass in the simulation`);
}
for (const id of ["T01", "T02", "T03", "T04", "T05", "T06", "T08", "T09", "T12", "T13", "T16"]) {
  assert(byId[id]?.pass === false, `${id} must not be claimed`);
}
assert(gateB(undefined).passed === false, "no URL is not Gate B");
assert(gateB("https://staging.example").passed === false, "a URL alone is not Gate B");

console.log("chapter 16 ok");
