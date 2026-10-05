import { chapter16, gateB } from "../gates/scenarios";

export function GatesPage() {
  const rows = chapter16();
  const gate = gateB(undefined, rows);
  const passed = rows.filter((row) => row.pass).length;

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
    </>
  );
}
