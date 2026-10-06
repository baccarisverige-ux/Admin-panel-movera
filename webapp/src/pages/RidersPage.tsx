import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useRiders, useSlice } from "../api/hooks";
import { emptyRiderOpsBook, riderOps, type RiderOpsBook } from "../riders/ops";
import { DataTable } from "../ui/DataTable";
import { SensitiveValue } from "../ui/SensitiveValue";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "blocked", label: "Blocked" },
  { id: "privacy", label: "Privacy" },
] as const;

export function RidersPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const scope = params.get("scope");
  const riders = useRiders(scope);
  const store = useSlice<RiderOpsBook>("riderOps", emptyRiderOpsBook());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const needle = query.trim().toLowerCase();

  const rows = useMemo(() => (riders.data ?? []).filter((rider) => {
    const ops = riderOps(store.value, rider);
    if (view === "active" && rider.status !== "active") return false;
    if (view === "blocked" && rider.status !== "blocked") return false;
    if (view === "privacy" && ops.privacy === "none") return false;
    if (!needle) return true;
    return [rider.id, rider.name, rider.phone, rider.tripId ?? ""].some((value) => value.toLowerCase().includes(needle));
  }), [needle, riders.data, store.value, view]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Riders</h2>
          <p>{riders.isLoading || store.loading ? "Loading riders." : `${rows.length} match.`} Find by name, phone, rider id, or trip id. Account, wallet, session and privacy state stay visible together.</p>
        </div>
      </div>

      <div className="actions" aria-label="Rider views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-command="admin.table.filter"
            className={view === item.id ? "primary-btn" : "secondary-btn"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label>
        Find rider
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      <DataTable
        head={["Rider", "Name", "Phone", "Trip", "Status", "Wallet", "Sessions", "Privacy", "Zone"]}
        rows={rows.map((rider) => {
          const ops = riderOps(store.value, rider);
          return [
            rider.id,
            rider.name,
            <SensitiveValue key={`${rider.id}-phone`} value={rider.phone} permission="riders.viewSensitive" command="admin.rider.revealSensitive" targetId={rider.id} label="Phone" />,
            rider.tripId ?? "",
            rider.status,
            `${(ops.walletOre / 100).toFixed(2)} kr`,
            ops.sessions.filter((session) => session.active).length,
            ops.privacy,
            rider.zoneId,
          ];
        })}
        state={riders.isLoading || store.loading ? "loading" : riders.isError ? "error" : "ready"}
        onRetry={() => {
          void riders.refetch();
          void store.refetch();
        }}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/riders/${id}`);
        }}
      />
    </>
  );
}
