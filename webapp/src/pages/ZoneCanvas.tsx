import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TerraDraw, type GeoJSONStoreFeatures } from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { activityPoints, ZONE_COLOR, type ZoneShape } from "../zones/releases";
import { zoneDrawModes } from "../zones/drawModes";
import type { DrawTool, ZoneFocus, ZoneLayers } from "../zones/bookStore";

export type DrawMode = DrawTool;

type Ring = [number, number][];

/** Extra shapes drawn on top: the new-zone sketch, gaps, districts, the published shape, no-stop streets, the ruler. */
export type MapOverlays = {
  sketch?: Ring;
  gaps?: Ring[];
  districts?: { ring: Ring; name: string; picked: boolean }[];
  before?: Ring;
  lines?: Ring[];
  measure?: Ring;
  outline?: Ring;
  /** Driver bonus areas, drawn in orange. */
  areas?: { ring: Ring; name: string }[];
  /** A shape to fit the view to, once, when it changes. */
  fitTo?: Ring;
};

type DrawProps = {
  zones: ZoneShape[];
  selectedId: string;
  mode: DrawMode;
  layers: ZoneLayers;
  focus: ZoneFocus | null;
  selectionNonce: number;
  onDrawn: (points: [number, number][], intent: "outer" | "hole" | "point" | "line") => void;
  onEdited: (points: [number, number][]) => void;
  overlays?: MapOverlays;
  /** Zones to fit the view to; the view refits when viewKey changes (the country). */
  fitIds?: string[];
  viewKey?: string;
  onPick?: (zoneId: string) => void;
};

const INNER_IDS = ["op-bromma", "op-kungsholmen", "op-sodermalm", "op-norrmalm", "op-vasastan", "op-ostermalm"];

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap",
    },
    satellite: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery &copy; Esri",
    },
  },
  layers: [
    { id: "osm", type: "raster" as const, source: "osm" },
    { id: "satellite", type: "raster" as const, source: "satellite", layout: { visibility: "none" as const } },
  ],
};

function overlayGeo(overlays: MapOverlays | undefined, layers: ZoneLayers): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const polygonOf = (ring: Ring, kind: string, extra: Record<string, unknown> = {}) => {
    if (ring.length < 3) return;
    features.push({ type: "Feature", properties: { kind, ...extra }, geometry: { type: "Polygon", coordinates: [closedRing(ring)] } });
  };
  const lineOf = (line: Ring, kind: string) => {
    if (line.length < 2) return;
    features.push({ type: "Feature", properties: { kind }, geometry: { type: "LineString", coordinates: line.map(([lat, lng]) => [lng, lat]) } });
  };
  if (!overlays) return { type: "FeatureCollection", features };
  if (overlays.outline) lineOf([...overlays.outline, overlays.outline[0]!], "outline");
  if (layers.gaps) for (const cell of overlays.gaps ?? []) polygonOf(cell, "gap");
  if (layers.districts || overlays.districts?.some((item) => item.picked)) for (const item of overlays.districts ?? []) polygonOf(item.ring, item.picked ? "district-on" : "district", { name: item.name });
  if (layers.before && overlays.before) lineOf([...overlays.before, overlays.before[0]!], "before");
  for (const line of overlays.lines ?? []) lineOf(line, "nostop");
  for (const area of overlays.areas ?? []) polygonOf(area.ring, "bonus", { name: area.name });
  if (overlays.sketch) polygonOf(overlays.sketch, "sketch");
  if (overlays.measure) lineOf(overlays.measure, "measure");
  return { type: "FeatureCollection", features };
}

function closedRing(points: [number, number][]): [number, number][] {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([first[0], first[1]]);
  return ring;
}

