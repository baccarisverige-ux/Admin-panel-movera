import {
  canActivate,
  canDo,
  docDef,
  inZoneScope,
  personName,
  REFUND_SECOND_PERSON_ORE,
  type Agent,
  type CategoryId,
  type DemoDb,
  type Driver,
  type PaymentId,
  type Permission,
  type RoleId,
  type Settings,
  type ZoneId,
} from "./domain";
import { validateBank, validatePlate, validateSeats, validateVehicleYear } from "./format";

export type Result = { ok: true; db: DemoDb; toast: string } | { ok: false; error: string };

function fail(error: string): Result {
  return { ok: false, error };
}

function start(db: DemoDb, agent: Agent, permission: Permission): { next: DemoDb } | Result {
  if (!canDo(agent, db.roleGrants, permission)) return fail("You do not have access to that.");
  const next = structuredClone(db);
  next.rev += 1;
  return { next };
}

function audit(db: DemoDb, agent: Agent, action: string, target: string, reason?: string) {
  db.seq += 1;
  db.audit.unshift({
    id: `AU-${db.seq}`,
    at: new Date().toISOString(),
    agentId: agent.id,
    action,
    target,
    reason,
  });
}

function driverOr(db: DemoDb, agent: Agent, driverId: string): Driver | undefined {
  const driver = db.drivers.find((item) => item.id === driverId);
  if (!driver) return undefined;
  if (agent.fleetPartnerId && driver.fleetPartnerId !== agent.fleetPartnerId) return undefined;
  if (!inZoneScope(agent, driver.zoneId)) return undefined;
  return driver;
}

export function reviewDocument(
  db: DemoDb,
  agent: Agent,
  input: { docId: string; decision: "approved" | "rejected"; reason?: string; message?: string; expiresAt?: string },
): Result {
  const opened = start(db, agent, "documents.review");
  if ("ok" in opened) return opened;
  const doc = opened.next.documents.find((item) => item.id === input.docId);
  const driver = doc ? driverOr(opened.next, agent, doc.driverId) : undefined;
  if (!doc || !driver) return fail("Document not found.");
  if (doc.status === "not_required") return fail("This document is not required.");
  if (input.decision === "rejected" && !input.reason) return fail("A reject reason is required.");
  doc.status = input.decision === "approved" ? "approved" : "rejected";
  doc.reviewerId = agent.id;
  doc.rejectReason = input.decision === "rejected" ? input.reason : undefined;
  doc.message = input.message;
  if (input.expiresAt) doc.expiresAt = input.expiresAt;
  if (!doc.uploadedAt) doc.uploadedAt = new Date().toISOString();
  audit(opened.next, agent, input.decision === "approved" ? "document.approve" : "document.reject", doc.id, input.reason);
  const label = docDef(doc.key).name;
  return { ok: true, db: opened.next, toast: `${label} ${input.decision === "approved" ? "approved" : "rejected"} (demo)` };
}

export function setAccountStatus(
  db: DemoDb,
  agent: Agent,
  input: { driverId: string; status: Driver["accountStatus"]; reason: string; message: string },
): Result {
  const opened = start(db, agent, "drivers.setStatus");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3 || input.message.trim().length < 3) return fail("Reason and driver message are required.");
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!driver) return fail("Driver not found in your scope.");
  if (input.status === "active" && !canActivate(driver, opened.next.documents) && driver.accountStatus !== "on_hold" && driver.accountStatus !== "suspended") {
    return fail("Activate is available when every required document and both vehicle papers are approved.");
  }
  driver.accountStatus = input.status;
  if (input.status === "suspended") driver.onlineStatus = "suspended";
  if (input.status === "active" && driver.onlineStatus === "suspended") driver.onlineStatus = "offline";
  audit(opened.next, agent, "driver.status", driver.id, `${input.status}: ${input.reason}`);
  return { ok: true, db: opened.next, toast: `${personName(driver)} is now ${input.status.replaceAll("_", " ")} (demo)` };
}

