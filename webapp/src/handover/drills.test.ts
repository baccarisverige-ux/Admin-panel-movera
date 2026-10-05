import { drillBadPublish, drillPaymentFailure, drillReservation, drillSos, drillSuspension, healthAlerts, roleMatrix, runDrills } from "./drills.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(roleMatrix().some((row) => row.role === "safety" && row.permissions.includes("incidents.read")), "safety can read incidents");
assert(!roleMatrix().some((row) => row.role === "support" && row.permissions.includes("payments.refund")), "support cannot refund");
assert(healthAlerts().some((alert) => alert.id === "gate-b" && alert.text.includes("not claimed")), "gate B stays open");
assert(runDrills().every((drill) => drill.pass), "every drill passes");
assert(drillPaymentFailure().steps[0]?.includes("refused"), "cash off");
assert(drillSos().steps.some((step) => step.includes("No PIN")), "sos");
assert(drillSuspension().steps.some((step) => step.includes("not cancelled")), "open trip stays");
assert(drillReservation().pass, "reservation");
assert(drillBadPublish().steps.at(-1)?.includes("Book a ride"), "rollback");

console.log("handover ok");
