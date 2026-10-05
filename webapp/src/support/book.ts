export type Message = { id: string; kind: "reply" | "note"; text: string; agentId: string };

export type Ticket = {
  id: string;
  ownerId: string | null;
  ownerUntil: string | null;
  messages: Message[];
};

export function claim(ticket: Ticket, agentId: string, nowIso: string): Ticket {
  const until = new Date(Date.parse(nowIso) + 3 * 24 * 60 * 60 * 1000).toISOString();
  return { ...ticket, ownerId: agentId, ownerUntil: until };
}

export function reply(ticket: Ticket, agentId: string, text: string, key: string, seen: Set<string>): { ticket: Ticket; delivered: boolean } {
  if (seen.has(key)) return { ticket, delivered: false };
  seen.add(key);
  return {
    ticket: { ...ticket, messages: [...ticket.messages, { id: key, kind: "reply", text, agentId }] },
    delivered: true,
  };
}

export function addNote(ticket: Ticket, agentId: string, text: string): Ticket {
  return { ...ticket, messages: [...ticket.messages, { id: `note-${ticket.messages.length}`, kind: "note", text, agentId }] };
}

export function deliveredToRider(ticket: Ticket): Message[] {
  return ticket.messages.filter((message) => message.kind === "reply");
}