export function setCategory(
  db: DemoDb,
  agent: Agent,
  input: { driverId: string; category: CategoryId; on: boolean; reason?: string },
): Result {
  const opened = start(db, agent, "drivers.setStatus");
  if ("ok" in opened) return opened;
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!driver) return fail("Driver not found in your scope.");
  if (!input.on && !input.reason) return fail("A reason is required to turn a category off.");
  driver.categories[input.category] = input.on;
  if (input.on) delete driver.categoryReasons[input.category];
  else driver.categoryReasons[input.category] = input.reason;
  audit(opened.next, agent, "driver.category", driver.id, `${input.category} ${input.on ? "on" : "off"}`);
  return { ok: true, db: opened.next, toast: "Category updated (demo)" };
}

export function setBooster(db: DemoDb, agent: Agent, input: { driverId: string; on: boolean; reason?: string }): Result {
  const opened = start(db, agent, "drivers.setStatus");
  if ("ok" in opened) return opened;
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!driver) return fail("Driver not found in your scope.");
  if (!input.on && !input.reason) return fail("A reason is required.");
  driver.booster = input.on;
  driver.boosterReason = input.on ? undefined : input.reason;
  audit(opened.next, agent, "driver.booster", driver.id, input.reason);
  return { ok: true, db: opened.next, toast: "Booster seat updated (demo)" };
}

export function reviewBank(db: DemoDb, agent: Agent, input: { driverId: string; decision: "approved" | "rejected"; reason?: string }): Result {
  const opened = start(db, agent, "bank.review");
  if ("ok" in opened) return opened;
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!driver) return fail("Driver not found in your scope.");
  if (input.decision === "approved") {
    const problem = validateBank(driver.bank);
    if (problem) return fail(problem);
  } else if (!input.reason) return fail("A reason is required.");
  driver.bank.status = input.decision;
  driver.bank.rejectReason = input.reason;
  audit(opened.next, agent, "bank.review", driver.id, input.reason ?? input.decision);
  return { ok: true, db: opened.next, toast: `Bank details ${input.decision} (demo)` };
}

export function addNote(db: DemoDb, agent: Agent, input: { targetType: "driver" | "rider"; targetId: string; text: string }): Result {
  const permission: Permission = input.targetType === "driver" ? "drivers.view" : "riders.view";
  const opened = start(db, agent, permission);
  if ("ok" in opened) return opened;
  if (input.text.trim().length < 2) return fail("Write a note first.");
  opened.next.seq += 1;
  opened.next.notes.unshift({
    id: `N-${opened.next.seq}`,
    targetType: input.targetType,
    targetId: input.targetId,
    authorId: agent.id,
    text: input.text.trim(),
    at: new Date().toISOString(),
  });
  audit(opened.next, agent, "note.add", input.targetId);
  return { ok: true, db: opened.next, toast: "Note saved (demo)" };
}

export function saveVehicle(
  db: DemoDb,
  agent: Agent,
  input: { vehicleId: string; plate: string; year: number; seats: number; status: "active" | "inactive" | "maintenance" },
): Result {
  const opened = start(db, agent, "vehicles.review");
  if ("ok" in opened) return opened;
  const vehicle = opened.next.vehicles.find((item) => item.id === input.vehicleId);
  const driver = vehicle ? driverOr(opened.next, agent, vehicle.driverId) : undefined;
  if (!vehicle || !driver) return fail("Vehicle not found.");
  const plate = input.plate.toUpperCase();
  const problem = validatePlate(plate) || validateVehicleYear(input.year) || validateSeats(input.seats);
  if (problem) return fail(problem);
  vehicle.plate = plate;
  vehicle.year = input.year;
  vehicle.seats = input.seats;
  vehicle.status = input.status;
  audit(opened.next, agent, "vehicle.update", vehicle.id);
  return { ok: true, db: opened.next, toast: "Vehicle saved (demo)" };
}

const TERMINAL = new Set(["completed", "cancelled_by_rider", "cancelled_by_driver", "cancelled_by_admin", "no_show", "expired", "failed"]);

export function cancelTrip(db: DemoDb, agent: Agent, input: { tripId: string; reason: string }): Result {
  const opened = start(db, agent, "trips.cancel");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3) return fail("A reason is required.");
  const trip = opened.next.trips.find((item) => item.id === input.tripId);
  if (!trip) return fail("Trip not found.");
  if (TERMINAL.has(trip.status)) return fail(`Cannot cancel a trip that is ${trip.status.replaceAll("_", " ")}.`);
  trip.status = "cancelled_by_admin";
  trip.cancelledBy = "admin";
  trip.cancelCode = "other_on_trip";
  trip.paymentStatus = trip.paymentStatus === "captured" ? "refunded" : trip.paymentStatus;
  trip.timeline.push({ status: "cancelled_by_admin", at: new Date().toISOString() });
  audit(opened.next, agent, "trip.cancel", trip.id, input.reason);
  return { ok: true, db: opened.next, toast: "Trip cancelled by admin (demo)" };
}

