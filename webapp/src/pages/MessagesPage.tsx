import { useState } from "react";
import { advance, testSend, useRecords, type Delivery, type Outbound } from "../api/hooks";
import { fillTemplate } from "../messages/template";

const PEOPLE = [
  { id: "R1", app: "rider" as const, zone: "Norrmalm" },
  { id: "R2", app: "rider" as const, zone: "Solna" },
  { id: "D1", app: "driver" as const, zone: "Norrmalm" },
];

const LATE = { id: "late", name: "Late trip", body: "Hi {{name}}, trip {{trip}} is late." };

export function MessagesPage() {
  const [message, setMessage] = useState<Outbound>({ id: "M1", audience: { app: "rider", zone: "Norrmalm" }, body: "Reservations are open.", status: "accepted" });
  const [hits, setHits] = useState<string[]>([]);
  const [name, setName] = useState("Sara");
  const [trip, setTrip] = useState("");
  const filled = fillTemplate(LATE, { name, trip });
  const templates = useRecords("templates", null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Messages</h2>
          <p>Status {message.status}. {templates.data?.length ?? "…"} island templates. Accepted, sent, delivered and failed stay separate.</p>
        </div>
      </div>
      <article className="panel">
        <h3>Template · {LATE.name}</h3>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Trip
          <input value={trip} onChange={(event) => setTrip(event.target.value)} />
        </label>
        <p>{filled.error ?? filled.body}</p>
        <button
          className="secondary-btn"
          type="button"
          onClick={() => {
            if (!filled.error) setMessage({ ...message, body: filled.body, status: "accepted" });
          }}
        >
          Use this text
        </button>
      </article>
      <article className="panel">
        <p>{message.body}</p>
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
