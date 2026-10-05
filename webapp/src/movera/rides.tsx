import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { assignReservation, cancelReservation, cancelTrip, adjustFare, offerReservation, reassignTrip } from "./actions";
import { ACTIVE_TRIP, categoryName, driverPayout, personName, TRIP_STATUSES, tripFare, tripTotal, ZONES, zoneName, type Reservation, type TripStatus } from "./domain";
import { formatSek, formatWhen, statusLabel } from "./format";
import { scopedDrivers, scopedTrips, useAdmin } from "./store";
import { A, Button, DataTable, Field, Guard, PageHead, Panel, Select, StatusBadge, TextInput } from "./ui";

export function TripsScreen() {
  const { db, agent } = useAdmin();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("all");
  if (!db || !agent) return null;
  const rows = scopedTrips(db, agent).filter((trip) => status === "all" || trip.status === status);
  return (
    <Guard need="trips.view">
      <PageHead title="Trips" subtitle="Live and past trips. Open one for the timeline, waybill and actions.">
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {TRIP_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </Select>
      </PageHead>
      <Panel className="mb-4">
        <h3 className="font-semibold">Active now</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((zone) => {
            const count = rows.filter((trip) => trip.zoneId === zone.id && ACTIVE_TRIP.includes(trip.status)).length;
            return <div key={zone.id} className="rounded-xl border border-line px-3 py-2 text-sm"><span className="font-medium">{zone.name}</span><span className="float-right tabular-nums">{count}</span></div>;
          })}
        </div>
      </Panel>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No trips for this filter."
        search={(row) => `${row.id} ${row.status} ${row.riderId} ${row.driverId ?? ""}`}
        onRow={(row) => void navigate({ href: `/trips/${row.id}` })}
        columns={[
          { key: "id", header: "Trip", render: (row) => row.id },
          { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "zone", header: "Zone", render: (row) => zoneName(row.zoneId) },
          { key: "cat", header: "Category", render: (row) => categoryName(row.category) },
          { key: "when", header: "When", sort: (a, b) => a.createdAt.localeCompare(b.createdAt), render: (row) => formatWhen(row.createdAt) },
          { key: "fare", header: "Fare", render: (row) => formatSek(tripFare(row)) },
        ]}
      />
    </Guard>
  );
}

