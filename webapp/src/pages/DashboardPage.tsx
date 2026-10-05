import { useSearchParams } from "react-router";
import { useRecords } from "../api/hooks";
import { StatusDot } from "../ui/kit";

export function DashboardPage() {
  const [params] = useSearchParams();
  const scope = params.get("scope");
  const drivers = useRecords("drivers", scope);
  const riders = useRecords("riders", scope);
  const trips = useRecords("trips", scope);
  const tickets = useRecords("tickets", scope);

  const tiles = [
    ["Drivers", drivers.data?.length],
    ["Riders", riders.data?.length],
    ["Trips", trips.data?.length],
    ["Tickets", tickets.data?.length],
  ] as const;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Dashboard</h2>
          <p>Counts come from the demo dataset{scope ? ` in ${scope}` : ""}. They are not fixed numbers.</p>
        </div>
      </div>
      <section className="stats-grid">
        {tiles.map(([label, value]) => (
          <article className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value ?? "…"}</strong>
          </article>
        ))}
      </section>
      <article className="panel">
        <StatusDot tone="green">Active</StatusDot>
        <p>There are no invented alerts on this page.</p>
      </article>
    </>
  );
}
