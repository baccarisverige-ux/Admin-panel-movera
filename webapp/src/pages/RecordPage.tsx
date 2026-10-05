import { Link, useParams, useSearchParams } from "react-router";

export function RecordPage({ label, list }: { label: string; list: string }) {
  const params = useParams();
  const [search] = useSearchParams();
  const id = params.driverId ?? params.riderId ?? params.tripId ?? params.zoneId ?? params.id ?? "";
  const tab = search.get("tab");

  return (
    <div className="page-heading">
      <div>
        <h2>
          {label} {id}
        </h2>
        <p>
          Demo data. This address stays after refresh.{tab ? ` Tab ${tab}.` : ""} The full record comes in a later work order.
        </p>
        <Link to={list}>Back</Link>
      </div>
    </div>
  );
}
