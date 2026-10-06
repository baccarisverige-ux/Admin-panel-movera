import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useCommands, useDrivers, useRecords, useSlice, useTrips } from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import {
  emptyDispatchBook,
  normalizeDispatchBook,
  restoreDispatchVersion,
  saveDispatchBook,
  type DispatchBook,
} from "../trips/dispatch";
import {
  dispatchError,
  liveMarkers,
  moveMarker,
  offerBlock,
  offersFor,
  projectMarker,
  type DispatchRule,
  type LiveKind,
  type LiveMarker,
} from "../trips/present";
import { CommandButton } from "../ui/CommandButton";
import { stockholmZones } from "../zones/releases";
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
        layers={{ drivers: true, trips: true, requests: true, demandHour: false, demand7d: false, pickups: true, queue: true, boosts: true, events: true }}
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
  const vehicles = useRecords("vehicles", null);
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offerDriverId, setOfferDriverId] = useState("");
  const [notice, setNotice] = useState("");
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
  const selectedTripId = selected?.kind === "request"
    ? selected.id.replace(/^req-/, "")
    : selected?.kind === "trip"
      ? selected.id
      : null;
  const selectedTrip = selectedTripId ? (trips.data ?? []).find((trip) => trip.id === selectedTripId) ?? null : null;
  const candidates = useMemo(
    () => selectedTrip ? offersFor(selectedTrip, drivers.data ?? [], vehicles.data ?? []) : [],
    [drivers.data, selectedTrip, vehicles.data],
  );
  const chosen = candidates.some((item) => item.id === offerDriverId) ? offerDriverId : candidates[0]?.id ?? "";
  const selectedOfferWhy = selectedTrip
    ? offerBlock(selectedTrip.status) ?? (candidates.length === 0 ? "No eligible driver with a matching eligible vehicle is available." : null)
    : "Select an open request.";

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
          <p>OpenStreetMap. Positions refresh in the demo. Stale markers stay grey and cannot be selected as dispatch candidates.</p>
        </div>
      </div>

      <p className="state-line" data-live="counts" data-testid="live-tick" data-tick={tick}>
        Drivers {drivers.data?.length ?? 0}. Trips in the book {trips.data?.length ?? 0}. Online {online.length}. Stale {stale.length}. Trips on the map {tripMarks.length} of {activeAll} active. Open requests plotted {requests.length} of {openAll}. Airport queue {queue.length}. Boosts {boosts.length}.
        {notice ? ` ${notice}` : ""}
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
                onClick={() => {
                  setSelectedId(marker.id);
                  setOfferDriverId("");
                }}
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

              {selected.kind === "request" && selectedTrip ? (
                <div data-testid="quick-dispatch">
                  <h4>Quick dispatch</h4>
                  <p>{selectedOfferWhy ?? `${candidates.length} eligible drivers with eligible matching vehicles.`}</p>
                  <label>
                    Driver
                    <select
                      aria-label="Quick dispatch driver"
                      value={chosen}
                      disabled={Boolean(selectedOfferWhy)}
                      onChange={(event) => setOfferDriverId(event.target.value)}
                    >
                      {candidates.length === 0 ? <option value="">No eligible driver</option> : null}
                      {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>)}
                    </select>
                  </label>
                  <CommandButton
                    command="admin.trip.offer"
                    className="primary-btn"
                    type="button"
                    targetId={selectedTrip.id}
                    confirmTarget={false}
                    entityState={selectedTrip.status}
                    scope={selectedTrip.zoneId}
                    collection="trips"
                    before={selectedTrip.status}
                    after={`offered to ${chosen}`}
                    patch={{ driverId: chosen, status: "offered" }}
                    disabled={Boolean(selectedOfferWhy)}
                    title={selectedOfferWhy ?? undefined}
                    onDone={() => {
                      setNotice(`${selectedTrip.id} offered to ${chosen}.`);
                      setSelectedId(null);
                      setOfferDriverId("");
                    }}
                  >
                    Offer request
                  </CommandButton>
                </div>
              ) : null}
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
                <button
                  data-command="admin.live.focus"
                  className="link-action"
                  type="button"
                  onClick={() => {
                    setSelectedId(marker.id);
                    setOfferDriverId("");
                  }}
                >
                  {marker.name} · {marker.stale ? `Stale · last seen ${marker.lastSeen}` : "Live"}
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Open requests, airport queue and boosts</h3>
          <ul aria-label="Open requests">
            {requests.map((marker) => (
              <li key={marker.id}>
                <button
                  data-command="admin.live.focus"
                  className="link-action"
                  type="button"
                  onClick={() => {
                    setSelectedId(marker.id);
                    setOfferDriverId("");
                  }}
                >
                  {marker.name}
                </button>
              </li>
            ))}
          </ul>
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
  const { agent } = useSession();
  const commands = useCommands();
  const store = useSlice<DispatchBook | DispatchRule[]>("dispatch", emptyDispatchBook());
  const persisted = normalizeDispatchBook(store.value);
  const [draft, setDraft] = useState<DispatchRule[] | null>(null);
  const shown = draft ?? persisted.rules;
  const error = shown.map(dispatchError).find(Boolean) ?? null;
  const dirty = JSON.stringify(shown) !== JSON.stringify(persisted.rules);
  const canIntervene = Boolean(agent && can(agent.role, "trips.intervene"));
  const allZoneScope = Boolean(canIntervene && agent?.scope.zones === "all");

  function canEdit(zoneId: string): boolean {
    return Boolean(canIntervene && agent && (agent.scope.zones === "all" || agent.scope.zones.includes(zoneId)));
  }

  function update(zoneId: string, patch: Partial<DispatchRule>) {
    if (!canEdit(zoneId)) return;
    setDraft(shown.map((rule) => (rule.zoneId === zoneId ? { ...rule, ...patch } : rule)));
  }

  const saveAll = agent ? saveDispatchBook(persisted, shown, agent.id, new Date().toISOString()) : { book: persisted, error: "Sign in again." };

  return (
    <article className="panel" data-testid="dispatch-rules">
      <h3>Dispatch rules per zone</h3>
      <p>
        Revision {persisted.draftRev}. Offer time defaults to 8.5 seconds and next-trip radius to 30 km.
        {!canIntervene ? " Your role is read-only for dispatch." : allZoneScope ? " Your scope can publish all zones." : " Your scope can save only the zones assigned to you."}
      </p>
      <p className="state-line">
        {dirty ? "Unsaved dispatch changes." : "Dispatch rules are saved."} {store.message}
      </p>

      {shown.map((rule) => {
        const editable = canEdit(rule.zoneId);
        const persistedRule = persisted.rules.find((item) => item.zoneId === rule.zoneId) ?? rule;
        const zoneDirty = JSON.stringify(rule) !== JSON.stringify(persistedRule);
        const oneZoneRules = persisted.rules.map((item) => item.zoneId === rule.zoneId ? rule : item);
        const zoneSave = agent ? saveDispatchBook(persisted, oneZoneRules, agent.id, new Date().toISOString()) : { book: persisted, error: "Sign in again." };
        const zoneError = dispatchError(rule);

        return (
          <fieldset key={rule.zoneId} className="dispatch-zone" disabled={!editable}>
            <legend>{rule.zoneName} {!editable ? "· read only" : ""}</legend>
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

            {!allZoneScope && editable ? (
              <CommandButton
                command="admin.dispatch.save"
                className="secondary-btn"
                type="button"
                targetId={`dispatch-${rule.zoneId}`}
                confirmTarget={false}
                scope={rule.zoneId}
                before={`dispatch rev ${persisted.draftRev}`}
                after={`${rule.zoneId} rev ${zoneSave.book.draftRev}`}
                expectedSliceRev={persisted.draftRev}
                sliceKey="dispatch"
                value={zoneSave.book}
                disabled={!zoneDirty || Boolean(zoneError)}
                title={zoneError ?? (!zoneDirty ? "No unsaved change in this zone." : undefined)}
                onDone={() => setDraft(null)}
              >
                Save {rule.zoneName}
              </CommandButton>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p className="state-line">{error}</p> : null}
      {commands.message ? <p className="state-line">{commands.message}</p> : null}

      {allZoneScope ? (
        <div className="actions">
          <button
            data-command="admin.dispatch.save"
            className="primary-btn"
            type="button"
            disabled={!dirty || Boolean(error) || commands.busy || commands.phase === "submitting"}
            title={error ?? (!dirty ? "No unsaved dispatch changes." : undefined)}
            onClick={() => {
              void commands.run("admin.dispatch.save", {
                reason: "Safety review",
                targetId: "dispatch",
                scope: "all",
                before: `dispatch rev ${persisted.draftRev}`,
                after: `dispatch rev ${saveAll.book.draftRev}`,
                expectedSliceRev: persisted.draftRev,
                sliceKey: "dispatch",
                value: saveAll.book,
              }).then((result) => {
                if (result) setDraft(null);
              });
            }}
          >
            Save dispatch rules
          </button>
          <button
            data-command="admin.card.action"
            className="secondary-btn"
            type="button"
            disabled={!dirty}
            onClick={() => setDraft(null)}
          >
            Discard unsaved
          </button>
        </div>
      ) : null}

      <h4>Dispatch history</h4>
      {persisted.history.length === 0 ? (
        <p className="state-line">No dispatch version has been saved yet.</p>
      ) : (
        <ol className="version-list" aria-label="Dispatch history">
          {persisted.history.map((version) => {
            const restore = agent ? restoreDispatchVersion(persisted, version.rev, agent.id, new Date().toISOString()) : { book: persisted, error: "Sign in again." };
            return (
              <li key={version.rev}>
                Revision {version.rev} · {version.at} · {version.actorId}
                {allZoneScope ? (
                  <CommandButton
                    command="admin.dispatch.restore"
                    className="link-action"
                    type="button"
                    targetId="dispatch"
                    confirmTarget={false}
                    scope="all"
                    before={`dispatch rev ${persisted.draftRev}`}
                    after={`restore rev ${version.rev} as ${restore.book.draftRev}`}
                    expectedSliceRev={persisted.draftRev}
                    sliceKey="dispatch"
                    value={restore.book}
                    disabled={Boolean(restore.error)}
                    title={restore.error}
                    onDone={() => setDraft(null)}
                  >
                    restore
                  </CommandButton>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
