import type { Answer, ChoiceId, FollowUp, QuestionId, RideCheck, Trigger } from "../safety/rideCheck.ts";
import { isAlert, outcomeOf } from "../safety/rideCheck.ts";
import { STEP_MS, startedAt } from "../trips/clock.ts";
import type { DemoRecord } from "./seed.ts";

/**
 * Demo ride checks, as the driver and rider apps would send them: mostly "I'm OK", a few with a
 * reason, and two alerts (one still open on a live trip, one solved). Times sit inside each trip's
 * own timeline; checks on live trips are placed just before the seed time.
 */

type Reply = [afterSec: number, choice: ChoiceId, follow?: [QuestionId, string, number][], text?: string];
type Plan = { trip: string; trigger: Trigger; value: number; place: string; driver: Reply | null; rider: Reply | null; incident?: "open" | "solved" };

const PLANS: Plan[] = [
  // Live trip, still going: the driver reports an accident, the rider too. The alert is open.
  { trip: "T0046", trigger: "crash", value: 0, place: "Sveavägen", incident: "open",
    driver: [40, "accident", [["anyone_hurt", "Not sure", 52], ["car_safe", "Yes", 60], ["other_ok", "Not sure", 68]]],
    rider: [75, "accident", [["anyone_hurt", "No", 86], ["car_safe", "Yes", 92], ["other_ok", "Yes", 99]]] },
  { trip: "T0118", trigger: "stop", value: 5, place: "Kungsgatan", driver: [18, "ok"], rider: [31, "ok"] },
  // Earlier trips.
  { trip: "T0030", trigger: "stop", value: 6, place: "Karlaplan", driver: [22, "traffic"], rider: [41, "ok"] },
  { trip: "T0210", trigger: "stop", value: 8, place: "Strandvägen", driver: [16, "ok"], rider: [35, "ok"] },
  { trip: "T0390", trigger: "stop", value: 5, place: "Karlaplan", driver: [12, "ok"], rider: [27, "ok"] },
  { trip: "T0570", trigger: "stop", value: 7, place: "Valhallavägen", driver: [20, "ok"], rider: [44, "ok"] },
  { trip: "T0066", trigger: "far", value: 1200, place: "Stureplan", driver: [25, "rider_here"], rider: [58, "ok"] },
  { trip: "T0246", trigger: "route", value: 3.4, place: "Valhallavägen", driver: [19, "rider_route"], rider: [33, "rider_route"] },
  { trip: "T0426", trigger: "far", value: 650, place: "Narvavägen", driver: [14, "ok"], rider: [40, "other", undefined, "I wanted to walk the last part."] },
  // The rider felt unsafe after a far drop-off. The alert was solved.
  { trip: "T0138", trigger: "far", value: 800, place: "Karlaplan", incident: "solved", driver: [21, "ok"], rider: [46, "unsafe", [["in_danger", "No", 57]]] },
  { trip: "T0318", trigger: "longer", value: 72, place: "Strandvägen", driver: [17, "ok"], rider: [29, "ok"] },
  { trip: "T0498", trigger: "longer", value: 55, place: "Östermalmstorg", driver: [13, "ok"], rider: [38, "ok"] },
  { trip: "T0018", trigger: "stop", value: 9, place: "Södertälje centrum", driver: [24, "car", [["can_continue", "No", 37]]], rider: [52, "broke_down", [["can_continue", "No", 63]]] },
  { trip: "T0174", trigger: "crash", value: 0, place: "Narvavägen", driver: [9, "ok"], rider: [22, "ok"] },
  { trip: "T0354", trigger: "stop", value: 4, place: "Stureplan", driver: [15, "ok"], rider: [30, "ok"] },
  { trip: "T0534", trigger: "stop", value: 4, place: "Karlaplan", driver: [11, "ok"], rider: [26, "ok"] },
];

/** Minutes into the trip when the card opens: mid-ride, or just after the drop-off for "far". */
function openAfterStart(trigger: Trigger): number {
  if (trigger === "far") return 11 * STEP_MS + 20_000;
  if (trigger === "route" || trigger === "longer") return 9 * STEP_MS + 50_000;
  return 9 * STEP_MS + 30_000;
}

function reply(base: number, value: Reply | null): Answer | null {
  if (!value) return null;
  const [after, choice, follow, text] = value;
  const at = (sec: number) => new Date(base + sec * 1000).toISOString();
  const rows: FollowUp[] | undefined = follow?.map(([q, a, sec]) => ({ q, a, at: at(sec) }));
  return { at: at(after), choice, ...(rows ? { follow: rows } : {}), ...(text ? { text } : {}) };
}

export function seedRideChecks(now: string, rows: { trips: readonly DemoRecord[]; riders: readonly DemoRecord[]; vehicles: readonly DemoRecord[] }): { checks: RideCheck[]; incidents: DemoRecord[] } {
  const checks: RideCheck[] = [];
  const incidents: DemoRecord[] = [];
  PLANS.forEach((plan, index) => {
    const trip = rows.trips.find((row) => row.id === plan.trip);
    if (!trip?.driverId) return;
    const live = plan.trip === "T0046" || plan.trip === "T0118";
    // Live checks open a little before the seed time; the others inside their trip.
    const opened = live ? Date.parse(now) - (plan.incident ? 2 : 25) * 60_000 : Date.parse(startedAt(trip.id)) + openAfterStart(plan.trigger);
    const rider = rows.riders.find((row) => row.phone === trip.phone) ?? rows.riders.find((row) => row.name === trip.name);
    const vehicle = rows.vehicles.find((row) => row.driverId === trip.driverId);
    const id = `RC-${1001 + index}`;
    const check: RideCheck = {
      id,
      name: trip.name,
      phone: trip.phone,
      zoneId: trip.zoneId,
      status: "none",
      tripId: trip.id,
      driverId: trip.driverId,
      riderId: rider?.id ?? "",
      vehicleId: vehicle?.id ?? null,
      trigger: plan.trigger,
      value: plan.value,
      place: plan.place,
      at: new Date(opened).toISOString(),
      driver: reply(opened, plan.driver),
      rider: reply(opened, plan.rider),
      incidentId: null,
      ...(live ? { live: true } : {}),
    };
    check.status = outcomeOf(check);
    if (plan.incident && isAlert(check)) {
      const incidentId = `INC-RC-${incidents.length + 1}`;
      check.incidentId = incidentId;
      const first = [check.driver, check.rider].filter((answer): answer is Answer => Boolean(answer)).sort((a, b) => a.at.localeCompare(b.at)).find((answer) => answer.choice === "accident" || answer.choice === "hurt" || answer.choice === "unsafe");
      incidents.push({
        id: incidentId,
        name: trip.name,
        phone: trip.phone,
        zoneId: trip.zoneId,
        status: plan.incident === "open" ? "queued" : "resolved",
        driverId: trip.driverId,
        tripId: trip.id,
        kind: "ride_check",
        // An open alert is as new as an open SOS; a solved one keeps the time it came in.
        ...(plan.incident === "solved" && first ? { createdAt: first.at } : {}),
      });
    }
    checks.push(check);
  });
  return { checks, incidents };
}
