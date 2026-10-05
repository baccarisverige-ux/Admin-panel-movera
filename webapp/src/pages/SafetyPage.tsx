import { useState } from "react";
import { publicIncident, resolveIncident, takeIncident, useRecords, type Incident } from "../api/hooks";

export function SafetyPage() {
  const [incident, setIncident] = useState<Incident>({ id: "INC-1", state: "queued", locationAt: "2026-10-05T10:00:00Z", accuracyM: 12, ownerId: null });
  const [notice, setNotice] = useState("Location time is shown. The PIN is never shown.");
  const view = publicIncident(incident);
  const list = useRecords("incidents", null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Safety</h2>
          <p>Impossible travel threshold 55 m/s. {list.data?.length ?? "…"} incidents in the demo.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <p>
          {view.id} · {view.state} · located {view.locationAt} · accuracy {view.accuracyM} m
        </p>
        <div className="actions">
          <button className="secondary-btn" type="button" onClick={() => { setIncident(takeIncident(incident, "erik")); setNotice("Taken."); }}>
            Take
          </button>
          <button className="primary-btn" type="button" onClick={() => { const result = resolveIncident(incident); if (result.error) setNotice(result.error); else { setIncident(result.incident); setNotice("Resolved."); } }}>
            Resolve
          </button>
        </div>
      </article>
    </>
  );
}