function zonesGeo(zones: ZoneShape[], selectedId: string, layers: ZoneLayers): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const ordered = [...zones].sort((left, right) => Number(left.kind !== "service") - Number(right.kind !== "service"));
  for (const zone of ordered) {
    if (zone.archived) continue;
    if (zone.kind === "pickup" && !layers.pickups) continue;
    if (zone.kind === "boost" && !layers.boosts) continue;
    if (zone.kind === "event" && !layers.events) continue;
    const color = zone.color || ZONE_COLOR[zone.kind];
    const selected = zone.id === selectedId ? 1 : 0;
    if (zone.kind === "pickup") {
      const [lat, lng] = zone.points[0] ?? [59.33, 18.06];
      features.push({ type: "Feature", properties: { id: zone.id, name: zone.name, kind: zone.kind, color, selected }, geometry: { type: "Point", coordinates: [lng, lat] } });
    } else if (zone.points.length >= 3) {
      const holes = zone.holes.map((hole) => closedRing(hole)).filter((hole) => hole.length >= 4);
      features.push({
        type: "Feature",
        properties: { id: zone.id, name: zone.name, kind: zone.kind, color, selected },
        geometry: { type: "Polygon", coordinates: [closedRing(zone.points), ...holes] },
      });
    }
    if (!layers.pickups) continue;
    for (const pickup of zone.pickups) {
      features.push({
        type: "Feature",
        properties: { id: pickup.id, name: pickup.name, kind: "pickup", color: ZONE_COLOR.pickup, selected: 0 },
        geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function activityVisible(kind: ReturnType<typeof activityPoints>[number]["kind"], layers: ZoneLayers): boolean {
  if (kind === "driver") return layers.drivers;
  if (kind === "trip") return layers.trips;
  if (kind === "request") return layers.requests;
  if (kind === "queue") return layers.queue;
  if (kind === "demand_hour") return layers.demandHour;
  return layers.demand7d;
}

function activityGeo(layers: ZoneLayers, demand: boolean): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = activityPoints()
    .filter((item) => {
      const isDemand = item.kind === "demand_hour" || item.kind === "demand_7d";
      return isDemand === demand && activityVisible(item.kind, layers) && (item.kind !== "driver" || item.online);
    })
    .map((item) => ({
      type: "Feature",
      properties: {
        name: item.name,
        kind: item.kind,
        stale: item.stale ? 1 : 0,
        weight: item.weight ?? 1,
      },
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    }));
  return { type: "FeatureCollection", features };
}

function drawnPoints(feature: GeoJSONStoreFeatures | undefined): [number, number][] | null {
  if (!feature) return null;
  if (feature.geometry.type === "LineString") {
    return feature.geometry.coordinates.map(([lng, lat]) => [lat ?? 0, lng ?? 0] as [number, number]);
  }
  if (feature.geometry.type === "Point") {
    const [lng, lat] = feature.geometry.coordinates;
    return [[lat ?? 0, lng ?? 0]];
  }
  if (feature.geometry.type !== "Polygon") return null;
  const ring = feature.geometry.coordinates[0];
  if (!ring || ring.length < 4) return null;
  return ring.slice(0, -1).map(([lng, lat]) => [lat ?? 0, lng ?? 0]);
}

function terraMode(mode: DrawMode): string {
  if (mode === "hole") return "polygon";
  if (mode === "line") return "linestring";
  return mode;
}

function createDraw(adapter: ConstructorParameters<typeof TerraDraw>[0]["adapter"]): TerraDraw {
  return new TerraDraw({ adapter, modes: zoneDrawModes() });
}

function polygonFeature(zone: ZoneShape): GeoJSONStoreFeatures | null {
  if (zone.points.length < 3) return null;
  return {
    type: "Feature",
    id: crypto.randomUUID(),
    properties: { mode: "polygon" },
    geometry: { type: "Polygon", coordinates: [closedRing(zone.points)] },
  };
}

function labelText(zone: ZoneShape): string | null {
  if (zone.archived || zone.kind === "service" || zone.points.length < 1) return null;
  if (zone.kind === "operating" || zone.kind === "airport") return zone.name.includes(" · ") ? zone.name.split(" · ").slice(1).join(" · ") : zone.name;
  return zone.code;
}

function centroid(points: [number, number][]): [number, number] {
  const lat = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [lat, lng];
}

function boundsFor(zones: ZoneShape[], ids?: string[]): maplibregl.LngLatBounds | null {
  const bounds = new maplibregl.LngLatBounds();
  let count = 0;
  for (const zone of zones) {
    if (zone.archived || zone.points.length < 3) continue;
    if (ids && !ids.includes(zone.id)) continue;
    for (const [lat, lng] of zone.points) {
      bounds.extend([lng, lat]);
      count += 1;
    }
  }
  return count > 0 ? bounds : null;
}

function MapLibreCanvas({ zones, selectedId, mode, layers, focus, selectionNonce, onDrawn, onEdited, overlays, fitIds, viewKey, onPick }: DrawProps) {
  const host = useRef<HTMLDivElement>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const zonesRef = useRef(zones);
  const selectedRef = useRef(selectedId);
  const modeRef = useRef(mode);
  const drawnRef = useRef(onDrawn);
  const editedRef = useRef(onEdited);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const editIdRef = useRef<string | null>(null);
  const ignoreRef = useRef(false);
  const overlaysRef = useRef(overlays);
  const layersRef = useRef(layers);
  const fitRef = useRef(fitIds);
  const pickRef = useRef(onPick);
  zonesRef.current = zones;
  selectedRef.current = selectedId;
  modeRef.current = mode;
  drawnRef.current = onDrawn;
  editedRef.current = onEdited;
  overlaysRef.current = overlays;
  layersRef.current = layers;
  fitRef.current = fitIds;
  pickRef.current = onPick;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let alive = true;
    let generation = 0;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: node,
        style: OSM_STYLE,
        center: [18.07, 59.34],
        zoom: 12,
      });
    } catch {
      setMapUnavailable(true);
      return;
    }
    mapRef.current = map;
    const publish = () => {
      generation += 1;
      window.__moveraMap = {
        generation,
        project(lat, lng) {
          const point = map.project([lng, lat]);
          return { x: point.x, y: point.y };
        },
      };
    };
    map.on("load", () => {
      if (!alive) return;
      map.addSource("zones", { type: "geojson", data: zonesGeo(zonesRef.current, selectedRef.current, layers) });
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["==", ["get", "kind"], "service"], 0.05, ["==", ["get", "selected"], 1], 0.62, 0.42],
        },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "selected"], 1], 4, ["==", ["get", "kind"], "service"], 1.5, 2],
        },
      });
      map.addLayer({
        id: "zones-pin",
        type: "circle",
        source: "zones",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-color": ["get", "color"], "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      });
      map.addSource("activity", {
        type: "geojson",
        data: activityGeo(layers, false),
        cluster: true,
        clusterRadius: 35,
        clusterMaxZoom: 13,
      });
      map.addLayer({
        id: "activity-cluster",
        type: "circle",
        source: "activity",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 30, 22],
          "circle-color": "#5E6B66",
          "circle-opacity": 0.82,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "activity-cluster-count",
        type: "symbol",
        source: "activity",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "activity-dot",
        type: "circle",
        source: "activity",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": ["match", ["get", "kind"], "driver", "#1FA463", "trip", "#111614", "request", "#D08A1E", "queue", "#C2453A", "#5E6B66"],
          "circle-opacity": ["case", ["==", ["get", "stale"], 1], 0.35, 0.95],
          "circle-stroke-width": ["case", ["==", ["get", "stale"], 1], 3, 2],
          "circle-stroke-color": ["case", ["==", ["get", "stale"], 1], "#D08A1E", "#ffffff"],
        },
      });
      map.addSource("demand", { type: "geojson", data: activityGeo(layers, true) });
      map.addLayer({
        id: "demand-heat",
        type: "heatmap",
        source: "demand",
        maxzoom: 15,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 5, 1],
          "heatmap-intensity": 0.8,
          "heatmap-radius": 28,
          "heatmap-opacity": 0.62,
        },
      });
      map.addSource("overlay", { type: "geojson", data: overlayGeo(overlaysRef.current, layersRef.current) });
      map.addLayer({
        id: "overlay-fill",
        type: "fill",
        source: "overlay",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["match", ["get", "kind"], "gap", "#e34948", "district-on", "#6250d6", "district", "#6250d6", "sketch", "#6250d6", "bonus", "#f2994a", "#6250d6"],
          "fill-opacity": ["match", ["get", "kind"], "gap", 0.32, "district-on", 0.35, "district", 0.06, "sketch", 0.28, "bonus", 0.38, 0.1],
        },
      });
      map.addLayer({
        id: "overlay-line",
        type: "line",
        source: "overlay",
        paint: {
          "line-color": ["match", ["get", "kind"], "gap", "#e34948", "before", "#111614", "nostop", "#d03b3b", "measure", "#c98a00", "outline", "#215277", "bonus", "#e36414", "#6250d6"],
          "line-width": ["match", ["get", "kind"], "nostop", 5, "measure", 3, "sketch", 3, "bonus", 3, "district", 1.2, "gap", 0.5, 2],
          "line-dasharray": ["match", ["get", "kind"], "before", ["literal", [2, 2]], "outline", ["literal", [4, 3]], "measure", ["literal", [1, 1.5]], "district", ["literal", [2, 2]], ["literal", [1, 0]]],
        },
      });
      map.on("click", "zones-fill", (event) => {
        if (modeRef.current !== "render") return;
        const hit = (event.features ?? []).map((feature) => String(feature.properties?.id ?? "")).find((id) => {
          const zone = zonesRef.current.find((item) => item.id === id);
          return zone && zone.kind !== "service";
        });
        if (hit) pickRef.current?.(hit);
      });
      map.on("mouseenter", "zones-fill", () => { if (modeRef.current === "render" && pickRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "zones-fill", () => { map.getCanvas().style.cursor = ""; });
      paintLabels(map);
      const inner = (fitRef.current?.length ? boundsFor(zonesRef.current, fitRef.current) : boundsFor(zonesRef.current, INNER_IDS)) ?? boundsFor(zonesRef.current);
      map.on("idle", publish);
      if (inner) map.fitBounds(inner, { padding: 36, animate: false, maxZoom: 13 });
      else publish();
      const draw = createDraw(new TerraDrawMapLibreGLAdapter({ map }));
      draw.start();
      draw.setMode(terraMode(modeRef.current));
      draw.on("finish", (id) => {
        const points = drawnPoints(draw.getSnapshotFeature(id));
        const intent = modeRef.current === "hole" ? "hole" : modeRef.current === "point" ? "point" : modeRef.current === "line" ? "line" : "outer";
        try {
          draw.removeFeatures([id]);
        } catch {
          /* already removed when the mode changes */
        }
        if (points) drawnRef.current(points, intent);
      });
      draw.on("change", (ids) => {
        if (ignoreRef.current || modeRef.current !== "select") return;
        const points = drawnPoints(draw.getSnapshotFeature(ids[0] ?? ""));
        if (points && points.length >= 3) editedRef.current(points);
      });
      drawRef.current = draw;
    });
    return () => {
      alive = false;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
      delete window.__moveraMap;
    };
  }, []);

  function paintLabels(map: maplibregl.Map) {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    for (const zone of zonesRef.current) {
      const text = labelText(zone);
      if (!text) continue;
      const [lat, lng] = centroid(zone.points);
      const element = document.createElement("div");
      element.className = "zone-label";
      element.style.borderColor = zone.color || ZONE_COLOR[zone.kind];
      element.style.pointerEvents = "none";
      element.textContent = text;
      markersRef.current.push(new maplibregl.Marker({ element, anchor: "center" }).setLngLat([lng, lat]).addTo(map));
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("zones");
    if (source && "setData" in source) (source as GeoJSONSource).setData(zonesGeo(zones, selectedId, layers));
    if (map?.isStyleLoaded()) paintLabels(map);
  }, [zones, selectedId]);

  useEffect(() => {
    const source = mapRef.current?.getSource("overlay");
    if (source && "setData" in source) (source as GeoJSONSource).setData(overlayGeo(overlays, layers));
  }, [overlays, layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("satellite")) return;
    map.setLayoutProperty("satellite", "visibility", layers.satellite ? "visible" : "none");
  }, [layers.satellite]);

  // Show the new-zone shape as soon as it is made.
  const fitShape = overlays?.fitTo ?? overlays?.sketch;
  const sketchKey = fitShape && fitShape.length >= 3 ? JSON.stringify(fitShape) : "";
  useEffect(() => {
    const map = mapRef.current;
    const sketch = overlaysRef.current?.fitTo ?? overlaysRef.current?.sketch;
    if (!map || !sketchKey || !sketch) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const [lat, lng] of sketch) bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 70, animate: false, maxZoom: 14 });
    const current = window.__moveraMap;
    if (current) window.__moveraMap = { ...current, generation: current.generation + 1 };
  }, [sketchKey]);

  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const bounds = fitRef.current?.length ? boundsFor(zonesRef.current, fitRef.current) : null;
    if (bounds) map.fitBounds(bounds, { padding: 36, animate: false, maxZoom: 13 });
    const current = window.__moveraMap;
    if (current) window.__moveraMap = { ...current, generation: current.generation + 1 };
  }, [viewKey]);

  useEffect(() => {
    const activity = mapRef.current?.getSource("activity");
    if (activity && "setData" in activity) (activity as GeoJSONSource).setData(activityGeo(layers, false));
    const demand = mapRef.current?.getSource("demand");
    if (demand && "setData" in demand) (demand as GeoJSONSource).setData(activityGeo(layers, true));
    const zonesSource = mapRef.current?.getSource("zones");
    if (zonesSource && "setData" in zonesSource) (zonesSource as GeoJSONSource).setData(zonesGeo(zones, selectedId, layers));
  }, [layers, selectedId, zones]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    ignoreRef.current = true;
    if (editIdRef.current) {
      try {
        draw.removeFeatures([editIdRef.current]);
      } catch {
        /* feature already gone */
      }
      editIdRef.current = null;
    }
    try {
      draw.setMode(terraMode(mode));
      if (mode === "select") {
        const zone = zonesRef.current.find((item) => item.id === selectedRef.current);
        const feature = zone ? polygonFeature(zone) : null;
        if (feature?.id !== undefined) {
          draw.addFeatures([feature]);
          editIdRef.current = String(feature.id);
          try {
            draw.selectFeature(feature.id);
          } catch {
            /* the points can still be dragged after a click */
          }
        }
      }
    } catch {
      try {
        draw.setMode("render");
      } catch {
        /* map is closing */
      }
    } finally {
      ignoreRef.current = false;
    }
  }, [mode, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectionNonce) return;
    const zone = zonesRef.current.find((item) => item.id === selectedRef.current);
    if (!zone || zone.points.length < 1) return;
    if (zone.points.length < 3) {
      const [lat, lng] = zone.points[0] ?? [59.33, 18.06];
      map.jumpTo({ center: [lng, lat], zoom: 13 });
      return;
    }
    const bounds = boundsFor([zone]);
    if (bounds) map.fitBounds(bounds, { padding: 48, animate: false, maxZoom: 14 });
    const current = window.__moveraMap;
    if (current) window.__moveraMap = { ...current, generation: current.generation + 1 };
  }, [selectionNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.jumpTo({ center: [focus.lng, focus.lat], zoom: 13 });
  }, [focus]);

  return <>
    <div ref={host} className="live-map" hidden={mapUnavailable} />
    {mapUnavailable ? <p role="status">Map unavailable. WebGL graphics could not initialize. The lists and settings remain available.</p> : null}
  </>;
}

