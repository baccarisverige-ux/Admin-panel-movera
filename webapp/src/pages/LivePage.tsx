import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCommands, useDrivers, useSlice, useTrips } from "../api/hooks";
import { stockholmZones } from "../zones/releases";
import {
  defaultDispatch,
  dispatchError,
  liveMarkers,
  moveMarker,
  projectMarker,
  type DispatchRule,
  type LiveKind,
  type LiveMarker,
} from "../trips/present";
import { ZoneCanvas } from "./ZoneCanvas";

const LAYERS: { id: LiveKind | "stale"; label: string }[] = [
  { id: "driver", label: "Online drivers" },
  { id: "stale", label: "Stale positions" },
  { id: "trip", label: "Trips" },
  { id: "request", label: "Open requests" },
  { id: "queue", label: "Airport queue" },
  { id: "boost", label: "Boosts" },
];

function visible(marker: LiveMarker, layers: Record<string, boolean>): boolean {
  if (marker.kind === "driver" && marker.stale) return layers.stale;
  if (marker.kind === "driver") return layers.driver;
  return layers[marker.kind];
}

export function LivePage() {
  return (
    <>
      <LiveBoard />
      <ZoneCanvas
        zones={stockholmZones()}
        selectedId="op-norrmalm"
        mode="select"
        layers={{ drivers: true, trips: true, queue: true }}
        focus={null}
        selectionNonce={0}
        onDrawn={() => undefined}
        onEdited={() => undefined}
      />
      <DispatchEditor />
    </>
  );
}

