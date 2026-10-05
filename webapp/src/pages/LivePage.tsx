import { activityPoints, stockholmZones } from "../zones/releases";
import { ZoneCanvas } from "./ZoneCanvas";

export function LivePage() {
  const points = activityPoints();
  const drivers = points.filter((point) => point.kind === "driver");
  const online = drivers.filter((point) => point.online);
  const stale = drivers.filter((point) => !point.online);
  const trips = points.filter((point) => point.kind === "trip");
  const queue = points.filter((point) => point.kind === "queue");
  const zones = stockholmZones();

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Live map</h2>
          <p>OpenStreetMap. {online.length} online drivers, {trips.length} trips, {queue.length} airport queue markers. Stale positions are flagged.</p>
        </div>
      </div>
      <p className="state-line" data-live="counts">Online {online.length}. Trips {trips.length}. Queue {queue.length}. Stale {stale.length}.</p>
      <ul aria-label="Live drivers">
        {drivers.map((driver) => (
          <li key={driver.id}>{driver.name} · {driver.online ? "Live" : "Stale"} · {driver.lat.toFixed(3)}, {driver.lng.toFixed(3)}</li>
        ))}
      </ul>
      <ZoneCanvas
        zones={zones}
        selectedId="op-norrmalm"
        mode="select"
        layers={{ drivers: true, trips: true, queue: true }}
        focus={null}
        selectionNonce={0}
        onDrawn={() => undefined}
        onEdited={() => undefined}
      />
    </>
  );
}