export function reassignTrip(db: DemoDb, agent: Agent, input: { tripId: string; driverId: string }): Result {
  const opened = start(db, agent, "trips.reassign");
  if ("ok" in opened) return opened;
  const trip = opened.next.trips.find((item) => item.id === input.tripId);
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!trip || !driver) return fail("Trip or driver not found.");
  if (TERMINAL.has(trip.status)) return fail(`Cannot reassign a trip that is ${trip.status.replaceAll("_", " ")}.`);
  if (driver.accountStatus !== "active") return fail("That driver is not active.");
  if (!driver.categories[trip.category]) return fail("That driver is not eligible for this category.");
  const vehicle = opened.next.vehicles.find((item) => item.driverId === driver.id && item.status === "active");
  trip.driverId = driver.id;
  trip.vehicleId = vehicle?.id ?? trip.vehicleId;
  if (trip.status === "searching" || trip.status === "offered" || trip.status === "requested") trip.status = "accepted";
  trip.timeline.push({ status: trip.status, at: new Date().toISOString() });
  audit(opened.next, agent, "trip.reassign", trip.id, driver.id);
  return { ok: true, db: opened.next, toast: `Reassigned to ${personName(driver)} (demo)` };
}

export function decideRefund(db: DemoDb, agent: Agent, input: { refundId: string; decision: "approved" | "rejected"; reason?: string }): Result {
  const opened = start(db, agent, "refunds.approve");
  if ("ok" in opened) return opened;
  const item = opened.next.refunds.find((row) => row.id === input.refundId);
  if (!item) return fail("Refund not found.");
  if (item.status === "approved" || item.status === "rejected") return fail("This refund is already decided. A retry does not create a second effect.");
  if (input.decision === "rejected" && !input.reason) return fail("A reason is required.");
  if (input.decision === "approved" && item.amount >= REFUND_SECOND_PERSON_ORE) {
    if (!item.firstAgentId) {
      item.status = "pending_approval";
      item.firstAgentId = agent.id;
      audit(opened.next, agent, "refund.pending", item.id, "Needs a second person");
      return { ok: true, db: opened.next, toast: "200 kr or more needs a second person. Switch demo agent to approve." };
    }
    if (item.firstAgentId === agent.id) return fail("A different agent must approve amounts of 200 kr or more.");
  }
  item.status = input.decision;
  item.reason = input.reason;
  const trip = opened.next.trips.find((row) => row.id === item.tripId);
  if (trip && input.decision === "approved") trip.paymentStatus = "refunded";
  audit(opened.next, agent, "refund.decide", item.id, input.reason ?? input.decision);
  return { ok: true, db: opened.next, toast: `Refund ${input.decision} (demo)` };
}

export function blockRider(db: DemoDb, agent: Agent, input: { riderId: string; blocked: boolean; reason: string }): Result {
  const opened = start(db, agent, "riders.block");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3) return fail("A reason is required.");
  const rider = opened.next.riders.find((item) => item.id === input.riderId);
  if (!rider) return fail("Rider not found.");
  rider.status = input.blocked ? "blocked" : "active";
  rider.blockReason = input.blocked ? input.reason : undefined;
  audit(opened.next, agent, input.blocked ? "rider.block" : "rider.unblock", rider.id, input.reason);
  return { ok: true, db: opened.next, toast: `${personName(rider)} ${input.blocked ? "blocked" : "unblocked"} (demo)` };
}

export function signOutRider(db: DemoDb, agent: Agent, riderId: string): Result {
  const opened = start(db, agent, "riders.block");
  if ("ok" in opened) return opened;
  const rider = opened.next.riders.find((item) => item.id === riderId);
  if (!rider) return fail("Rider not found.");
  rider.devicesSignedOut = true;
  audit(opened.next, agent, "rider.signout", rider.id);
  return { ok: true, db: opened.next, toast: "Signed out of all devices (demo)" };
}

