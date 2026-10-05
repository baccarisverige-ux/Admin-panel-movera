import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useRiders } from "../api/hooks";
import { DataTable } from "../ui/DataTable";

export function RidersPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const scope = params.get("scope");
  const riders = useRiders(scope);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = (riders.data ?? []).filter((rider) => {
    if (!needle) return true;
    return [rider.id, rider.name, rider.phone, rider.tripId ?? ""].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Riders</h2>
          <p>{riders.isLoading ? "Loading riders." : `${rows.length} match.`} Find by name, phone, rider id, or trip id.</p>
        </div>
      </div>
      <label>
        Find rider
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <DataTable
        head={["Rider", "Name", "Phone", "Trip", "Status", "Zone"]}
        rows={rows.map((rider) => [rider.id, rider.name, rider.phone, rider.tripId ?? "", rider.status, rider.zoneId])}
        state={riders.isLoading ? "loading" : riders.isError ? "error" : "ready"}
        onRetry={() => void riders.refetch()}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/riders/${id}`);
        }}
      />
    </>
  );
}
