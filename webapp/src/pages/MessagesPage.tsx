import { useState } from "react";
import { advance, testSend, type Delivery, type Outbound } from "../messages/book";

const PEOPLE = [
  { id: "R1", app: "rider" as const, zone: "Norrmalm" },
  { id: "R2", app: "rider" as const, zone: "Solna" },
  { id: "D1", app: "driver" as const, zone: "Norrmalm" },
];

export function MessagesPage() {
  const [message, setMessage] = useState<Outbound>({ id: "M1", audience: { app: "rider", zone: "Norrmalm" }, body: "Reservations are open.", status: "accepted" });
  const [hits, setHits] = useState<string[]>([]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Messages</h2>
          <p>Status {message.status}. Accepted, sent, delivered and failed stay separate.</p>
        </div>
      </div>
      <article className="panel">
        <div className="actions">
          <button className="secondary-btn" type="button" onClick={() => setHits(testSend(message.audience, PEOPLE))}>
            Test send
          </button>
          {(["sent", "delivered", "failed"] as Delivery[]).map((status) => (
            <button key={status} className="secondary-btn" type="button" onClick={() => setMessage(advance(message, status))}>
              Mark {status}
            </button>
          ))}
        </div>
        <p>Would reach: {hits.length === 0 ? "nobody yet" : hits.join(", ")}</p>
      </article>
    </>
  );
}