export function assignReservation(db: DemoDb, agent: Agent, input: { reservationId: string; driverId: string }): Result {
  const opened = start(db, agent, "reservations.manage");
  if ("ok" in opened) return opened;
  const reservation = opened.next.reservations.find((item) => item.id === input.reservationId);
  const driver = driverOr(opened.next, agent, input.driverId);
  if (!reservation || !driver) return fail("Reservation or driver not found.");
  reservation.driverId = driver.id;
  reservation.status = "assigned";
  audit(opened.next, agent, "reservation.assign", reservation.id, driver.id);
  return { ok: true, db: opened.next, toast: "Driver assigned (demo)" };
}

export function offerReservation(db: DemoDb, agent: Agent, reservationId: string): Result {
  const opened = start(db, agent, "reservations.manage");
  if ("ok" in opened) return opened;
  const reservation = opened.next.reservations.find((item) => item.id === reservationId);
  if (!reservation) return fail("Reservation not found.");
  reservation.offers += 1;
  audit(opened.next, agent, "reservation.offer", reservation.id);
  return { ok: true, db: opened.next, toast: "Offered to eligible drivers (demo)" };
}

export function cancelReservation(db: DemoDb, agent: Agent, input: { reservationId: string; reason: string }): Result {
  const opened = start(db, agent, "reservations.manage");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3) return fail("A reason is required.");
  const reservation = opened.next.reservations.find((item) => item.id === input.reservationId);
  if (!reservation) return fail("Reservation not found.");
  reservation.status = "cancelled";
  reservation.cancelReason = input.reason;
  audit(opened.next, agent, "reservation.cancel", reservation.id, input.reason);
  return { ok: true, db: opened.next, toast: "Reservation cancelled (demo)" };
}

export function patchSettings(db: DemoDb, agent: Agent, patch: Partial<Settings>): Result {
  const opened = start(db, agent, "settings.edit");
  if ("ok" in opened) return opened;
  opened.next.settings = { ...opened.next.settings, ...patch };
  audit(opened.next, agent, "settings.update", "settings");
  return { ok: true, db: opened.next, toast: "Saved in demo" };
}

export function savePrice(
  db: DemoDb,
  agent: Agent,
  input: { zoneId: ZoneId; category: CategoryId; field: "pickup" | "perKm" | "perMin" | "minFare" | "maxFare" | "increaseMin" | "increaseMax" | "cancelFee"; ore: number },
): Result {
  const opened = start(db, agent, "pricing.edit");
  if ("ok" in opened) return opened;
  const row = opened.next.prices.find((item) => item.zoneId === input.zoneId && item.category === input.category);
  if (!row || input.ore < 0) return fail("Price not found.");
  row[input.field] = Math.round(input.ore);
  audit(opened.next, agent, "price.update", `${input.zoneId}:${input.category}`);
  return { ok: true, db: opened.next, toast: "Price saved (demo)" };
}

export function togglePayment(db: DemoDb, agent: Agent, id: PaymentId): Result {
  const opened = start(db, agent, "pricing.edit");
  if ("ok" in opened) return opened;
  opened.next.settings.paymentMethods[id] = !opened.next.settings.paymentMethods[id];
  audit(opened.next, agent, "payment.toggle", id);
  return { ok: true, db: opened.next, toast: "Payment method updated (demo)" };
}

export function sendMessage(
  db: DemoDb,
  agent: Agent,
  input: { type: DemoDb["messages"][number]["type"]; tone: DemoDb["messages"][number]["tone"]; title: string; body: string; target: string; phase?: "test" | "queued" },
): Result {
  const opened = start(db, agent, "messages.send");
  if ("ok" in opened) return opened;
  if (input.title.trim().length < 2 || input.body.trim().length < 2) return fail("Title and message are required.");
  const phase = input.phase ?? "queued";
  const audience = /driver/i.test(input.target) ? opened.next.drivers.length : Math.min(opened.next.riders.length, 40);
  opened.next.seq += 1;
  opened.next.messages.unshift({
    id: `M-${opened.next.seq}`,
    type: input.type,
    tone: input.tone,
    title: input.title.trim(),
    body: input.body.trim(),
    target: input.target,
    sent: phase === "test" ? 1 : audience,
    delivered: phase === "test" ? 1 : Math.max(0, audience - 1),
    opened: 0,
    accepted: phase === "test" ? 1 : audience,
    failed: phase === "test" ? 0 : 1,
    phase: phase === "test" ? "test" : "sent",
    at: new Date().toISOString(),
  });
  audit(opened.next, agent, phase === "test" ? "message.test" : "message.publish", input.target, input.title);
  return { ok: true, db: opened.next, toast: phase === "test" ? "Test stayed in the demo audience of 1." : "Published in the simulation. Nothing left this browser." };
}

