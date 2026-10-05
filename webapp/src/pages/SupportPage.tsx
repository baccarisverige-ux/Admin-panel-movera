import { useMemo, useState } from "react";
import { addNote, claim, deliveredToRider, reply, useRecords, type Ticket } from "../api/hooks";
import { CommandButton } from "../ui/CommandButton";

export function SupportPage() {
  const seen = useMemo(() => new Set<string>(), []);
  const [ticket, setTicket] = useState<Ticket>({ id: "S1", ownerId: null, ownerUntil: null, messages: [] });
  const [text, setText] = useState("We are looking at the charge.");
  const [notice, setNotice] = useState("A reply is delivered once. A private note is not.");
  const queue = useRecords("tickets", null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Support</h2>
          <p>Owner {ticket.ownerId ?? "none"}{ticket.ownerUntil ? ` until ${ticket.ownerUntil}` : ""}. Queue {queue.data?.length ?? "…"}.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <label>
          Reply
          <input value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <div className="actions">
          <CommandButton command="admin.support.claim" className="secondary-btn" type="button" onDone={() => { setTicket(claim(ticket, "maja", new Date().toISOString())); setNotice("Claimed for 3 days."); }}>
            Claim
          </CommandButton>
          <CommandButton command="admin.support.reply" className="primary-btn" type="button" onDone={() => { const result = reply(ticket, "maja", text, "reply-1", seen); setTicket(result.ticket); setNotice(result.delivered ? "Delivered once." : "Already delivered. Not sent again."); }}>
            Reply
          </CommandButton>
          <CommandButton command="admin.support.note" className="secondary-btn" type="button" onDone={() => { setTicket(addNote(ticket, "maja", "Private: possible duplicate.")); setNotice("Note saved. The rider cannot see it."); }}>
            Private note
          </CommandButton>
        </div>
        <ul>
          {deliveredToRider(ticket).map((message) => (
            <li key={message.id}>{message.text}</li>
          ))}
        </ul>
      </article>
    </>
  );
}
