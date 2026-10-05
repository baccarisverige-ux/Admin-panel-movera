import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTrips } from "../api/hooks";
import { CATEGORIES } from "../domain/contract";
import { categoryOf, paymentOf, startedAt, statusLabel, stockholmDate, TRIP_STATUSES, zoneName, type PaymentState } from "../trips/present";
import { DataTable } from "../ui/DataTable";

const PAYMENTS: PaymentState[] = ["pending", "authorized", "captured", "failed", "refunded"];

export function TripsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const trips = useTrips(params.get("scope"));
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [category, setCategory] = useState("all");
  const [payment, setPayment] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = trips.data ?? [];
  const zones = useMemo(() => [...new Set(rows.map((trip) => trip.zoneId))], [rows]);
  const filtered = rows.filter((trip) => {
    if (status !== "all" && trip.status !== status) return false;
    if (zone !== "all" && trip.zoneId !== zone) return false;
    if (category !== "all" && categoryOf(trip.id).id !== category) return false;
    if (payment !== "all" && paymentOf(trip) !== payment) return false;
    const day = stockholmDate(startedAt(trip.id));
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const statusCount = new Set(filtered.map((trip) => trip.status)).size;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Trips</h2>
          <p data-testid="trip-count">
            {trips.isLoading ? "Loading trips." : `${rows.length} trips in demo data, ${filtered.length} match the filters, ${statusCount} statuses in this view.`}
          </p>
        </div>
      </div>
      <div className="field-grid">
        <label>
          Trip status
          <select aria-label="Trip status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All 18 statuses</option>
            {TRIP_STATUSES.map((code) => (
              <option key={code} value={code}>{statusLabel(code)}</option>
            ))}
          </select>
        </label>
        <label>
          Zone
          <select aria-label="Trip zone" value={zone} onChange={(event) => setZone(event.target.value)}>
            <option value="all">All zones</option>
            {zones.map((id) => (
              <option key={id} value={id}>{zoneName(id)}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select aria-label="Trip category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select aria-label="Payment state" value={payment} onChange={(event) => setPayment(event.target.value)}>
            <option value="all">All payment states</option>
            {PAYMENTS.map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
        </label>
        <label>
          From
          <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          To
          <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      <DataTable
        head={["Trip", "Rider", "Status", "Zone", "Category", "Payment", "When"]}
        rows={filtered.map((trip) => [
          trip.id,
          trip.name,
          trip.status,
          zoneName(trip.zoneId),
          categoryOf(trip.id).label,
          statusLabel(paymentOf(trip)),
          stockholmDate(startedAt(trip.id)),
        ])}
        state={trips.isLoading ? "loading" : trips.isError ? "error" : "ready"}
        onRetry={() => void trips.refetch()}
        onRow={(index) => {
          const id = filtered[index]?.id;
          if (id) navigate(`/trips/${id}`);
        }}
      />
    </>
  );
}