export function saveEvent(db: DemoDb, agent: Agent, event: DemoDb["events"][number]): Result {
  const opened = start(db, agent, "content.edit");
  if ("ok" in opened) return opened;
  const index = opened.next.events.findIndex((item) => item.id === event.id);
  if (index >= 0) opened.next.events[index] = event;
  else opened.next.events.unshift(event);
  audit(opened.next, agent, "event.save", event.id);
  return { ok: true, db: opened.next, toast: "Event saved (demo)" };
}

export function saveContentToggle(db: DemoDb, agent: Agent, patch: Partial<Settings>): Result {
  const opened = start(db, agent, "content.edit");
  if ("ok" in opened) return opened;
  opened.next.settings = { ...opened.next.settings, ...patch };
  audit(opened.next, agent, "content.update", "home");
  return { ok: true, db: opened.next, toast: "Content saved (demo)" };
}

export function replyTicket(db: DemoDb, agent: Agent, input: { ticketId: string; text: string; status?: DemoDb["tickets"][number]["status"] }): Result {
  const opened = start(db, agent, "support.handle");
  if ("ok" in opened) return opened;
  const ticket = opened.next.tickets.find((item) => item.id === input.ticketId);
  if (!ticket) return fail("Ticket not found.");
  if (input.text.trim()) {
    ticket.messages.push({ from: "agent", text: input.text.trim(), at: new Date().toISOString(), agentId: agent.id });
  }
  if (!ticket.assigneeId) ticket.assigneeId = agent.id;
  if (input.status) ticket.status = input.status;
  audit(opened.next, agent, "ticket.reply", ticket.id);
  return { ok: true, db: opened.next, toast: "Reply saved (demo). The person was not notified." };
}

export function claimTicket(db: DemoDb, agent: Agent, ticketId: string): Result {
  const opened = start(db, agent, "support.handle");
  if ("ok" in opened) return opened;
  const ticket = opened.next.tickets.find((item) => item.id === ticketId);
  if (!ticket) return fail("Ticket not found.");
  ticket.assigneeId = agent.id;
  audit(opened.next, agent, "ticket.claim", ticket.id);
  return { ok: true, db: opened.next, toast: "Ticket assigned to you (demo)" };
}

export function logIncident(db: DemoDb, agent: Agent, input: { incidentId: string; action: string; close?: boolean; outcome?: string }): Result {
  const opened = start(db, agent, "safety.respond");
  if ("ok" in opened) return opened;
  const incident = opened.next.incidents.find((item) => item.id === input.incidentId);
  if (!incident) return fail("Incident not found.");
  if (incident.status === "closed") return fail("This incident is already closed.");
  incident.assigneeId = agent.id;
  incident.status = input.close ? "closed" : "handling";
  if (input.action) incident.actions.push({ at: new Date().toISOString(), agentId: agent.id, action: input.action });
  if (input.outcome) incident.outcome = input.outcome;
  audit(opened.next, agent, input.close ? "incident.close" : "incident.update", incident.id, input.action);
  return { ok: true, db: opened.next, toast: input.close ? "Incident closed (demo)" : "Action logged (demo)" };
}

export function setGrant(db: DemoDb, agent: Agent, input: { role: RoleId; permission: Permission; on: boolean }): Result {
  const opened = start(db, agent, "team.manage");
  if ("ok" in opened) return opened;
  if (input.role === "super") return fail("Super admin always has every permission.");
  const list = new Set(opened.next.roleGrants[input.role]);
  if (input.on) list.add(input.permission);
  else list.delete(input.permission);
  opened.next.roleGrants[input.role] = [...list];
  audit(opened.next, agent, "role.permission", input.role, `${input.permission} ${input.on ? "on" : "off"}`);
  return { ok: true, db: opened.next, toast: "Role updated (demo)" };
}

