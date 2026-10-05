import { useState } from "react";
import { healthAlerts, roleMatrix, runDrills, type DrillResult } from "../handover/drills";

const NAMES: Record<string, string> = {
  "payment-failure": "Payment failure",
  sos: "SOS",
  suspension: "Driver suspension",
  reservation: "Reservation without a driver",
  "bad-publish": "Bad config publish",
};

export function HandoverPage() {
  const [drills, setDrills] = useState<DrillResult[] | null>(null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Handover</h2>
          <p>The role matrix and the five runbooks. Drills run on the demo, not on staging.</p>
        </div>
      </div>
      <article className="panel">
        <h3>Health</h3>
        <ul>
          {healthAlerts().map((alert) => (
            <li key={alert.id}>{alert.text}</li>
          ))}
        </ul>
      </article>
      <article className="panel">
        <h3>Role matrix</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {roleMatrix().map((row) => (
              <tr key={row.role}>
                <td>{row.role}</td>
                <td>{row.permissions.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
      <article className="panel">
        <h3>Drills</h3>
        <button className="primary-btn" type="button" onClick={() => setDrills(runDrills())}>
          Run drills
        </button>
        {drills?.map((drill) => (
          <section key={drill.id}>
            <h3>
              {NAMES[drill.id] ?? drill.id} · {drill.pass ? "pass" : "not passed"}
            </h3>
            <ul>
              {drill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </>
  );
}
