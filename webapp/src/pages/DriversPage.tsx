import { useState } from "react";
import { useNavigate } from "react-router";
import { useRecords } from "../api/hooks";
import { DataTable } from "../ui/DataTable";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "on_hold", label: "On hold" },
  { id: "suspended", label: "Suspended" },
] as const;

export function DriversPage() {
  const navigate = useNavigate();
  const drivers = useRecords("drivers", null);
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const rows = (drivers.data ?? []).filter((driver) => view === "all" || driver.status === view);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Drivers</h2>
          <p>{drivers.isLoading ? "Loading drivers." : `${rows.length} in ${VIEWS.find((item) => item.id === view)?.label}.`} Saved views filter this list. Open a row for the driver.</p>
        </div>
      </div>
      <div className="actions">
        {VIEWS.map((item) => (
          <button key={item.id} type="button" data-command="admin.table.filter" className={view === item.id ? "primary-btn" : "secondary-btn"} onClick={() => setView(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <DataTable
        head={["Driver", "Name", "Phone", "Status", "Zone", "Documents"]}
        rows={rows.map((driver) => [driver.id, driver.name, driver.phone, driver.status, driver.zoneId, driver.kind ?? "needed"])}
        state={drivers.isLoading ? "loading" : drivers.isError ? "error" : "ready"}
        onRetry={() => void drivers.refetch()}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/drivers/${id}`);
        }}
      />
    </>
  );
}
