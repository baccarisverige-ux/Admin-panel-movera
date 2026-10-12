import { DRIVER_DOCUMENTS, type DocStatus } from "./drivers/gate.ts";
import { countryActivationIssue, demoLeads, docProgress, driverMessage, emptyOnboardingRules, funnel, neededDocs, remind, reminderDue, rulesError as onboardingError, stepOf, type Applicant } from "./drivers/onboarding.ts";
import { carDocs, carEarnings, categoryProblem, checks, emptyVehicleRules, fits, photosOf, rulesError, rulesImpact, setPhoto, shouldHold } from "./vehicles/rules.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

// Vehicles
const rules = emptyVehicleRules();
const se = rules.countries.SE;
const old = { year: 2013, seats: 4, fuel: "petrol" as const, category: "economy" as const };
const ev = { year: 2022, seats: 4, fuel: "electric" as const, category: "electric" as const };
assert(fits(old, se).length === 0, "a 2013 car fits nothing in Sweden");
assert(fits(old, rules.countries.TN).includes("economy"), "Tunisia allows older cars");
assert(fits(ev, se).includes("electric") && fits(ev, se).includes("premium"), "a new electric car fits many categories");
assert(categoryProblem({ ...ev, fuel: "petrol" }, se.categories.find((rule) => rule.category === "electric")!)?.includes("not allowed"), "electric needs an electric car");
assert(categoryProblem({ ...ev, seats: 4 }, se.categories.find((rule) => rule.category === "xl")!)?.includes("needs 6"), "XL needs six seats");
const now = Date.parse("2026-10-12T12:00:00Z");
const profile = { insuranceExpiresAt: "2026-10-20", inspectionExpiresAt: "2026-09-01", registrationStatus: "approved" as const };
const docs = carDocs(profile, {}, now);
assert(docs.find((doc) => doc.id === "insurance")?.health === "expiring", "insurance expiring soon");
assert(docs.find((doc) => doc.id === "inspection")?.health === "invalid", "inspection expired");
assert(shouldHold(docs, se) && !shouldHold(docs, { ...se, autoHold: false }), "auto hold follows the switch");
assert(carDocs({ ...profile, inspectionExpiresAt: "2027-09-01" }, { vehicle_insurance: { status: "expired" as DocStatus, expiresAt: "2026-10-01" } }, now).find((doc) => doc.id === "insurance")?.expiresAt === "2026-10-01", "the worse paper and its date count");
assert(carDocs(profile, { vehicle_insurance: { status: "needed" as DocStatus, expiresAt: "" } }, now).find((doc) => doc.id === "insurance")?.health === "expiring", "a paper not uploaded yet does not count against the car");
const photos = setPhoto(rules, "V0002", "inside", "rejected", "nora", "2026-10-12T12:00:00Z", "Dark");
assert(photosOf(photos, "V0002").inside.status === "rejected", "photo review is kept");
assert(checks(ev, carDocs({ ...profile, inspectionExpiresAt: "2027-09-01" }, {}, now), photosOf(photos, "V0002"), se, "electric").find((item) => item.label === "Photos")?.ok === false, "a rejected photo fails the checks");
assert(rulesError({ ...se, categories: se.categories.map((rule) => (rule.category === "economy" ? { ...rule, fuels: [] } : rule)) }), "a category needs a fuel");
const impact = rulesImpact([old, ev], se, { ...se, categories: se.categories.map((rule) => (rule.category === "economy" ? { ...rule, minYear: 2010 } : rule)) });
assert(impact.find((row) => row.category === "economy")?.before === 1 && impact.find((row) => row.category === "economy")?.after === 2, "rule changes show how many cars gain a category");
assert(carEarnings([{ id: "T1", name: "", phone: "", zoneId: "Z001", status: "completed", driverId: "D1", fareOre: 5000 }], "D1").grossMinor === 5000, "earnings per car");

// Onboarding
const onboarding = emptyOnboardingRules();
const docsWith = (status: DocStatus) => Object.fromEntries(DRIVER_DOCUMENTS.map((id) => [id, { status }])) as Applicant["docs"];
const applicant: Applicant = { id: "D9", name: "Elin Berg", zoneId: "Z001", fleet: false, status: "pending", docs: docsWith("needed"), bankOk: true, carOk: true };
assert(stepOf(applicant, onboarding.countries.SE) === "signup", "nothing uploaded is signed up");
assert(stepOf({ ...applicant, docs: { ...docsWith("needed"), driver_license: { status: "in_review" } } }, onboarding.countries.SE) === "documents", "uploading is the documents step");
const papersDone = { ...docsWith("approved"), terms: { status: "needed" as DocStatus }, virtual_session: { status: "needed" as DocStatus } };
assert(stepOf({ ...applicant, docs: papersDone, bankOk: false }, onboarding.countries.SE) === "checks", "bank waits in checks");
assert(stepOf({ ...applicant, docs: papersDone }, onboarding.countries.SE) === "training", "training last");
assert(stepOf({ ...applicant, docs: papersDone }, { ...onboarding.countries.SE, steps: onboarding.countries.SE.steps.map((step) => (step.id === "training" ? { ...step, on: false } : step)) }) === "ready", "a step turned off is skipped");
assert(stepOf({ ...applicant, docs: docsWith("approved") }, onboarding.countries.SE) === "ready", "all done is ready");
assert(!neededDocs(onboarding.countries.FR, false).includes("taxi_traffic_permit") && neededDocs(onboarding.countries.SE, false).includes("taxi_traffic_permit"), "papers per country");
assert(!neededDocs(onboarding.countries.SE, true).includes("company_registration"), "fleet drivers skip company registration");
assert(docProgress({ ...applicant, docs: { ...docsWith("needed"), driver_license: { status: "approved" } } }, onboarding.countries.SE).done === 1, "progress");
assert(countryActivationIssue({ ...applicant, docs: docsWith("approved") }, onboarding.countries.SE, null) === null, "all approved can activate");
assert(countryActivationIssue({ ...applicant, docs: docsWith("approved"), bankOk: false }, onboarding.countries.SE, null)?.includes("Bank"), "bank must be approved");
assert(onboardingError({ ...onboarding.countries.SE, docs: [] }), "the driving licence is always needed");
const lead = demoLeads("SE", ["Z001"])[0];
const reminded = remind(onboarding, lead.id, "signup", "nora", "2026-10-12T12:00:00Z");
assert(!reminderDue(lead, "signup", reminded, "SE", Date.parse("2026-10-12T13:00:00Z")), "no new reminder right after one");
assert(reminderDue(lead, "signup", reminded, "SE", Date.parse("2026-10-20T13:00:00Z")), "reminder again after the interval");
assert(!reminderDue(lead, "signup", { ...reminded, countries: { ...reminded.countries, SE: { ...reminded.countries.SE, reminders: false } } }, "SE", Date.parse("2026-10-20T13:00:00Z")), "reminders can be turned off");
const flow = funnel([applicant, lead], 2, onboarding.countries.SE);
assert(flow[0].pct === 100 && flow.every((row, index) => index === 0 || row.reached <= flow[index - 1].reached), "the funnel only goes down");
assert(driverMessage("Elin Berg", "Driving licence", "rejected", "Too dark").startsWith("Hi Elin, your driving licence could not be approved. Reason: Too dark"), "message to the driver");

console.log("fleet ops ok");