export function TripScreen({ id }: { id: string }) {
  const { db, agent, run, can } = useAdmin();
  const [reason, setReason] = useState("");
  const [driverId, setDriverId] = useState("");
  const [adjust, setAdjust] = useState("0");
  if (!db || !agent) return null;
  const trip = scopedTrips(db, agent).find((item) => item.id === id);
  if (!trip) return <Panel>Trip not in your scope.</Panel>;
  const rider = db.riders.find((item) => item.id === trip.riderId);
  const driver = db.drivers.find((item) => item.id === trip.driverId);
  const vehicle = db.vehicles.find((item) => item.id === trip.vehicleId);
  const drivers = scopedDrivers(db, agent).filter((item) => item.accountStatus === "active" && item.categories[trip.category]);
  const terminal = ["completed", "cancelled_by_rider", "cancelled_by_driver", "cancelled_by_admin", "no_show", "expired", "failed"].includes(trip.status);
  return (
    <Guard need="trips.view">
      <A href="/trips" className="text-sm text-muted">Trips</A>
      <PageHead title={trip.id} subtitle={`${categoryName(trip.category)} · ${zoneName(trip.zoneId)}`}>
        <StatusBadge status={trip.status} />
      </PageHead>
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <h3 className="font-semibold">Timeline</h3>
          <ol className="mt-3 space-y-3 border-l border-line pl-4">
            {trip.timeline.map((event) => (
              <li key={`${event.status}-${event.at}`}>
                <StatusBadge status={event.status} />
                <span className="ml-2 text-xs text-muted">{formatWhen(event.at)}</span>
              </li>
            ))}
          </ol>
          <h3 className="mt-6 font-semibold">Route</h3>
          <ul className="mt-2 space-y-2 text-sm">
            <li><span className="text-good">Pickup</span> · {trip.pickup.label} · {trip.pickup.address}</li>
            {trip.stops.map((stop) => <li key={stop.address}><span className="text-warn">Stop</span> · {stop.label}</li>)}
            <li><span className="font-medium">Drop-off</span> · {trip.dropoff.label} · {trip.dropoff.address}</li>
          </ul>
        </Panel>
        <div className="space-y-3">
          <Panel>
            <h3 className="font-semibold">Fare</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex justify-between"><span>Pickup</span><span className="tabular-nums">{formatSek(trip.pickupFee)}</span></li>
              <li className="flex justify-between"><span>Distance {trip.km} km</span><span className="tabular-nums">{formatSek(trip.distanceFee)}</span></li>
              <li className="flex justify-between"><span>Time {trip.minutes} min</span><span className="tabular-nums">{formatSek(trip.timeFee)}</span></li>
              <li className="flex justify-between"><span>Rider increase</span><span className="tabular-nums">{formatSek(trip.increase)}</span></li>
              <li className="flex justify-between"><span>Boost</span><span className="tabular-nums">{formatSek(trip.boost)}</span></li>
              <li className="flex justify-between"><span>Tip</span><span className="tabular-nums">{formatSek(trip.tip)}</span></li>
              <li className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatSek(tripTotal(trip))}</span></li>
              <li className="flex justify-between text-muted"><span>Driver payout</span><span className="tabular-nums">{formatSek(driverPayout(trip))}</span></li>
            </ul>
            <p className="mt-2 text-xs text-muted">Payment {trip.paymentStatus} is separate from rating {trip.ratingStatus}. PIN is {trip.pinVerified ? "verified" : "not verified"}. The PIN itself is never shown. Rule version {trip.ruleVersion ?? db.rev}.</p>
            {trip.cancelCode ? <p className="mt-2 text-sm">Cancel: {trip.cancelCode} · {trip.cancelledBy}</p> : null}
          </Panel>
          <Panel>
            <h3 className="font-semibold">Waybill</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-xs text-muted">Trip</dt><dd>{trip.id}</dd></div>
              <div><dt className="text-xs text-muted">Status</dt><dd>{statusLabel(trip.status)}</dd></div>
              <div><dt className="text-xs text-muted">Fare</dt><dd>{formatSek(tripFare(trip))}</dd></div>
              <div><dt className="text-xs text-muted">Service</dt><dd>{categoryName(trip.category)}</dd></div>
              <div><dt className="text-xs text-muted">Rider</dt><dd>{rider ? personName(rider) : "—"}</dd></div>
              <div><dt className="text-xs text-muted">Driver</dt><dd>{driver ? <A href={`/drivers/${driver.id}`} className="underline-offset-2 hover:underline">{personName(driver)}</A> : "—"}</dd></div>
              <div><dt className="text-xs text-muted">Vehicle</dt><dd>{vehicle ? `${vehicle.make} ${vehicle.model}` : "—"}</dd></div>
              <div><dt className="text-xs text-muted">Plate</dt><dd>{vehicle?.plate ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Seats</dt><dd>{vehicle?.seats ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Source</dt><dd>Movera</dd></div>
            </dl>
          </Panel>
          {can("trips.cancel") || can("trips.reassign") ? (
            <Panel>
              {terminal ? <p className="mb-2 text-sm text-muted">Cancel and reassign are off because this trip is {statusLabel(trip.status)}.</p> : null}
              {can("trips.cancel") ? (
                <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void run((data, who) => cancelTrip(data, who, { tripId: trip.id, reason })); }}>
                  <Field label="Cancel reason"><TextInput value={reason} onChange={(event) => setReason(event.target.value)} disabled={terminal} /></Field>
                  <Button variant="danger" type="submit" disabled={terminal}>Cancel trip</Button>
                </form>
              ) : null}
              {can("trips.reassign") ? (
                <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void run((data, who) => reassignTrip(data, who, { tripId: trip.id, driverId })); }}>
                  <Field label="Reassign an eligible driver">
                    <Select value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={terminal}>
                      <option value="">Choose</option>
                      {drivers.map((item) => <option key={item.id} value={item.id}>{personName(item)}</option>)}
                    </Select>
                  </Field>
                  <Button type="submit" disabled={terminal || !driverId}>Reassign</Button>
                </form>
              ) : null}
              {can("trips.cancel") ? (
                <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void run((data, who) => adjustFare(data, who, { tripId: trip.id, ore: Math.round(Number(adjust.replace(",", ".")) * 100), reason })); }}>
                  <Field label="Adjust fare (kronor, can be negative)"><TextInput value={adjust} onChange={(event) => setAdjust(event.target.value)} /></Field>
                  <Button type="submit" disabled={trip.paymentStatus === "refunded"}>Adjust fare</Button>
                </form>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </Guard>
  );
}

