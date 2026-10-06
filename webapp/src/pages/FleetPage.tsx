import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useRecords, useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { emptyDriverOpsBook, vehicleOps, type DriverOpsBook } from "../drivers/ops";
import { vehicleBlock } from "../drivers/gate";
import { DataTable } from "../ui/DataTable";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "eligible", label: "Eligible" },
  { id: "ineligible", label: "Ineligible" },
  { id: "on_hold", label: "On hold" },
] as const;

export function FleetPage() {
  const navigate = useNavigate();
  const { agent } = useSession();
  const vehicles = useRecords("vehicles", null);
  const fleets = useRecords("fleets", null);
  const store = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");

  const rows = useMemo(() => {
    const fleetPartnerId = agent?.scope.fleetPartnerId;
    return (vehicles.data ?? []).filter((vehicle) => {
      if (fleetPartnerId && vehicle.fleetId !== fleetPartnerId) return false;
      if (view !== "all" && vehicle.status !== view) return false;
      return true;
    });
  }, [agent?.scope.fleetPartnerId, vehicles.data, view]);

  if (vehicles.isLoading || fleets.isLoading || store.loading) return <p className="state-line">Loading vehicles.</p>;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Vehicles</h2>
          <p>
            {rows.length} vehicles in this view. Eligibility uses year, seats, fuel/category rules, registration review and account state.
            {agent?.scope.fleetPartnerId ? ` Fleet partner scope: ${agent.scope.fleetPartnerId}.` : ""}
          </p>
        </div>
      </div>

      <div className="actions" aria-label="Vehicle views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            data-command="admin.table.filter"
            type="button"
            className={view === item.id ? "primary-btn" : "secondary-btn"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="state-line">
        Fleet partners: {(fleets.data ?? []).map((fleet) => `${fleet.id} ${fleet.name}`).join(" · ") || "none in scope"}.
      </p>

      <DataTable
        head={["Vehicle", "Plate", "Driver", "Fleet", "Category", "Year", "Status", "Rule check"]}
        rows={rows.map((record) => {
          const profile = vehicleOps(store.value, record);
          const issue = vehicleBlock({
            year: profile.year,
            seats: profile.seats,
            fuel: profile.fuel,
            category: profile.category,
          });
          return [
            record.id,
            record.plate ?? record.id,
            record.driverId ?? "Unassigned",
            profile.fleetId || record.fleetId || "Independent",
            profile.category,
            profile.year,
            record.status,
            issue ?? (profile.registrationStatus === "approved" ? "Eligible" : `Registration ${profile.registrationStatus}`),
          ];
        })}
        state={vehicles.isError ? "error" : "ready"}
        onRetry={() => void vehicles.refetch()}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/vehicles/${id}`);
        }}
      />
    </>
  );
}
