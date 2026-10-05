import { chapter16, gateB } from "../gates/scenarios";
import { frontendGateC, gateC } from "../gates/frontendC";
import { APPS } from "../gates/apps";

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
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Simulation</th>
            <th>Staging</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.pass ? "pass" : "not passed"}</td>
              <td>{row.staging ? "yes" : "no"}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="page-heading">
        <div>
          <h2>Gate C, frontend only</h2>
          <p>
            {frontendPassed} of {frontend.length} pass on one shared record inside this admin. {gateCResult.reason}
          </p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Frontend</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {frontend.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.pass ? "pass" : "not passed"}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
