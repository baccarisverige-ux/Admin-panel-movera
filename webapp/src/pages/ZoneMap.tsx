import { useState } from "react";
import { Link } from "react-router";
import { useSession } from "../auth/SessionContext";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import {
  validateZones,
  zoneImpact,
  zoneTypeLabel,
  zonesAt,
  zonesToGeoJSON,
  ZONE_COLOR,
  ZONE_TYPES,
} from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";
import { mapProviderLabel, ZoneCanvas } from "./ZoneCanvas";

function formatImpact(impact: ReturnType<typeof zoneImpact>): string {
  const delta = `${impact.deltaKm >= 0 ? "+" : ""}${impact.deltaKm.toFixed(1)}`;
  const fees = impact.feeChanges.length > 0 ? impact.feeChanges.join(", ") : "No price changes.";
  return `Impact: ${impact.areaKm.toFixed(1)} km² (change ${delta}). Online drivers inside: ${impact.drivers}. Active trips: ${impact.trips}. Future reservations: ${impact.reservations}. ${fees}`;
}

export function ZoneMap() {
  const { agent } = useSession();
  const ui = useZoneUi();
  const [probe, setProbe] = useState("59.334, 18.063");
  const [address, setAddress] = useState("Östermalm");
  const selected = ui.book.draft.find((zone) => zone.id === ui.selectedId);
  const issues = validateZones(ui.book.draft);
  const impact = zoneImpact(ui.book.published, ui.book.draft);
  const holes = ui.book.draft.reduce((sum, zone) => sum + zone.holes.length, 0);
  const pickups = ui.book.draft.reduce((sum, zone) => sum + zone.pickups.length, 0);
  const hits = (() => {
    const [latRaw, lngRaw] = probe.split(",");
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return zonesAt(ui.book.draft, lat, lng);
  })();

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
      </div>
      <div className="actions">
        <label>
          Address
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <CommandButton command="admin.zone.search" className="secondary-btn" type="button" onDone={() => zoneStore.search(address)}>Search address</CommandButton>
        <label className="check-row">
          <input type="checkbox" checked={ui.layers.drivers} onChange={() => zoneStore.toggleLayer("drivers")} />
          Online drivers
        </label>
        <label className="check-row">
          <input type="checkbox" checked={ui.layers.trips} onChange={() => zoneStore.toggleLayer("trips")} />
          Trips
        </label>
        <label className="check-row">
          <input type="checkbox" checked={ui.layers.queue} onChange={() => zoneStore.toggleLayer("queue")} />
          Airport queue
        </label>
      </div>
      <div className="actions">
        <CommandButton command="admin.zone.review" className="secondary-btn" type="button" onDone={() => { if (agent) zoneStore.review(agent.id); }}>Send for review</CommandButton>
        <CommandButton command="admin.zone.publish" className="primary-btn" type="button" onDone={() => { if (agent) zoneStore.publish(agent.id); }}>Publish</CommandButton>
        <CommandButton command="admin.zone.rollback" className="secondary-btn" type="button" onDone={() => zoneStore.rollback()}>Roll back</CommandButton>
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
