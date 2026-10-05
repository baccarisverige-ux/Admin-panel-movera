import { APPS } from "../gates/apps";
import { frontendGateC, gateC } from "../gates/frontendC";
import { chapter16, gateB } from "../gates/scenarios";
import { DataTable } from "../ui/DataTable";

export function GatesPage() {
  const rows = chapter16();
  const gate = gateB(undefined, rows);
  const passed = rows.filter((row) => row.pass).length;
  const frontend = frontendGateC();
  const frontendPassed = frontend.filter((row) => row.pass).length;
  const gateCResult = gateC();

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Chapter 16</h2>
          <p>
            {passed} of {rows.length} pass in the simulation. {gate.reason}
          </p>
        </div>
      </div>
      <article className="panel">
        <h3>Frontends</h3>
        <ul>
          {APPS.map((app) => (
            <li key={app.id}>
              {app.name} {app.sha.slice(0, 7)} · <a href={app.url}>{app.url}</a>
            </li>
          ))}
        </ul>
      </article>
      <DataTable
        head={["Id", "Simulation", "Staging", "Note"]}
        rows={rows.map((row) => [row.id, row.pass ? "pass" : "not passed", row.staging ? "yes" : "no", row.note])}
      />
      <div className="page-heading">
        <div>
          <h2>Gate C, frontend only</h2>
          <p>
            {frontendPassed} of {frontend.length} pass on one shared record inside this admin. {gateCResult.reason}
          </p>
        </div>
      </div>
      <DataTable
        head={["Id", "Frontend", "Note"]}
        rows={frontend.map((row) => [row.id, row.pass ? "pass" : "not passed", row.note])}
      />
    </>
  );
}
