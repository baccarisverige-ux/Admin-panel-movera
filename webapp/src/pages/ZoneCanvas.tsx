import { useEffect, useRef } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { ZONE_COLOR, type ZoneShape } from "../zones/releases";

export type DrawMode = "render" | "polygon" | "rectangle" | "point";

type DrawProps = {
  zones: ZoneShape[];
  selectedId: string;
  mode: DrawMode;
  onDrawn: (points: [number, number][]) => void;
};

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

function zonesGeo(zones: ZoneShape[], selectedId: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const zone of zones) {
    const color = zone.id === selectedId ? "#1FA463" : ZONE_COLOR[zone.kind];
    if (zone.kind === "pickup") {
      const [lat, lng] = zone.points[0] ?? [59.33, 18.06];
      features.push({
        type: "Feature",
        properties: { color, name: zone.name },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
      continue;
    }
    if (zone.points.length < 3) continue;
    const ring = zone.points.map(([lat, lng]) => [lng, lat]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
    features.push({
      type: "Feature",
      properties: { color, name: zone.name },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
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

function createDraw(adapter: ConstructorParameters<typeof TerraDraw>[0]["adapter"]): TerraDraw {
  return new TerraDraw({
    adapter,
    modes: [
      new TerraDrawRenderMode({
        styles: {
          polygonFillColor: "#1FA463",
          polygonFillOpacity: 0.15,
          polygonOutlineColor: "#111614",
          polygonOutlineWidth: 2,
          pointColor: "#111614",
          pointWidth: 8,
        },
      }),
      new TerraDrawPolygonMode(),
      new TerraDrawRectangleMode(),
      new TerraDrawPointMode(),
      new TerraDrawSelectMode({
        flags: {
          polygon: { feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
          rectangle: { feature: { draggable: true } },
          point: { feature: { draggable: true } },
        },
      }),
    ],
  });
}

function MapLibreCanvas({ zones, selectedId, mode, onDrawn }: DrawProps) {
  const host = useRef<HTMLDivElement>(null);
  const zonesRef = useRef(zones);
  const selectedRef = useRef(selectedId);
  const drawnRef = useRef(onDrawn);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  zonesRef.current = zones;
  selectedRef.current = selectedId;
  drawnRef.current = onDrawn;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let alive = true;
    const map = new maplibregl.Map({
      container: node,
      style: OSM_STYLE,
      center: [18.06, 59.33],
      zoom: 10,
    });
    mapRef.current = map;
    map.on("load", () => {
      if (!alive) return;
      map.addSource("zones", { type: "geojson", data: zonesGeo(zonesRef.current, selectedRef.current) });
      map.addLayer({ id: "zones-fill", type: "fill", source: "zones", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": ["get", "color"], "fill-opacity": 0.28 } });
      map.addLayer({ id: "zones-line", type: "line", source: "zones", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": ["get", "color"], "line-width": 2 } });
      map.addLayer({ id: "zones-pin", type: "circle", source: "zones", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": ["get", "color"], "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      const draw = createDraw(new TerraDrawMapLibreGLAdapter({ map }));
      draw.start();
      draw.setMode("render");
      draw.on("finish", (id) => {
        const points = drawnPoints(draw.getSnapshotFeature(id));
        if (points) drawnRef.current(points);
        draw.removeFeatures([id]);
      });
      drawRef.current = draw;
    });
    return () => {
      alive = false;
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource("zones");
    if (source && "setData" in source) (source as GeoJSONSource).setData(zonesGeo(zones, selectedId));
  }, [zones, selectedId]);

  useEffect(() => {
    try {
      drawRef.current?.setMode(mode);
    } catch {
      drawRef.current?.setMode("render");
    }
  }, [mode]);

  return <div ref={host} className="live-map" />;
}

function GoogleDraw({ zones, selectedId, mode, onDrawn }: DrawProps) {
  const map = useMap();
  const zonesRef = useRef(zones);
  const drawnRef = useRef(onDrawn);
  const drawRef = useRef<TerraDraw | null>(null);
  zonesRef.current = zones;
  drawnRef.current = onDrawn;

  useEffect(() => {
    if (!map) return;
    let alive = true;
    const paint = () => {
      map.data.forEach((feature) => map.data.remove(feature));
      map.data.addGeoJson(zonesGeo(zonesRef.current, selectedId));
      map.data.setStyle((feature) => ({
        fillColor: String(feature.getProperty("color") ?? "#1FA463"),
        strokeColor: String(feature.getProperty("color") ?? "#111614"),
        fillOpacity: 0.28,
        strokeWeight: 2,
      }));
    };
    paint();
    const draw = createDraw(new TerraDrawGoogleMapsAdapter({ lib: google.maps, map }));
    draw.start();
    draw.setMode(mode);
    draw.on("finish", (id) => {
      if (!alive) return;
      const points = drawnPoints(draw.getSnapshotFeature(id));
      if (points) drawnRef.current(points);
      draw.removeFeatures([id]);
    });
    drawRef.current = draw;
    return () => {
      alive = false;
      draw.stop();
      drawRef.current = null;
    };
  }, [map, selectedId, zones, mode]);

  return null;
}

function GoogleCanvas(props: DrawProps & { apiKey: string }) {
  return (
    <APIProvider apiKey={props.apiKey}>
      <div className="live-map">
        <Map defaultCenter={{ lat: 59.33, lng: 18.06 }} defaultZoom={10} gestureHandling="greedy" style={{ width: "100%", height: "100%" }}>
          <GoogleDraw zones={props.zones} selectedId={props.selectedId} mode={props.mode} onDrawn={props.onDrawn} />
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
