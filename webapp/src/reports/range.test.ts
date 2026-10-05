import { rowsInRange } from "./range.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const rows = [
  { date: "2026-09-01", zone: "Solna", trips: "3", fare: "800 kr" },
  { date: "2026-10-01", zone: "Norrmalm", trips: "42", fare: "12 400 kr" },
  { date: "2026-10-04", zone: "=cmd", trips: "1", fare: "+100" },
];
assert(rowsInRange(rows, "2026-10-05", "2026-10-01").error?.includes("after"), "reversed range refused");
const slice = rowsInRange(rows, "2026-10-01", "2026-10-05");
assert(slice.rows.length === 2 && slice.rows[0]?.zone === "Norrmalm", "September is outside the range");

console.log("range ok");
