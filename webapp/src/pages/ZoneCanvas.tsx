import { useEffect, useRef } from "react";
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

type DrawProps = {
  zones: ZoneShape[];
  selectedId: string;
  mode: DrawMode;
  layers: ZoneLayers;
  focus: ZoneFocus | null;
  selectionNonce: number;
  onDrawn: (points: [number, number][], intent: "outer" | "hole" | "point") => void;
  onEdited: (points: [number, number][]) => void;
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
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

function closedRing(points: [number, number][]): [number, number][] {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([first[0], first[1]]);
  return ring;
}

function zonesGeo(zones: ZoneShape[], selectedId: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const ordered = [...zones].sort((left, right) => Number(left.kind !== "service") - Number(right.kind !== "service"));
  for (const zone of ordered) {
    if (zone.archived) continue;
    const color = ZONE_COLOR[zone.kind];
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

function activityGeo(layers: ZoneLayers): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = activityPoints()
    .filter((item) => (item.kind === "driver" ? layers.drivers && item.online : item.kind === "trip" ? layers.trips : layers.queue))
    .map((item) => ({
      type: "Feature",
      properties: { name: item.name, kind: item.kind },
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    }));
  return { type: "FeatureCollection", features };
}

function drawnPoints(feature: GeoJSONStoreFeatures | undefined): [number, number][] | null {
  if (!feature) return null;
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
  if (zone.kind === "operating" || zone.kind === "airport") return zone.name;
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

function MapLibreCanvas({ zones, selectedId, mode, layers, focus, selectionNonce, onDrawn, onEdited }: DrawProps) {
  const host = useRef<HTMLDivElement>(null);
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
  zonesRef.current = zones;
  selectedRef.current = selectedId;
  modeRef.current = mode;
  drawnRef.current = onDrawn;
  editedRef.current = onEdited;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let alive = true;
    let generation = 0;
    const map = new maplibregl.Map({
      container: node,
      style: OSM_STYLE,
      center: [18.07, 59.34],
      zoom: 12,
    });
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
      map.addSource("zones", { type: "geojson", data: zonesGeo(zonesRef.current, selectedRef.current) });
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["==", ["get", "kind"], "service"], 0.22, 0.78],
        },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "selected"], 1], 5, 3.5],
        },
      });
      map.addLayer({
        id: "zones-pin",
        type: "circle",
        source: "zones",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-color": ["get", "color"], "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      });
      map.addSource("activity", { type: "geojson", data: activityGeo({ drivers: true, trips: true, queue: true }) });
      map.addLayer({
        id: "activity-dot",
        type: "circle",
        source: "activity",
        paint: {
          "circle-radius": 6,
          "circle-color": ["match", ["get", "kind"], "driver", "#1FA463", "trip", "#111614", "queue", "#C2453A", "#5E6B66"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      paintLabels(map);
      const inner = boundsFor(zonesRef.current, INNER_IDS) ?? boundsFor(zonesRef.current);
      map.on("idle", publish);
      if (inner) map.fitBounds(inner, { padding: 36, animate: false, maxZoom: 13 });
      else publish();
      const draw = createDraw(new TerraDrawMapLibreGLAdapter({ map }));
      draw.start();
      draw.setMode(terraMode(modeRef.current));
      draw.on("finish", (id) => {
        const points = drawnPoints(draw.getSnapshotFeature(id));
        const intent = modeRef.current === "hole" ? "hole" : modeRef.current === "point" ? "point" : "outer";
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
      element.style.borderColor = ZONE_COLOR[zone.kind];
      element.style.pointerEvents = "none";
      element.textContent = text;
      markersRef.current.push(new maplibregl.Marker({ element, anchor: "center" }).setLngLat([lng, lat]).addTo(map));
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("zones");
    if (source && "setData" in source) (source as GeoJSONSource).setData(zonesGeo(zones, selectedId));
    if (map?.isStyleLoaded()) paintLabels(map);
  }, [zones, selectedId]);

  useEffect(() => {
    const source = mapRef.current?.getSource("activity");
    if (source && "setData" in source) (source as GeoJSONSource).setData(activityGeo(layers));
  }, [layers]);

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

  return <div ref={host} className="live-map" />;
}

function GoogleDraw({ zones, selectedId, mode, layers, focus, selectionNonce, onDrawn, onEdited }: DrawProps) {
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
      map.data.addGeoJson(zonesGeo(zonesRef.current, selectedRef.current));
      map.data.addGeoJson(activityGeo(layers));
      map.data.setStyle((feature) => ({
        fillColor: String(feature.getProperty("color") ?? "#1FA463"),
        strokeColor: String(feature.getProperty("color") ?? "#111614"),
        fillOpacity: feature.getProperty("kind") === "service" ? 0.22 : 0.78,
        strokeWeight: feature.getProperty("selected") === 1 ? 4 : 2,
      }));
    };
    paint();
    const draw = createDraw(new TerraDrawGoogleMapsAdapter({ lib: google.maps, map }));
    draw.start();
    draw.setMode(terraMode(modeRef.current));
    draw.on("finish", (id) => {
      const points = drawnPoints(draw.getSnapshotFeature(id));
      const intent = modeRef.current === "hole" ? "hole" : modeRef.current === "point" ? "point" : "outer";
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
