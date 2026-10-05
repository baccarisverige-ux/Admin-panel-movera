import { activate, blankDocuments, reviewDocument, setAccount, vehicleBlock, type Driver } from "./gate.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const driver: Driver = {
  id: "D1",
  name: "Erik Lind",
  fleet: false,
  status: "pending",
  documents: blankDocuments(),
  vehicle: { year: 2022, seats: 4, fuel: "electric", category: "economy" },
};

assert(activate(driver).error?.includes("Still needed"), "cannot activate with missing documents");
let ready = driver;
for (const id of Object.keys(ready.documents) as (keyof Driver["documents"])[]) {
  ready = reviewDocument(ready, id, "approved");
}
assert(activate(ready).driver.status === "active", "approved documents can activate");

const fleet: Driver = { ...driver, fleet: true, documents: { ...blankDocuments(), company_registration: "needed" } };
let fleetReady = fleet;
for (const id of Object.keys(fleetReady.documents) as (keyof Driver["documents"])[]) {
  if (id === "company_registration") continue;
  fleetReady = reviewDocument(fleetReady, id, "approved");
}
assert(activate(fleetReady).driver.status === "active", "fleet skips company registration");

assert(
  vehicleBlock({ year: 2022, seats: 4, fuel: "petrol", category: "electric" })?.includes("electric"),
  "electric rule",
);
assert(vehicleBlock({ year: 2022, seats: 4, fuel: "petrol", category: "xl" })?.includes("6 seats"), "xl seats");
assert(setAccount(ready, "suspended", "").error === "A reason is required.", "suspension needs a reason");
assert(setAccount(ready, "suspended", "Documents expired").driver.status === "suspended", "suspension with reason");

console.log("drivers ok");