function LiveBoard() {
  const drivers = useDrivers(null);
  const trips = useTrips(null);
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    driver: true,
    stale: true,
    trip: true,
    request: true,
    queue: true,
    boost: true,
  });

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  const markers = liveMarkers(drivers.data ?? [], trips.data ?? []).map((marker) => moveMarker(marker, tick));
  const selected = markers.find((marker) => marker.id === selectedId) ?? null;
  const online = markers.filter((marker) => marker.kind === "driver" && !marker.stale);
  const stale = markers.filter((marker) => marker.kind === "driver" && marker.stale);
  const tripMarks = markers.filter((marker) => marker.kind === "trip");
  const requests = markers.filter((marker) => marker.kind === "request");
  const queue = markers.filter((marker) => marker.kind === "queue");
  const boosts = markers.filter((marker) => marker.kind === "boost");
  const openAll = (trips.data ?? []).filter((trip) => trip.status === "requested" || trip.status === "searching").length;
  const activeAll = (trips.data ?? []).filter((trip) =>
    ["accepted", "driver_to_pickup", "arrived", "rider_onboard", "in_trip", "approaching_dropoff"].includes(trip.status),
  ).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Live map</h2>
          <p>OpenStreetMap. Positions refresh in the demo. Stale markers stay grey and show last seen.</p>
        </div>
      </div>
      <p className="state-line" data-live="counts" data-testid="live-tick" data-tick={tick}>
        Drivers {drivers.data?.length ?? 0}. Trips in the book {trips.data?.length ?? 0}. Online {online.length}. Stale {stale.length}. Trips on the map {tripMarks.length} of {activeAll} active. Open requests plotted {requests.length} of {openAll}. Airport queue {queue.length}. Boosts {boosts.length}.
      </p>
      <div className="actions" aria-label="Map layers">
        {LAYERS.map((layer) => (
          <label key={layer.id} className="check-row">
            <input
              type="checkbox"
              checked={layers[layer.id] ?? false}
              onChange={() => setLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
            />
            {layer.label}
          </label>
        ))}
      </div>
      <div className="split">
        <div className="ops-map" data-testid="live-map">
          {markers.filter((marker) => marker.onMap && visible(marker, layers)).map((marker) => {
            const point = projectMarker(marker.lat, marker.lng);
            return (
              <button
                key={marker.id}
                data-command="admin.live.focus"
                type="button"
                className={`ops-marker ${marker.kind}${marker.stale ? " stale" : ""}`}
                style={{ left: point.left, top: point.top }}
                data-lat={marker.lat.toFixed(6)}
                data-stale={marker.stale ? "yes" : "no"}
                title={marker.stale ? `${marker.name}, last seen ${marker.lastSeen}` : marker.name}
                onClick={() => setSelectedId(marker.id)}
              >
                <span className="sr-only">{marker.name}</span>
              </button>
            );
          })}
        </div>
        <aside className="panel" data-testid="live-panel">
          <h3>Selected</h3>
          {selected ? (
            <>
              <p><strong>{selected.name}</strong></p>
              <p>{selected.stale ? `Last seen ${selected.lastSeen}` : "Live position"}</p>
              <p>{selected.kind} · {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</p>
              <Link to={selected.href}>Open page</Link>
            </>
          ) : (
            <p>Choose a driver, trip, request, queue or boost.</p>
          )}
        </aside>
      </div>
      <div className="split">
        <article className="panel">
          <h3>Drivers</h3>
          <ul aria-label="Live drivers">
            {[...online, ...stale].map((marker) => (
              <li key={marker.id}>
                <button data-command="admin.live.focus" className="link-action" type="button" onClick={() => setSelectedId(marker.id)}>
                  {marker.name} · {marker.stale ? `Stale · last seen ${marker.lastSeen}` : "Live"}
                </button>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h3>Airport queue and boosts</h3>
          <ul aria-label="Airport queue">
            {queue.map((marker) => (
              <li key={marker.id}>
                <button data-command="admin.live.focus" className="link-action" type="button" onClick={() => setSelectedId(marker.id)}>{marker.name}</button>
              </li>
            ))}
          </ul>
          <ul aria-label="Boosts">
            {boosts.map((marker) => (
              <li key={marker.id}>
                <button data-command="admin.live.focus" className="link-action" type="button" onClick={() => setSelectedId(marker.id)}>{marker.name}</button>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </>
  );
}

function DispatchEditor() {
  const book = useSlice<DispatchRule[]>("dispatch", defaultDispatch());
  const commands = useCommands();
  const [draft, setDraft] = useState<DispatchRule[] | null>(null);
  const shown = draft ?? (Array.isArray(book.value) && book.value.length > 0 ? book.value : defaultDispatch());
  const error = shown.map(dispatchError).find(Boolean) ?? null;

  function update(zoneId: string, patch: Partial<DispatchRule>) {
    setDraft(shown.map((rule) => (rule.zoneId === zoneId ? { ...rule, ...patch } : rule)));
  }

  return (
    <article className="panel" data-testid="dispatch-rules">
      <h3>Dispatch rules per zone</h3>
      <p>Offer time is 8.5 seconds and the next-trip radius is 30 km. Other numbers are today's values.</p>
      {shown.map((rule) => (
        <fieldset key={rule.zoneId} className="dispatch-zone">
          <legend>{rule.zoneName}</legend>
          <div className="field-grid">
            <label>
              Offer time (s)
              <input aria-label={`${rule.zoneName} offer time`} type="number" step="0.5" value={rule.offerSeconds} onChange={(event) => update(rule.zoneId, { offerSeconds: Number(event.target.value) })} />
            </label>
            <label>
              Search radius (km) <span className="badge-amber">To confirm</span>
              <input aria-label={`${rule.zoneName} search radius`} type="number" step="1" value={rule.searchRadiusKm} onChange={(event) => update(rule.zoneId, { searchRadiusKm: Number(event.target.value) })} />
            </label>
            <label>
              Next-trip radius (km)
              <input aria-label={`${rule.zoneName} next-trip radius`} type="number" step="1" value={rule.nextTripKm} onChange={(event) => update(rule.zoneId, { nextTripKm: Number(event.target.value) })} />
            </label>
            <label>
              Max wait (min) <span className="badge-amber">To confirm</span>
              <input aria-label={`${rule.zoneName} max wait`} type="number" step="1" value={rule.maxWaitMin} onChange={(event) => update(rule.zoneId, { maxWaitMin: Number(event.target.value) })} />
            </label>
            <label>
              Cancellation rate (%) <span className="badge-amber">To confirm</span>
              <input aria-label={`${rule.zoneName} cancellation rate`} type="number" step="1" value={rule.cancelRatePct} onChange={(event) => update(rule.zoneId, { cancelRatePct: Number(event.target.value) })} />
            </label>
            <label className="check-row">
              <input aria-label={`${rule.zoneName} destination mode`} type="checkbox" checked={rule.destinationMode} onChange={(event) => update(rule.zoneId, { destinationMode: event.target.checked })} />
              Destination mode <span className="badge-amber">To confirm</span>
            </label>
          </div>
        </fieldset>
      ))}
      {error ? <p className="state-line">{error}</p> : null}
      <button
        data-command="admin.dispatch.save"
        className="primary-btn"
        type="button"
        disabled={!!error || commands.phase === "submitting"}
        onClick={() => {
          void commands.run("admin.dispatch.save", {
            reason: "Safety review",
            targetId: "dispatch",
            before: "previous dispatch",
            after: shown.map((rule) => `${rule.zoneId} offer ${rule.offerSeconds}s radius ${rule.searchRadiusKm}km next ${rule.nextTripKm}km`).join("; "),
            sliceKey: "dispatch",
            value: shown,
          });
        }}
      >
        Save dispatch rules
      </button>
      {commands.message ? <p className="state-line">{commands.message}</p> : null}
    </article>
  );
}