function GoogleDraw({ zones, selectedId, mode, layers, focus, selectionNonce, onDrawn, onEdited }: DrawProps) {
  // Google Maps shows zones and drawing; the extra overlays are drawn on the OpenStreetMap canvas.
  const map = useMap();
  const zonesRef = useRef(zones);
  const selectedRef = useRef(selectedId);
  const modeRef = useRef(mode);
  const drawnRef = useRef(onDrawn);
  const editedRef = useRef(onEdited);
  const drawRef = useRef<TerraDraw | null>(null);
  const editIdRef = useRef<string | null>(null);
  const ignoreRef = useRef(false);
  zonesRef.current = zones;
  selectedRef.current = selectedId;
  modeRef.current = mode;
  drawnRef.current = onDrawn;
  editedRef.current = onEdited;

  useEffect(() => {
    if (!map) return;
    const paint = () => {
      map.data.forEach((feature) => map.data.remove(feature));
      map.data.addGeoJson(zonesGeo(zonesRef.current, selectedRef.current, layers));
      map.data.addGeoJson(activityGeo(layers, false));
      map.data.addGeoJson(activityGeo(layers, true));
      map.data.setStyle((feature) => ({
        fillColor: String(feature.getProperty("color") ?? (feature.getProperty("kind") === "request" ? "#D08A1E" : "#1FA463")),
        strokeColor: String(feature.getProperty("color") ?? "#111614"),
        fillOpacity: feature.getProperty("kind") === "service" ? 0.22 : feature.getProperty("stale") === 1 ? 0.28 : 0.72,
        strokeOpacity: feature.getProperty("stale") === 1 ? 0.45 : 0.9,
        strokeWeight: feature.getProperty("selected") === 1 ? 4 : 2,
      }));
    };
    paint();
    const draw = createDraw(new TerraDrawGoogleMapsAdapter({ lib: google.maps, map }));
    draw.start();
    draw.setMode(terraMode(modeRef.current));
    draw.on("finish", (id) => {
      const points = drawnPoints(draw.getSnapshotFeature(id));
      const intent = modeRef.current === "hole" ? "hole" : modeRef.current === "point" ? "point" : modeRef.current === "line" ? "line" : "outer";
      try {
        draw.removeFeatures([id]);
      } catch {
        /* already removed */
      }
      if (points) drawnRef.current(points, intent);
    });
    draw.on("change", (ids) => {
      if (ignoreRef.current || modeRef.current !== "select") return;
      const points = drawnPoints(draw.getSnapshotFeature(ids[0] ?? ""));
      if (points && points.length >= 3) editedRef.current(points);
    });
    drawRef.current = draw;
    return () => {
      draw.stop();
      drawRef.current = null;
    };
  }, [layers, map, selectedId, zones]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    ignoreRef.current = true;
    if (editIdRef.current) {
      try {
        draw.removeFeatures([editIdRef.current]);
      } catch {
        /* already gone */
      }
      editIdRef.current = null;
    }
    try {
      draw.setMode(terraMode(mode));
    } catch {
      draw.setMode("render");
    } finally {
      ignoreRef.current = false;
    }
  }, [mode]);

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
  }, [focus, map]);

  useEffect(() => {
    if (!map || !selectionNonce) return;
    const zone = zones.find((item) => item.id === selectedId);
    const first = zone?.points[0];
    if (first) map.panTo({ lat: first[0], lng: first[1] });
  }, [map, selectedId, selectionNonce, zones]);

  return null;
}

function GoogleCanvas(props: DrawProps & { apiKey: string }) {
  return (
    <APIProvider apiKey={props.apiKey}>
      <div className="live-map">
        <Map defaultCenter={{ lat: 59.34, lng: 18.07 }} defaultZoom={12} gestureHandling="greedy" style={{ width: "100%", height: "100%" }}>
          <GoogleDraw {...props} />
        </Map>
      </div>
    </APIProvider>
  );
}

export function mapProviderLabel(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim() ? "Google Maps" : "OpenStreetMap";
}

export function ZoneCanvas(props: DrawProps) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim();
  if (key) return <GoogleCanvas {...props} apiKey={key} />;
  return <MapLibreCanvas {...props} />;
}