export function setAgent(db: DemoDb, agent: Agent, input: { agentId: string; role?: RoleId; presence?: Agent["presence"] }): Result {
  const opened = start(db, agent, "team.manage");
  if ("ok" in opened) return opened;
  const target = opened.next.agents.find((item) => item.id === input.agentId);
  if (!target) return fail("Agent not found.");
  if (input.role) target.role = input.role;
  if (input.presence) target.presence = input.presence;
  audit(opened.next, agent, "agent.update", target.id, input.role ?? input.presence);
  return { ok: true, db: opened.next, toast: "Agent updated (demo)" };
}

export function setPresence(db: DemoDb, agent: Agent, presence: Agent["presence"]): Result {
  const next = structuredClone(db);
  next.rev += 1;
  const self = next.agents.find((item) => item.id === agent.id);
  if (!self) return fail("Agent not found.");
  self.presence = presence;
  self.lastActive = new Date().toISOString();
  audit(next, agent, "agent.presence", agent.id, presence);
  return { ok: true, db: next, toast: `You are ${presence} (demo)` };
}

export function revealSensitive(db: DemoDb, agent: Agent, target: string): Result {
  const opened = start(db, agent, "drivers.viewSensitive");
  if ("ok" in opened) return opened;
  audit(opened.next, agent, "sensitive.reveal", target);
  return { ok: true, db: opened.next, toast: "Reveal recorded in the audit log (demo)" };
}

export function assignOnboarding(db: DemoDb, agent: Agent, driverId: string): Result {
  const opened = start(db, agent, "documents.review");
  if ("ok" in opened) return opened;
  const driver = driverOr(opened.next, agent, driverId);
  if (!driver) return fail("Driver not found in your scope.");
  driver.assigneeId = agent.id;
  audit(opened.next, agent, "onboarding.claim", driver.id);
  return { ok: true, db: opened.next, toast: "Assigned to you (demo)" };
}

export function toggleCancelReason(
  db: DemoDb,
  agent: Agent,
  input: { list: "driverBefore" | "driverDuring" | "riderFinding"; code: string },
): Result {
  const opened = start(db, agent, "settings.edit");
  if ("ok" in opened) return opened;
  const row = opened.next.cancelLists[input.list].find((item) => item.code === input.code);
  if (!row) return fail("Reason not found.");
  row.on = !row.on;
  audit(opened.next, agent, "cancelReason.toggle", input.code);
  return { ok: true, db: opened.next, toast: "Cancel reason updated (demo)" };
}

export function adjustFare(db: DemoDb, agent: Agent, input: { tripId: string; ore: number; reason: string }): Result {
  const opened = start(db, agent, "trips.cancel");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3) return fail("A reason is required.");
  if (!Number.isFinite(input.ore)) return fail("Enter an amount in kronor.");
  const trip = opened.next.trips.find((item) => item.id === input.tripId);
  if (!trip) return fail("Trip not found.");
  if (trip.paymentStatus === "refunded") return fail("This trip is already refunded.");
  trip.increase += input.ore;
  audit(opened.next, agent, "trip.adjust", trip.id, input.reason);
  return { ok: true, db: opened.next, toast: "Fare adjusted in the demo. The rule version stays on the trip." };
}

export function creditWallet(db: DemoDb, agent: Agent, input: { riderId: string; ore: number }): Result {
  const opened = start(db, agent, "payouts.manage");
  if ("ok" in opened) return opened;
  if (![10000, 20000, 50000].includes(input.ore)) return fail("Wallet credit must be 100, 200 or 500 kr.");
  const rider = opened.next.riders.find((item) => item.id === input.riderId);
  if (!rider) return fail("Rider not found.");
  rider.walletOre += input.ore;
  audit(opened.next, agent, "wallet.credit", rider.id, String(input.ore));
  return { ok: true, db: opened.next, toast: "Wallet credited once (demo). The balance was not typed in." };
}

export function requestPrivacy(db: DemoDb, agent: Agent, riderId: string): Result {
  const opened = start(db, agent, "riders.block");
  if ("ok" in opened) return opened;
  const rider = opened.next.riders.find((item) => item.id === riderId);
  if (!rider) return fail("Rider not found.");
  rider.privacy = rider.privacy === "requested" ? "done" : "requested";
  audit(opened.next, agent, "rider.privacy", rider.id, rider.privacy);
  return { ok: true, db: opened.next, toast: rider.privacy === "done" ? "Privacy request marked done (demo)" : "Privacy request opened (demo)" };
}

