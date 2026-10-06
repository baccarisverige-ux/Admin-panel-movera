import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useSession } from "../auth/SessionContext";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import {
  effectiveZonesAt,
  priorityZones,
  validateZones,
  zoneImpact,
  zoneRuleSummary,
  zoneTypeLabel,
  zonesToGeoJSON,
  ZONE_COLOR,
  ZONE_TYPES,
} from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";
import { mapProviderLabel, ZoneCanvas } from "./ZoneCanvas";

function formatImpact(impact: ReturnType<typeof zoneImpact>): string {
  const delta = `${impact.deltaKm >= 0 ? "+" : ""}${impact.deltaKm.toFixed(1)}`;
  const fees = impact.feeChanges.length > 0 ? impact.feeChanges.join(", ") : "No price changes.";
  return `Greater Stockholm: ${impact.areaKm.toFixed(0)} km² (change ${delta}). Online drivers inside: ${impact.drivers}. Active trips: ${impact.trips}. Future reservations: ${impact.reservations}. ${fees}`;
}

export function ZoneMap() {
  const { agent } = useSession();
  const ui = useZoneUi();
  const [probe, setProbe] = useState("59.334, 18.063");
  const [address, setAddress] = useState("Östermalm");
  const [mergeSource, setMergeSource] = useState("");
  const [dragPriorityId, setDragPriorityId] = useState("");
  const selected = ui.book.draft.find((zone) => zone.id === ui.selectedId);
  const issues = validateZones(ui.book.draft);
  const impact = zoneImpact(ui.book.published, ui.book.draft);
  const holes = ui.book.draft.reduce((sum, zone) => sum + zone.holes.length, 0);
  const pickups = ui.book.draft.reduce((sum, zone) => sum + zone.pickups.length, 0);
  const priorities = priorityZones(ui.book.draft);
  const mergeOptions = ui.book.draft.filter((zone) => !zone.archived && zone.id !== ui.selectedId && zone.kind === selected?.kind);
  const hits = (() => {
    const [latRaw, lngRaw] = probe.split(",");
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return effectiveZonesAt(ui.book.draft, lat, lng);
  })();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      zoneStore.cancelTool();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function movePriority(sourceId: string, targetId: string) {
    if (!agent || sourceId === targetId) return;
    const ids = priorities.map((zone) => zone.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    zoneStore.reorderPriority(ids, agent.id);
  }

  return (
    <article className="panel">
      <div className="panel-title-row">
        <h3>Stockholm zones</h3>
      </div>
      <p className="state-line" data-impact="zones">{formatImpact(impact)}</p>
      <ol className="version-list" aria-label="Versions">
        {ui.book.versions.map((version, index) => (
          <li key={index}>Version {index + 1} · {version.length} zones</li>
        ))}
      </ol>
      <div className="actions">
        <CommandButton command="admin.zone.drawPolygon" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("polygon")}>Draw polygon</CommandButton>
        <CommandButton command="admin.zone.drawRectangle" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("rectangle")}>Draw rectangle</CommandButton>
        <CommandButton command="admin.zone.drawCircle" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("circle")}>Draw circle</CommandButton>
        <CommandButton command="admin.zone.drawFreehand" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("freehand")}>Freehand</CommandButton>
        <CommandButton command="admin.zone.drawPoint" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("point")}>Place pickup point</CommandButton>
        <CommandButton command="admin.zone.editPoints" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("select")}>Edit points</CommandButton>
        <CommandButton command="admin.zone.cutHole" className="secondary-btn" type="button" onDone={() => zoneStore.setTool("hole")}>Cut hole</CommandButton>
        <CommandButton command="admin.zone.undo" className="secondary-btn" type="button" disabled={ui.past.length === 0} onDone={() => zoneStore.undo()}>Undo</CommandButton>
        <CommandButton command="admin.zone.redo" className="secondary-btn" type="button" disabled={ui.future.length === 0} onDone={() => zoneStore.redo()}>Redo</CommandButton>
        <CommandButton command="admin.zone.export" className="secondary-btn" type="button" onDone={() => {
          const blob = new Blob([JSON.stringify(zonesToGeoJSON(ui.book.draft), null, 2)], { type: "application/geo+json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "stockholm-zones.geojson";
          link.click();
          URL.revokeObjectURL(url);
        }}>Export GeoJSON</CommandButton>
        <CommandButton command="admin.zone.import" className="secondary-btn" type="button" onDone={() => document.getElementById("zone-import")?.click()}>Import GeoJSON</CommandButton>
        <input id="zone-import" hidden type="file" accept="application/geo+json,application/json,.geojson,.json" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !agent) return;
          void file.text().then((raw) => zoneStore.importGeo(raw, agent.id));
        }} />
        <CommandButton command="admin.zone.importKml" className="secondary-btn" type="button" onDone={() => document.getElementById("zone-kml-import")?.click()}>Import KML</CommandButton>
        <input id="zone-kml-import" hidden type="file" accept=".kml,application/vnd.google-earth.kml+xml,application/xml,text/xml" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !agent) return;
          void file.text().then((raw) => zoneStore.importKml(raw, agent.id));
        }} />
      </div>
      <div className="actions">
        <label>
          Address
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <CommandButton command="admin.zone.search" className="secondary-btn" type="button" onDone={() => zoneStore.search(address)}>Search address</CommandButton>
        <label className="check-row"><input type="checkbox" checked={ui.layers.drivers} onChange={() => zoneStore.toggleLayer("drivers")} />Online drivers</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.trips} onChange={() => zoneStore.toggleLayer("trips")} />Drivers on trip</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.requests} onChange={() => zoneStore.toggleLayer("requests")} />Open requests</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.demandHour} onChange={() => zoneStore.toggleLayer("demandHour")} />Demand heatmap · last hour</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.demand7d} onChange={() => zoneStore.toggleLayer("demand7d")} />Demand heatmap · 7 days</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.pickups} onChange={() => zoneStore.toggleLayer("pickups")} />Pickup points</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.queue} onChange={() => zoneStore.toggleLayer("queue")} />Airport queues</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.boosts} onChange={() => zoneStore.toggleLayer("boosts")} />Boosts</label>
        <label className="check-row"><input type="checkbox" checked={ui.layers.events} onChange={() => zoneStore.toggleLayer("events")} />Events</label>
      </div>
      <div className="actions">
        <CommandButton command="admin.zone.review" className="secondary-btn" type="button" onDone={() => { if (agent) zoneStore.review(agent.id); }}>Send for review</CommandButton>
        <CommandButton command="admin.zone.publish" className="primary-btn" type="button" onDone={() => { if (agent) zoneStore.publish(agent.id); }}>Publish</CommandButton>
        <CommandButton command="admin.zone.rollback" className="secondary-btn" type="button" onDone={() => zoneStore.rollback(agent?.id)}>Roll back</CommandButton>
      </div>
      <p className="state-line">
        {ui.notice} Map: {mapProviderLabel()}. Drawing: Terra Draw. Status: {ui.book.status === "in_review" ? "in review" : "draft"}. Versions: {ui.book.versions.length}.
      </p>
      <p className="state-line" data-holes={holes} data-pickups={pickups}>Open holes: {holes}. Pickups: {pickups}.</p>
      <label htmlFor="zone-picker">
        Zone
        <select id="zone-picker" aria-label="Zone" value={ui.selectedId} onChange={(event) => zoneStore.select(event.target.value)}>
          {ui.book.draft.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name} · {zoneTypeLabel(zone.kind)}</option>
          ))}
        </select>
      </label>
      <p className="state-line">
        Selected: {selected?.name} ({selected ? zoneTypeLabel(selected.kind) : "none"}).
        {selected ? <> <Link to={`/zones/${selected.id}`}>Open {selected.name}</Link></> : null}
      </p>
      <div className="actions">
        <CommandButton
          command="admin.zone.rotate"
          className="secondary-btn"
          type="button"
          disabled={!selected || selected.kind === "pickup"}
          onDone={() => { if (agent && selected) zoneStore.rotate(selected.id, 15, agent.id); }}
        >
          Rotate +15°
        </CommandButton>
        <CommandButton
          command="admin.zone.split"
          className="secondary-btn"
          type="button"
          disabled={!selected || selected.kind === "pickup"}
          onDone={() => { if (agent && selected) zoneStore.split(selected.id, agent.id); }}
        >
          Split selected
        </CommandButton>
        <label>
          Merge source
          <select value={mergeSource} onChange={(event) => setMergeSource(event.target.value)}>
            <option value="">Choose zone</option>
            {mergeOptions.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <CommandButton
          command="admin.zone.merge"
          className="secondary-btn"
          type="button"
          disabled={!selected || !mergeSource}
          onDone={() => {
            if (!agent || !selected || !mergeSource) return;
            zoneStore.merge(selected.id, mergeSource, agent.id);
            setMergeSource("");
          }}
        >
          Merge into selected
        </CommandButton>
      </div>
      <article className="subpanel">
        <h4>Overlap priority</h4>
        <p className="state-line">Drag higher-priority rule zones above lower-priority ones. Operating zones still cannot overlap.</p>
        <ol className="version-list" aria-label="Zone overlap priority">
          {priorities.map((zone) => (
            <li
              key={zone.id}
              draggable
              onDragStart={() => setDragPriorityId(zone.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                movePriority(dragPriorityId, zone.id);
                setDragPriorityId("");
              }}
            >
              <span aria-label={`Priority ${zone.name}`}>☰ {zone.name} · {zoneTypeLabel(zone.kind)} · priority {zone.priority}</span>
            </li>
          ))}
        </ol>
      </article>
      {issues.length > 0 ? (
        <ul className="demo-agents">
          {issues.map((issue) => (
            <li key={`${issue.zoneId}-${issue.message}`}>{issue.level === "error" ? "Block" : "Check"}: {issue.message}</li>
          ))}
        </ul>
      ) : <p className="state-line">Validation: no blocking errors.</p>}
      <label>
        Test a point (lat, lng)
        <input value={probe} onChange={(event) => setProbe(event.target.value)} />
      </label>
      <p className="state-line">
        {hits.length === 0 ? "That point is in no zone." : `Inside: ${hits.map((zone) => `${zone.name} (${zoneTypeLabel(zone.kind)})`).join(", ")}.`}
      </p>
      {hits.length > 0 ? (
        <ol className="version-list" aria-label="Effective zone rules">
          {hits.map((zone) => (
            <li key={zone.id}><strong>{zone.name}</strong> · {zoneRuleSummary(zone)}</li>
          ))}
        </ol>
      ) : null}
      <ZoneCanvas
        zones={ui.book.draft}
        selectedId={ui.selectedId}
        mode={ui.tool}
        layers={ui.layers}
        focus={ui.focus}
        selectionNonce={ui.selectionNonce}
        onDrawn={(points, intent) => {
          if (!agent) return;
          if (intent === "hole") zoneStore.cut(ui.selectedId, points, agent.id);
          else if (intent === "point") zoneStore.place(ui.selectedId, points, agent.id);
          else zoneStore.replace(ui.selectedId, points, agent.id);
          zoneStore.setTool("render");
        }}
        onEdited={(points) => {
          if (agent) zoneStore.edit(ui.selectedId, points, agent.id);
        }}
      />
      <ul className="zone-legend" aria-label="Zone colors">
        {ZONE_TYPES.map((type) => (
          <li key={type.id}><i className="zone-swatch" style={{ background: ZONE_COLOR[type.id] }} />{type.label}</li>
        ))}
      </ul>
    </article>
  );
}
