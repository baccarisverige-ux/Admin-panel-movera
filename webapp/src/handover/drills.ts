import { ROLE_PERMISSIONS, type Role } from "../auth/permissions.ts";
import { editContent, emptyContent, publishContent, rollbackContent } from "../content/book.ts";
import { blankDocuments, setAccount, type Driver } from "../drivers/gate.ts";
import { gateB } from "../gates/scenarios.ts";
import { canStartCheckout, existingAuthContinues, type PaymentMethod } from "../payments/book.ts";
import { assignReservation, needsDriverSoon, type Reservation } from "../reservations/book.ts";
import { publicIncident, resolveIncident, takeIncident, type Incident } from "../safety/book.ts";

export type DrillResult = { id: string; pass: boolean; steps: string[] };

const CASH_OFF = { card: true, swish: true, klarna: true, apple: true, google: true, paypal: true, cash: false, wallet: true } as Record<PaymentMethod, boolean>;

function driver(): Driver {
  return {
    id: "D1",
    name: "Erik Lind",
    fleet: false,
    status: "active",
    documents: blankDocuments(),
    vehicle: { year: 2022, seats: 4, fuel: "electric", category: "electric" },
  };
}

export function roleMatrix(): { role: Role; permissions: readonly string[] }[] {
  return (Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => ({ role, permissions: ROLE_PERMISSIONS[role] }));
}

export function healthAlerts(): { id: string; text: string }[] {
  const gate = gateB(undefined);
  return [
    { id: "demo", text: "The live admin is the demo adapter." },
    { id: "gate-b", text: gate.reason },
    { id: "maps", text: "The zone map is OpenStreetMap. No Google key is set." },
    { id: "rider", text: "The rider critical-flow check was red and has not been reproduced in this repository." },
  ];
}

export function drillPaymentFailure(): DrillResult {
  const refused = !canStartCheckout(CASH_OFF, "cash");
  const continues = existingAuthContinues({ id: "C1", method: "cash", state: "authorized" }, CASH_OFF);
  return {
    id: "payment-failure",
    pass: refused && continues,
    steps: [
      refused ? "New cash checkouts are refused." : "New cash checkouts were still allowed.",
      continues ? "The existing authorisation continues." : "The existing authorisation was dropped.",
    ],
  };
}

export function drillSos(): DrillResult {
  const queued: Incident = { id: "INC-1", state: "queued", locationAt: "2026-10-05T10:00:00Z", accuracyM: 12, ownerId: null };
  const taken = takeIncident(queued, "erik");
  const resolved = resolveIncident(taken);
  const view = publicIncident(resolved.incident);
  const pass = taken.state === "taken" && view.state === "resolved" && !("pin" in view);
  return {
    id: "sos",
    pass,
    steps: [`Taken by ${taken.ownerId}.`, `Location ${view.locationAt}, accuracy ${view.accuracyM} m.`, "No PIN is shown.", `State ${view.state}.`],
  };
}

export function drillSuspension(): DrillResult {
  const trip = { id: "T1002", status: "in_trip" };
  const result = setAccount(driver(), "suspended", "Safety hold");
  const tripUntouched = trip.status === "in_trip";
  return {
    id: "suspension",
    pass: result.driver.status === "suspended" && !result.error && tripUntouched,
    steps: [
      result.error ?? "Driver is suspended. Future offers stop.",
      tripUntouched ? "The trip already in progress is not cancelled from here." : "The open trip was changed.",
    ],
  };
}

export function drillReservation(): DrillResult {
  const open: Reservation = { id: "B1", pickupAt: "2026-10-05T11:20:00Z", driverId: null, policyVersion: "res-2", status: "booked" };
  const flagged = needsDriverSoon(open, "2026-10-05T10:40:00Z");
  const assigned = assignReservation(open, "D3");
  return {
    id: "reservation",
    pass: flagged && !needsDriverSoon(assigned, "2026-10-05T10:40:00Z") && assigned.policyVersion === "res-2",
    steps: [
      flagged ? "B1 is under 60 minutes with no driver." : "B1 was not flagged.",
      `Assigned ${assigned.driverId}. Policy stays ${assigned.policyVersion}.`,
    ],
  };
}

export function drillBadPublish(): DrillResult {
  const edited = editContent(emptyContent("nora"), "Wrong fare text.", "nora");
  const blocked = publishContent(edited, "nora");
  const published = publishContent(edited, "lena");
  const restored = rollbackContent(published.book);
  const pass = Boolean(blocked.error) && published.book.published.body === "Wrong fare text." && restored.published.body === "Book a ride in Stockholm.";
  return {
    id: "bad-publish",
    pass,
    steps: [
      blocked.error ?? "The author was allowed to publish.",
      "A second agent published.",
      `Rollback restored: ${restored.published.body}`,
    ],
  };
}

export function runDrills(): DrillResult[] {
  return [drillPaymentFailure(), drillSos(), drillSuspension(), drillReservation(), drillBadPublish()];
}
