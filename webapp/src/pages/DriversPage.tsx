import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, CalendarClock, Car, PauseCircle, UserCheck, Users } from "lucide-react";
import { useRecords, useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { periodWindow } from "../dashboard/period";
import { DRIVER_DOCUMENTS } from "../drivers/gate";
import { driverOps, emptyDriverOpsBook, type DriverOpsBook } from "../drivers/ops";
import { countHealth } from "../fleet/documents";
import { driverPerformance } from "../fleet/performance";
import { DocSummary } from "../fleet/ui";
import { formatMoney, zoneById } from "../markets/markets";
import { useMarketScope } from "../markets/useMarketScope";
import { DataTable } from "../ui/DataTable";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "on_hold", label: "On hold" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "expiring", label: "Documents expiring" },
  { id: "invalid", label: "Documents missing" },
] as const;

type View = (typeof VIEWS)[number]["id"];

export function DriversPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { agent } = useSession();
  const scope = useMarketScope();
  const drivers = useRecords("drivers", null);
  const vehicles = useRecords("vehicles", null);
  const fleets = useRecords("fleets", null);
  const store = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const [view, setView] = useState<View>("all");
  const [type, setType] = useState("all");
  const [now] = useState(() => Date.now());
  const month = useMemo(() => periodWindow({ kind: "month" }, now, scope.market.timeZone, scope.market.locale), [now, scope.market]);

  const enriched = useMemo(() => (drivers.data ?? [])
    .filter((driver) => !agent?.scope.fleetPartnerId || driver.fleetId === agent.scope.fleetPartnerId)
    .map((driver) => {
      const ops = driverOps(store.value, { id: driver.id, name: driver.name, fleetId: driver.fleetId, status: driver.status, kind: driver.kind });
      const docs = DRIVER_DOCUMENTS.filter((id) => !(driver.fleetId && id === "company_registration")).map((id) => ops.documents[id]);
      const counts = countHealth(docs, now);
      const perf = driverPerformance({ id: driver.id, zoneId: driver.zoneId, status: driver.status, stars: ops.ratings.stars, acceptancePct: ops.ratings.acceptancePct, cancellationPct: ops.ratings.cancellationPct }, month, false).current;
      const car = (vehicles.data ?? []).find((row) => row.driverId === driver.id);
      const fleet = (fleets.data ?? []).find((row) => row.id === driver.fleetId);
      return { driver, counts, total: docs.length, perf, car, fleet };
    }), [drivers.data, vehicles.data, fleets.data, store.value, agent, now, month]);

  const counts = {
    all: enriched.length,
    active: enriched.filter((row) => row.driver.status === "active").length,
    on_hold: enriched.filter((row) => row.driver.status === "on_hold").length,
    pending: enriched.filter((row) => row.driver.status === "pending").length,
    suspended: enriched.filter((row) => row.driver.status === "suspended").length,
    expiring: enriched.filter((row) => row.counts.expiring > 0).length,
    invalid: enriched.filter((row) => row.counts.invalid > 0).length,
  };
  const fleetOptions = Array.from(new Map(enriched.filter((row) => row.fleet).map((row) => [row.fleet!.id, row.fleet!.name])));

  const rows = enriched.filter((row) => {
    if (type === "independent" && row.driver.fleetId) return false;
    if (type === "fleet" && !row.driver.fleetId) return false;
    if (type.startsWith("F") && row.driver.fleetId !== type) return false;
    if (view === "expiring") return row.counts.expiring > 0;
    if (view === "invalid") return row.counts.invalid > 0;
    return view === "all" || row.driver.status === view;
  });
  const money = (minor: number) => formatMoney(minor, scope.country, { compact: true });
  const keep = params.get("country") || params.get("scope") ? `?${params.toString()}` : "";

  return (
    <div className="fd-page">
      <div className="fd-head">
        <div>
          <h2>Drivers</h2>
          <p>{drivers.isLoading ? "Loading drivers." : `${rows.length} in ${VIEWS.find((item) => item.id === view)?.label}.`} Open a driver to see every detail, document, performance and earnings. Numbers are for {month.label}.</p>
        </div>
      </div>

      <section className="fd-cards" aria-label="Driver summary">
        <SummaryCard icon={<Users size={18} />} tone="blue" label="All drivers" value={counts.all} />
        <SummaryCard icon={<UserCheck size={18} />} tone="green" label="Active" value={counts.active} />
        <SummaryCard icon={<PauseCircle size={18} />} tone="amber" label="On hold" value={counts.on_hold} />
        <SummaryCard icon={<CalendarClock size={18} />} tone="violet" label="Pending approval" value={counts.pending} />
        <SummaryCard icon={<AlertTriangle size={18} />} tone="orange" label="Documents expiring" value={counts.expiring} />
        <SummaryCard icon={<Car size={18} />} tone="red" label="Documents missing or wrong" value={counts.invalid} />
      </section>

      <div className="fd-toolbar">
        <div className="fd-views" role="group" aria-label="Driver views">
          {VIEWS.map((item) => (
            <button key={item.id} type="button" data-command="admin.table.filter" className={view === item.id ? "fd-view active" : "fd-view"} aria-pressed={view === item.id} aria-label={item.label} onClick={() => setView(item.id)}>
              {item.label}<span>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <label className="fd-select">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All drivers</option>
            <option value="independent">Independent</option>
            <option value="fleet">In a fleet</option>
            {fleetOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </div>

      <DataTable
        className="fd-table"
        head={["Driver", "Name", "Type", "Status", "Zone", "Vehicle", "Documents", "Rating", "Trips", "Cancel %", "Earnings"]}
        rowIds={rows.map((row) => row.driver.id)}
        rows={rows.map(({ driver, counts: docCounts, total, perf, car, fleet }) => [
          driver.id,
          driver.name,
          fleet ? fleet.name : "Independent",
          driver.status,
          zoneById(driver.zoneId)?.name ?? driver.zoneId,
          car ? `${car.make ?? ""} ${car.model ?? ""} · ${car.plate ?? car.id}`.trim() : "No vehicle",
          <DocSummary key={`${driver.id}-docs`} counts={docCounts} total={total} />,
          perf.rating ? perf.rating.toFixed(2) : "—",
          String(perf.trips),
          perf.trips ? `${perf.cancellationPct}%` : "—",
          perf.netMinor ? money(perf.netMinor) : "—",
        ])}
        state={drivers.isLoading ? "loading" : drivers.isError ? "error" : "ready"}
        onRetry={() => void drivers.refetch()}
        onRow={(index) => {
          const id = rows[index]?.driver.id;
          if (id) navigate({ pathname: `/drivers/${id}`, search: keep });
        }}
      />
    </div>
  );
}

function SummaryCard({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: number }) {
  return (
    <article className={`fd-card tone-${tone}`}>
      <span className="fd-card-icon" aria-hidden="true">{icon}</span>
      <span className="fd-card-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
