import { useState } from "react";
import { assignReservation, cancelReservation, needsDriverSoon, useRecords, type Reservation } from "../api/hooks";
import { CommandButton } from "../ui/CommandButton";

const NOW = "2026-10-05T10:40:00Z";
const SEED: Reservation[] = [
  { id: "B1", pickupAt: "2026-10-05T11:20:00Z", driverId: null, policyVersion: "res-2", status: "booked" },
  { id: "B2", pickupAt: "2026-10-06T08:00:00Z", driverId: "D1", policyVersion: "res-2", status: "booked" },
];

export function ReservationsPage() {
  const [rows, setRows] = useState(SEED);
  const [notice, setNotice] = useState("A booking under 60 minutes without a driver is flagged. Give-up is 5 minutes.");
  const seeded = useRecords("reservations", null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Reservations</h2>
          <p>Policy version stays on the booking when you cancel. Demo queue {seeded.data?.length ?? "…"}.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      {rows.map((row) => (
        <article className="panel" key={row.id}>
          <h3>
            {row.id} · {row.status} · policy {row.policyVersion}
            {needsDriverSoon(row, NOW) ? " · needs a driver" : ""}
          </h3>
          <div className="actions">
            <CommandButton command="admin.reservation.assign" className="secondary-btn" type="button" onDone={() => { setRows(rows.map((item) => item.id === row.id ? assignReservation(item, "D3") : item)); setNotice("Assigned D3."); }}>
              Assign
            </CommandButton>
            <CommandButton command="admin.reservation.cancel" className="secondary-btn" type="button" onDone={() => { setRows(rows.map((item) => item.id === row.id ? cancelReservation(item) : item)); setNotice("Cancelled. Policy version unchanged."); }}>
              Cancel
            </CommandButton>
          </div>
        </article>
      ))}
    </>
  );
}
