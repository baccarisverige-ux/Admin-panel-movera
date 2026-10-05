import { addNote, claim, deliveredToRider, reply, type Ticket } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

let ticket: Ticket = { id: "S1", ownerId: null, ownerUntil: null, messages: [] };
ticket = claim(ticket, "maja", "2026-10-05T10:00:00Z");
assert(ticket.ownerId === "maja" && ticket.ownerUntil === "2026-10-08T10:00:00.000Z", "sticky for 3 days");
const seen = new Set<string>();
const first = reply(ticket, "maja", "We are looking", "k1", seen);
const second = reply(first.ticket, "maja", "We are looking", "k1", seen);
assert(first.delivered && !second.delivered, "one delivery");
assert(deliveredToRider(second.ticket).length === 1, "one public reply");
const noted = addNote(second.ticket, "maja", "Might be a duplicate charge");
assert(deliveredToRider(noted).every((message) => message.kind === "reply"), "notes stay private");

console.log("support ok");
