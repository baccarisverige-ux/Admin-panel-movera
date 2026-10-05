import { toCsv } from "../reports/csv";

const ROWS = [
  ["Zone", "Trips", "Fare"],
  ["Norrmalm", "42", "12 400 kr"],
  ["=cmd", "1", "+100"],
];

export function ReportsPage() {
  const csv = toCsv(ROWS);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Reports</h2>
          <p>Export guards cells that a spreadsheet would try to run.</p>
        </div>
      </div>
      <article className="panel">
        <pre>{csv}</pre>
        <a className="primary-btn" href={`data:text/csv,${encodeURIComponent(csv)}`} download="movera-report.csv">
          Download CSV
        </a>
      </article>
    </>
  );
}
