import { useNavigate, useSearchParams } from "react-router";
import { useRiders } from "../api/hooks";
import { DataTable } from "../ui/DataTable";

export function RidersPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const scope = params.get("scope");
  const riders = useRiders(scope);
  const rows = riders.data ?? [];

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Riders</h2>
          <p>{riders.isLoading ? "Loading riders." : `${rows.length} riders in this scope.`} Open a row for the record.</p>
        </div>
      </div>
      <DataTable
        head={["Rider", "Name", "Phone", "Status", "Zone"]}
        rows={rows.map((rider) => [rider.id, rider.name, rider.phone, rider.status, rider.zoneId])}
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
