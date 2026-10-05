import { useNavigate, useSearchParams } from "react-router";
import { useTrips } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { DataTable } from "../ui/DataTable";

export function TripsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const scope = params.get("scope");
  const trips = useTrips(scope);
  const rows = trips.data ?? [];

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Trips</h2>
          <p>{trips.isLoading ? "Loading trips." : `${rows.length} trips in this scope.`} Open a row for the record.</p>
        </div>
      </div>
      <DataTable
        head={["Trip", "Rider", "Status", "Zone", "Fare"]}
        rows={rows.map((trip) => [trip.id, trip.name, trip.status, trip.zoneId, formatOre(trip.fareOre ?? 0)])}
        state={trips.isLoading ? "loading" : trips.isError ? "error" : "ready"}
        onRetry={() => void trips.refetch()}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/trips/${id}`);
        }}
      />
    </>
  );
}