function ReservationCard({ item }: { item: Reservation }) {
  const { db, agent, run, can } = useAdmin();
  const [driverId, setDriverId] = useState("");
  if (!db || !agent) return null;
  const rider = db.riders.find((person) => person.id === item.riderId);
  const drivers = scopedDrivers(db, agent).filter((person) => person.accountStatus === "active");
  const soon = item.status === "waiting" && new Date(item.pickupAt).getTime() - new Date("2026-10-05T08:30:00+02:00").getTime() < 60 * 60 * 1000;
  return (
    <Panel className={soon ? "border-bad" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{item.id} · {formatWhen(item.pickupAt)}</p>
          <p className="text-sm text-muted">{rider ? personName(rider) : item.riderId} · {item.pickup.label} → {item.dropoff.label}</p>
          <p className="text-sm">{categoryName(item.category)} · {formatSek(item.price)}{item.previousPrice ? ` · was ${formatSek(item.previousPrice)}` : ""} · offers {item.offers}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      {can("reservations.manage") && item.status === "waiting" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void run((data, who) => offerReservation(data, who, item.id))}>Offer to drivers</Button>
          <Select value={driverId} onChange={(event) => setDriverId(event.target.value)} aria-label={`Assign driver for ${item.id}`}>
            <option value="">Assign…</option>
            {drivers.map((person) => <option key={person.id} value={person.id}>{personName(person)}</option>)}
          </Select>
          <Button onClick={() => driverId && void run((data, who) => assignReservation(data, who, { reservationId: item.id, driverId }))}>Assign</Button>
          <Button variant="danger" onClick={() => {
            const why = window.prompt("Cancel reason");
            if (why) void run((data, who) => cancelReservation(data, who, { reservationId: item.id, reason: why }));
          }}>Cancel</Button>
        </div>
      ) : null}
    </Panel>
  );
}

export function ReservationsScreen() {
  const { db, agent } = useAdmin();
  const [tab, setTab] = useState("waiting");
  if (!db || !agent) return null;
  const rows = db.reservations.filter((item) => (tab === "today" ? true : item.status === (tab === "waiting" ? "waiting" : tab)));
  return (
    <Guard need="reservations.manage">
      <PageHead title="Reservations" subtitle="Scheduled rides. Red means pickup is within 60 minutes and no driver is assigned." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["waiting", "assigned", "today", "completed", "cancelled"].map((item) => (
          <button key={item} className={`h-11 shrink-0 rounded-full px-3 text-sm capitalize ${tab === item ? "bg-ink text-paper" : "border border-line bg-paper"}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((item) => <ReservationCard key={item.id} item={item} />)}
        {rows.length === 0 ? <Panel>Nothing in this tab.</Panel> : null}
      </div>
    </Guard>
  );
}

export function ZonesScreen() {
  const { db, agent } = useAdmin();
  if (!db || !agent) return null;
  return (
    <Guard need="drivers.view">
      <PageHead title="Zones" subtitle="Stockholm operating zones, including the airport queues." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ZONES.map((zone) => {
          const trips = db.trips.filter((trip) => trip.zoneId === zone.id && ACTIVE_TRIP.includes(trip.status)).length;
          const drivers = scopedDrivers(db, agent).filter((driver) => driver.zoneId === zone.id && driver.onlineStatus !== "offline" && driver.onlineStatus !== "suspended").length;
          return (
            <Panel key={zone.id}>
              <h3 className="font-semibold">{zone.name}</h3>
              <p className="text-sm text-muted">{zone.airport ? "Airport queue zone" : "City zone"}</p>
              <p className="mt-3 text-sm">{trips} active trips · {drivers} online drivers</p>
              <A href="/pricing" className="mt-2 inline-block text-sm underline-offset-2 hover:underline">Prices</A>
            </Panel>
          );
        })}
      </div>
    </Guard>
  );
}
