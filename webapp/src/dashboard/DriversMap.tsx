import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { X } from "lucide-react";
import type { Market } from "../markets/markets";
import { zoneById } from "../markets/markets";
import { LIVE_STATES, type LiveDriver, type LiveState } from "./live";

const STYLE = {
  version: 8 as const,
  sources: {
    base: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "base", type: "raster" as const, source: "base" }],
};

export const STATE_COLOR: Record<LiveState, string> = {
  free: "#0ca30c",
  pickup: "#eda100",
  trip: "#2a78d6",
  stale: "#898781",
  sos: "#d03b3b",
};

type Props = {
  drivers: LiveDriver[];
  market: Market;
  zones: string[];
  hidden: Set<LiveState>;
  withScope: (path: string) => string;
};

function geo(drivers: LiveDriver[], hidden: Set<LiveState>) {
  return {
    type: "FeatureCollection" as const,
    features: drivers
      .filter((driver) => !hidden.has(driver.state))
      .map((driver) => ({
        type: "Feature" as const,
        properties: { id: driver.id, state: driver.state, color: STATE_COLOR[driver.state] },
        geometry: { type: "Point" as const, coordinates: [driver.lng, driver.lat] },
      })),
  };
}

/** Live drivers on a MapLibre map, coloured by state; click a driver for details. */
export function DriversMap({ drivers, market, zones, hidden, withScope }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ drivers, hidden });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  latest.current = { drivers, hidden };

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: node, style: STYLE, center: [market.center[1], market.center[0]], zoom: market.zoom, attributionControl: { compact: true } });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("drivers", { type: "geojson", data: geo(latest.current.drivers, latest.current.hidden) });
      map.addLayer({
        id: "sos-halo",
        type: "circle",
        source: "drivers",
        filter: ["==", ["get", "state"], "sos"],
        paint: { "circle-radius": 16, "circle-color": STATE_COLOR.sos, "circle-opacity": 0.22 },
      });
      map.addLayer({
        id: "drivers",
        type: "circle",
        source: "drivers",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 13, 7],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.on("click", "drivers", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") setSelectedId(id);
      });
      map.on("mouseenter", "drivers", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "drivers", () => { map.getCanvas().style.cursor = ""; });
      setReady(true);
    });
    map.on("error", () => undefined);
    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [market]);

  useEffect(() => {
    const source = mapRef.current?.getSource("drivers") as GeoJSONSource | undefined;
    if (ready && source) source.setData(geo(drivers, hidden));
  }, [drivers, hidden, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const centers = zones.map((id) => zoneById(id)?.center).filter((center): center is [number, number] => Boolean(center));
    if (!zones.length || !centers.length) {
      map.easeTo({ center: [market.center[1], market.center[0]], zoom: market.zoom, duration: 600 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const [lat, lng] of centers) bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 70, maxZoom: 13.5, duration: 600 });
  }, [zones, market, ready]);

  const selected = drivers.find((driver) => driver.id === selectedId) ?? null;

  if (failed) {
    return (
      <div className="map-fallback">
        <p>The map needs WebGL, which this browser has turned off. Drivers online:</p>
        <ul>{drivers.slice(0, 12).map((driver) => <li key={driver.id}>{driver.name} · {driver.zoneName} · {LIVE_STATES.find((state) => state.id === driver.state)?.label}</li>)}</ul>
      </div>
    );
  }

  return (
    <div className="drivers-map">
      <div ref={host} className="drivers-map-canvas" data-testid="dashboard-map" />
      {selected ? (
        <div className="map-popup" role="dialog" aria-label={`Driver ${selected.name}`}>
          <button data-command="admin.ui.mapClose" type="button" className="map-popup-close" aria-label="Close" onClick={() => setSelectedId(null)}><X size={14} /></button>
          <strong>{selected.name}</strong>
          <span className="map-popup-state"><i style={{ background: STATE_COLOR[selected.state] }} />{LIVE_STATES.find((state) => state.id === selected.state)?.label}</span>
          <dl>
            <dt>Zone</dt><dd>{selected.zoneName}</dd>
            {selected.vehicle ? <><dt>Vehicle</dt><dd>{selected.vehicle}{selected.plate ? ` · ${selected.plate}` : ""}</dd></> : null}
            <dt>Last update</dt><dd>{selected.lastSeenMin ? `${selected.lastSeenMin} min ago` : "Just now"}</dd>
            {selected.tripId ? <><dt>Trip</dt><dd>{selected.tripId}</dd></> : null}
          </dl>
          <div className="map-popup-actions">
            <Link className="dash-btn small" to={withScope(`/drivers/${selected.id}`)}>Open driver</Link>
            {selected.tripId ? <Link className="dash-btn small ghost" to={withScope(`/trips/${selected.tripId}`)}>Open trip</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
