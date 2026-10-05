import { Link, useParams, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useDrivers, useRecords, useTrips } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import {
  adjustBlock,
  cancelBlock,
  cancelReason,
  cancelledBy,
  categoryOf,
  fareBreakdown,
  offersFor,
  paymentOf,
  pinVerified,
  ratingLabel,
  refundBlock,
  reassignBlock,
  riderIdFor,
  startedAt,
  stockholmLabel,
  stopsOf,
  timelineOf,
  waybill,
  zoneName,
} from "../trips/present";
import { CommandButton } from "../ui/CommandButton";
import { StatusDot } from "../ui/kit";

const TABS = [
  ["timeline", "Timeline"],
  ["route", "Route"],
  ["fare", "Fare"],
  ["waybill", "Waybill"],
  ["actions", "Actions"],
] as const;

export function TripPage() {
  const { tripId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const trips = useTrips(null);
  const drivers = useDrivers(null);
  const vehicles = useRecords("vehicles", null);
  const trip = trips.data?.find((item) => item.id === tripId);
  const tab = params.get("tab") ?? "timeline";
  const [driverId, setDriverId] = useState("");
  const eligible = useMemo(() => (trip ? offersFor(trip, drivers.data ?? []) : []), [drivers.data, trip]);
  const chosen = driverId || eligible[0]?.id || "";

  if (trips.isLoading || drivers.isLoading) return <p className="state-line">Loading trip.</p>;
  if (!trip) {
    return (
      <div className="page-heading">
        <div>
          <h2>Trip {tripId}</h2>
          <p>That trip is not in the demo data.</p>
          <Link to="/trips">Back to trips</Link>
        </div>
      </div>
    );
  }

  const driver = drivers.data?.find((item) => item.id === trip.driverId);
  const vehicle = vehicles.data?.find((item) => item.driverId === trip.driverId);
  const fare = fareBreakdown(trip);
  const stops = stopsOf(trip);
  const sheet = waybill(trip, driver?.name ?? "", vehicle?.plate ?? "");
  const payment = paymentOf(trip);
  const cancelWhy = cancelBlock(trip.status);
  const reassignWhy = reassignBlock(trip.status) ?? (eligible.length === 0 ? "No eligible driver is free for this category." : null);
  const adjustWhy = adjustBlock(trip.status);
  const refundWhy = refundBlock(payment);
  const tone = trip.status.includes("cancel") || trip.status === "failed" ? "red" : trip.status === "completed" ? "green" : "amber";
  const minX = Math.min(...stops.map((stop) => stop.lng));
  const maxX = Math.max(...stops.map((stop) => stop.lng));
  const minY = Math.min(...stops.map((stop) => stop.lat));
  const maxY = Math.max(...stops.map((stop) => stop.lat));
  const spanX = maxX - minX || 0.01;
  const spanY = maxY - minY || 0.01;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Trip {trip.id}</h2>
          <p>
            <StatusDot tone={tone}>{statusLabel(trip.status)}</StatusDot>
            {" "}{trip.name} · {zoneName(trip.zoneId)} · {categoryOf(trip.id).label} · {stockholmLabel(startedAt(trip.id))}
          </p>
        </div>
        <Link to="/trips">Back to trips</Link>
      </div>
      <div className="actions" role="tablist" aria-label="Trip sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            data-command="admin.tabs.select"
            className={tab === id ? "primary-btn" : "secondary-btn"}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", id);
              setParams(next);
              document.getElementById(id)?.scrollIntoView({ block: "start" });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="split">
        <article className="panel" id="timeline" data-testid="trip-timeline">
          <h3>Timeline</h3>
          <ol className="version-list">
            {timelineOf(trip).map((event) => (
              <li key={event.code}>{stockholmLabel(event.at)} · {event.label}</li>
            ))}
          </ol>
          <p>Who cancelled: {cancelledBy(trip.status)}. Reason: {cancelReason(trip)}.</p>
        </article>
        <article className="panel">
          <h3>People</h3>
          <p>Rider <Link to={`/riders/${riderIdFor(trip)}`}>{trip.name}</Link> · {trip.phone}</p>
          <p>Driver {driver ? <Link to={`/drivers/${driver.id}`}>{driver.name}</Link> : "Unassigned"}</p>
          <p data-testid="trip-payment">Payment {statusLabel(payment)}</p>
          <p data-testid="trip-rating">Rating {ratingLabel(trip)}</p>
          <p data-testid="trip-pin">PIN verified {pinVerified(trip.id)}</p>
        </article>
      </div>
      <article className="panel" id="route" data-testid="trip-route">
        <h3>Route</h3>
        <svg className="route-svg" viewBox="0 0 320 160" role="img" aria-label="Route with stops">
          <polyline
            fill="none"
            stroke="#111614"
            strokeWidth="3"
            points={stops.map((stop) => {
              const x = 20 + ((stop.lng - minX) / spanX) * 280;
              const y = 140 - ((stop.lat - minY) / spanY) * 120;
              return `${x},${y}`;
            }).join(" ")}
          />
          {stops.map((stop) => {
            const x = 20 + ((stop.lng - minX) / spanX) * 280;
            const y = 140 - ((stop.lat - minY) / spanY) * 120;
            const fill = stop.kind === "pickup" ? "#1FA463" : stop.kind === "dropoff" ? "#C2453A" : "#D08A1E";
            return <circle key={stop.label + stop.kind} cx={x} cy={y} r="6" fill={fill} />;
          })}
        </svg>
        <ol data-testid="trip-stops">
          {stops.map((stop) => (
            <li key={`${stop.kind}-${stop.label}`}>{stop.kind === "pickup" ? "Pickup" : stop.kind === "dropoff" ? "Drop-off" : "Stop"} · {stop.label}</li>
          ))}
        </ol>
      </article>
      <article className="panel" id="fare" data-testid="trip-fare">
        <h3>Fare · rule {fare.ruleVersion}</h3>
        <ul className="version-list">
          <li>Pickup {formatOre(fare.pickupOre)}</li>
          <li>{fare.km} km × {formatOre(fare.perKmOre)}</li>
          <li>{fare.minutes} min × {formatOre(fare.perMinOre)}</li>
          <li>Waiting time charged: {fare.waitingMin} min · {formatOre(fare.waitingOre)}</li>
          <li>{fare.appliedMin ? `Minimum ${formatOre(fare.minimumOre)} applied` : "Minimum not applied"}</li>
          <li>Charged {formatOre(fare.chargedOre)}</li>
        </ul>
      </article>
      <article className="panel" id="waybill" data-testid="trip-waybill">
        <h3>Waybill</h3>
        <dl className="waybill">
          {Object.entries({
            "Trip": sheet.tripId,
            "Status": sheet.status,
            "Issued at": sheet.issuedAt,
            "Fare": sheet.fare,
            "Service": sheet.service,
            "Rider": sheet.riderName,
            "Pickup": sheet.pickup,
            "Drop-off": sheet.dropoff,
            "Source": sheet.source,
            "Driver": sheet.driverName,
            "Vehicle": sheet.vehicle,
            "Licence plate": sheet.plate,
            "Passenger capacity": sheet.seats,
          }).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </article>
      <article className="panel" id="actions" data-testid="trip-actions">
        <h3>Actions</h3>
        <p data-testid="cancel-block">{cancelWhy ?? "Cancel is allowed in this state."}</p>
        {cancelWhy ? (
          <button data-command="admin.trip.cancel" className="secondary-btn" type="button" disabled title={cancelWhy}>Cancel trip</button>
        ) : (
          <CommandButton
            command="admin.trip.cancel"
            className="secondary-btn"
            targetId={trip.id}
            collection="trips"
            before={trip.status}
            after="cancelled_by_admin"
            patch={{ status: "cancelled_by_admin" }}
            storeReason
          >
            Cancel trip
          </CommandButton>
        )}
        <p data-testid="reassign-block">{reassignWhy ?? "Reassign is allowed in this state."}</p>
        <label>
          Eligible driver
          <select aria-label="Eligible driver" value={chosen} onChange={(event) => setDriverId(event.target.value)} disabled={!!reassignWhy}>
            {eligible.length === 0 ? <option value="">No eligible driver</option> : null}
            {eligible.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.id}</option>
            ))}
          </select>
        </label>
        {reassignWhy ? (
          <button data-command="admin.trip.reassign" className="secondary-btn" type="button" disabled title={reassignWhy}>Reassign</button>
        ) : (
          <CommandButton
            command="admin.trip.reassign"
            className="secondary-btn"
            targetId={trip.id}
            collection="trips"
            before={trip.driverId ?? "none"}
            after={chosen}
            patch={{ driverId: chosen, status: "accepted" }}
          >
            Reassign
          </CommandButton>
        )}
        <p data-testid="adjust-block">{adjustWhy ?? "Fare can still be adjusted, up to 15%."}</p>
        {adjustWhy ? (
          <button data-command="admin.trip.adjust" className="secondary-btn" type="button" disabled title={adjustWhy}>Adjust +10%</button>
        ) : (
          <CommandButton
            command="admin.trip.adjust"
            className="secondary-btn"
            targetId={trip.id}
            collection="trips"
            before={formatOre(trip.fareOre ?? 0)}
            after={formatOre(Math.round((trip.fareOre ?? 0) * 1.1))}
            patch={{ fareOre: Math.round((trip.fareOre ?? 0) * 1.1) }}
          >
            Adjust +10%
          </CommandButton>
        )}
        <p data-testid="refund-block">{refundWhy ?? "Refund is allowed. The captured payment can be returned."}</p>
        {refundWhy ? (
          <button data-command="admin.trip.refund" className="secondary-btn" type="button" disabled title={refundWhy}>Refund</button>
        ) : (
          <CommandButton
            command="admin.trip.refund"
            className="secondary-btn"
            targetId={trip.id}
            collection="trips"
            before={payment}
            after="refunded"
            patch={{ kind: "refunded" }}
            storeReason
          >
            Refund
          </CommandButton>
        )}
      </article>
    </>
  );
}