export function moderateReview(db: DemoDb, agent: Agent, input: { tripId: string; hide: boolean; reason: string }): Result {
  const opened = start(db, agent, "drivers.setStatus");
  if ("ok" in opened) return opened;
  if (input.reason.trim().length < 3) return fail("A reason is required.");
  const trip = opened.next.trips.find((item) => item.id === input.tripId);
  if (!trip || typeof trip.rating !== "number") return fail("That trip has no rating.");
  trip.reviewHidden = input.hide;
  trip.reviewNote = input.reason;
  audit(opened.next, agent, input.hide ? "review.hide" : "review.restore", trip.id, input.reason);
  return { ok: true, db: opened.next, toast: input.hide ? "Rating hidden. The original is kept." : "Rating restored." };
}

export function saveDraft(db: DemoDb, agent: Agent, note: string): Result {
  const opened = start(db, agent, "settings.edit");
  if ("ok" in opened) return opened;
  const open = opened.next.releases.find((item) => item.status === "draft" || item.status === "pending_approval");
  if (open && open.authorId !== agent.id) return fail("Another agent already has an open draft. Publish or wait.");
  opened.next.seq += 1;
  const version = (opened.next.releases[0]?.version ?? 3) + 1;
  const release = {
    id: `CFG-${opened.next.seq}`,
    version,
    status: "draft" as const,
    at: new Date().toISOString(),
    authorId: agent.id,
    note,
    summary: note || "Market settings and price sets",
    settings: structuredClone(opened.next.settings),
    prices: structuredClone(opened.next.prices),
  };
  opened.next.releases = [release, ...opened.next.releases.filter((item) => item.id !== open?.id)];
  audit(opened.next, agent, "config.draft", release.id, note);
  return { ok: true, db: opened.next, toast: "Draft saved (demo). It is not live until you publish." };
}

export function decideRelease(db: DemoDb, agent: Agent, input: { id: string; decision: "approve" | "publish" | "rollback" }): Result {
  const opened = start(db, agent, "settings.edit");
  if ("ok" in opened) return opened;
  const release = opened.next.releases.find((item) => item.id === input.id);
  if (!release && input.decision !== "rollback") return fail("Release not found.");
  if (input.decision === "approve") {
    if (!release || release.status !== "draft") return fail("Only a draft can be sent for approval.");
    if (release.authorId === agent.id) return fail("A different agent must approve this draft.");
    release.status = "pending_approval";
    release.approverId = agent.id;
    audit(opened.next, agent, "config.approve", release.id);
    return { ok: true, db: opened.next, toast: "Approved. Publish when you are ready." };
  }
  if (input.decision === "publish") {
    if (!release || (release.status !== "pending_approval" && release.status !== "draft")) return fail("Nothing is ready to publish.");
    if (release.status === "draft") return fail("Approve the draft first.");
    for (const item of opened.next.releases) if (item.status === "published") item.status = "expired";
    release.status = "published";
    opened.next.settings = structuredClone(release.settings);
    opened.next.prices = structuredClone(release.prices);
    audit(opened.next, agent, "config.publish", release.id);
    return { ok: true, db: opened.next, toast: "Published in the simulation. The apps are not connected." };
  }
  const published = [...opened.next.releases].reverse().find((item) => item.status === "expired" || item.status === "published");
  if (!published) return fail("No earlier version to roll back to.");
  for (const item of opened.next.releases) if (item.status === "published") item.status = "expired";
  opened.next.settings = structuredClone(published.settings);
  opened.next.prices = structuredClone(published.prices);
  opened.next.seq += 1;
  opened.next.releases.unshift({
    ...published,
    id: `CFG-${opened.next.seq}`,
    version: (opened.next.releases[0]?.version ?? published.version) + 1,
    status: "published",
    at: new Date().toISOString(),
    authorId: agent.id,
    note: `Rollback to v${published.version}`,
    summary: `Rollback to v${published.version}`,
  });
  audit(opened.next, agent, "config.rollback", published.id);
  return { ok: true, db: opened.next, toast: "Rolled back in the simulation." };
}

