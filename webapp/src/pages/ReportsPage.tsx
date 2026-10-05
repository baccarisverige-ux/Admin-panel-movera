import { useState } from "react";
import { toCsv } from "../reports/csv";
import { rowsInRange, type ReportRow } from "../reports/range";

const ALL: ReportRow[] = [
  { date: "2026-09-01", zone: "Solna", trips: "3", fare: "800 kr" },
  { date: "2026-10-01", zone: "Norrmalm", trips: "42", fare: "12 400 kr" },
  { date: "2026-10-04", zone: "=cmd", trips: "1", fare: "+100" },
];

export function ReportsPage() {
  const [from, setFrom] = useState("2026-10-01");
  const [to, setTo] = useState("2026-10-05");
  const slice = rowsInRange(ALL, from, to);
  const csv = toCsv([["Date", "Zone", "Trips", "Fare"], ...slice.rows.map((row) => [row.date, row.zone, row.trips, row.fare])]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Reports</h2>
          <p>Only rows inside the dates are exported. Formula cells stay guarded.</p>
        </div>
      </div>
      <article className="panel">
        <label>
          From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <p>{slice.error ?? `${slice.rows.length} rows`}</p>
        <pre>{csv}</pre>
        <a className="primary-btn" href={`data:text/csv,${encodeURIComponent(csv)}`} download="movera-report.csv">
          Download CSV
        </a>
      </article>
    </>
  );
}
