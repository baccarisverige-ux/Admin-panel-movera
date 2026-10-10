import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  emptyReservationBook,
  normalizeReservationBook,
  reservationOps,
  reservationWarning,
  saveReservationPolicy,
  stockholmLabel,
  useRecords,
  useSlice,
  type ReservationBook,
  type ReservationPolicy,
} from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "assigned", label: "Assigned" },
  { id: "warning", label: "Needs attention" },
  { id: "return", label: "Return rides" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no_show", label: "No-show" },
] as const;

export function ReservationsPage() {
  const navigate = useNavigate();
  const { agent } = useSession();
  const reservations = useRecords("reservations", null);
  const store = useSlice<ReservationBook>("reservationOps", emptyReservationBook());
  const book = useMemo(() => normalizeReservationBook(store.value), [store.value]);
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [policyDraft, setPolicyDraft] = useState<ReservationPolicy | null>(null);
  const [notice, setNotice] = useState("Existing reservations keep the policy version they were booked with.");

  const policy = policyDraft ?? book.currentPolicy;
  const canIntervene = Boolean(agent && can(agent.role, "trips.intervene"));
  const nowIso = new Date().toISOString();
  const needle = query.trim().toLowerCase();

  const rows = useMemo(() => (reservations.data ?? []).filter((record) => {
    const ops = reservationOps(book, record);
    const warning = reservationWarning(record, ops, nowIso);
    if (view === "waiting" && !["waiting", "booked"].includes(record.status)) return false;
    if (view === "assigned" && record.status !== "assigned") return false;
    if (view === "warning" && !warning) return false;
    if (view === "return" && !ops.returnPickupAt) return false;
    if (view === "cancelled" && record.status !== "cancelled") return false;
    if (view === "no_show" && record.status !== "no_show") return false;
    if (!needle) return true;
    return [record.id, record.name, record.phone, record.driverId ?? "", ops.category ?? "", ops.policy.version]
      .some((value) => value.toLowerCase().includes(needle));
  }), [book, needle, nowIso, reservations.data, view]);

  function patchPolicy(patch: Partial<ReservationPolicy>) {
    setPolicyDraft({ ...policy, ...patch });
  }

  const policyPrepared = agent
    ? saveReservationPolicy(book, policy)
    : { book, error: "Sign in again." };

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Reservations</h2>
          <p>
            {reservations.isLoading || store.loading ? "Loading reservations." : `${rows.length} reservations in this view.`}
            {" "}Pickup times display in Europe/Stockholm. Each booking keeps its policy snapshot after policy changes or cancellation.
          </p>
        </div>
      </div>

      <p className="state-line">{notice} {store.message}</p>

      <div className="actions" aria-label="Reservation views">
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

      <label>
        Find reservation
        <input
          aria-label="Find reservation"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Reservation, rider, phone, driver, category or policy"
        />
      </label>

      <DataTable
        head={["Reservation", "Rider", "Pickup", "Return", "Category", "Driver", "Status", "Warning", "Policy", "Zone"]}
        rowIds={rows.map((row) => row.id)}
        rows={rows.map((record) => {
          const ops = reservationOps(book, record);
          return [
            record.id,
            record.name,
            stockholmLabel(ops.pickupAt),
            ops.returnPickupAt ? stockholmLabel(ops.returnPickupAt) : "—",
            ops.category ?? "economy",
            record.driverId ?? "Unassigned",
            record.status,
            reservationWarning(record, ops, nowIso) ?? "—",
            ops.policy.version,
            record.zoneId,
          ];
        })}
        state={reservations.isLoading || store.loading ? "loading" : reservations.isError ? "error" : "ready"}
        onRetry={() => {
          void reservations.refetch();
          void store.refetch();
        }}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/reservations/${id}`);
        }}
      />

      <article className="panel" data-testid="reservation-policy">
        <h3>Current reservation policy · {book.currentPolicy.version}</h3>
        <p>Changing this policy creates a new version. Existing bookings continue to use their original snapshot.</p>
        <div className="field-grid">
          <label>
            Booking horizon (days)
            <input
              aria-label="Booking horizon"
              type="number"
              disabled={!canIntervene}
              value={policy.bookingHorizonDays}
              onChange={(event) => patchPolicy({ bookingHorizonDays: Number(event.target.value) })}
            />
          </label>
          <label>
            Assignment lead (min)
            <input
              aria-label="Assignment lead"
              type="number"
              disabled={!canIntervene}
              value={policy.assignmentLeadMinutes}
              onChange={(event) => patchPolicy({ assignmentLeadMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            Give-up time (min)
            <input
              aria-label="Give-up time"
              type="number"
              disabled={!canIntervene}
              value={policy.giveUpMinutes}
              onChange={(event) => patchPolicy({ giveUpMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            Included waiting (min)
            <input
              aria-label="Included waiting"
              type="number"
              disabled={!canIntervene}
              value={policy.includedWaitingMinutes}
              onChange={(event) => patchPolicy({ includedWaitingMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            Free cancel after accept (min)
            <input
              aria-label="Free cancel after accept"
              type="number"
              disabled={!canIntervene}
              value={policy.freeCancelAfterAcceptMinutes}
              onChange={(event) => patchPolicy({ freeCancelAfterAcceptMinutes: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="actions">
          <CommandButton
            command="admin.reservation.savePolicy"
            className="primary-btn"
            type="button"
            targetId="reservation-policy"
            confirmTarget={false}
            scope="all"
            before={book.currentPolicy.version}
            after={policyPrepared.error ? "invalid" : policyPrepared.book.currentPolicy.version}
            expectedSliceRev={book.draftRev}
            sliceKey="reservationOps"
            value={policyPrepared.book}
            disabled={!canIntervene || !policyDraft || Boolean(policyPrepared.error)}
            title={policyPrepared.error ?? (!policyDraft ? "No unsaved policy change." : undefined)}
            onDone={() => {
              setPolicyDraft(null);
              setNotice(`Reservation policy published as ${policyPrepared.book.currentPolicy.version}. Existing bookings kept their snapshots.`);
            }}
          >
            Save reservation policy
          </CommandButton>
          <button
            data-command="admin.card.action"
            className="secondary-btn"
            type="button"
            disabled={!canIntervene || !policyDraft}
            onClick={() => setPolicyDraft(null)}
          >
            Discard policy changes
          </button>
        </div>
      </article>
    </>
  );
}
