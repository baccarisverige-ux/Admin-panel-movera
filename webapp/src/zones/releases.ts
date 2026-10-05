import area from "@turf/area";
import { booleanIntersects } from "@turf/boolean-intersects";
import { booleanWithin } from "@turf/boolean-within";
import { point, polygon } from "@turf/helpers";
import kinks from "@turf/kinks";

export const ZONE_TYPES = [
  { id: "service", label: "Service area" },
  { id: "operating", label: "Operating zone" },
  { id: "airport", label: "Airport" },
  { id: "boost", label: "Boost" },
  { id: "event", label: "Event" },
  { id: "no_pickup", label: "No pickup / no drop-off" },
  { id: "restricted", label: "Restricted" },
  { id: "fleet", label: "Fleet territory" },
  { id: "pickup", label: "Pickup point" },
] as const;

export type ZoneKind = (typeof ZONE_TYPES)[number]["id"];

export const ZONE_COLOR: Record<ZoneKind, string> = {
  service: "#111614",
  operating: "#1FA463",
  airport: "#D08A1E",
  boost: "#A86B12",
  event: "#5E6B66",
  no_pickup: "#C2453A",
  restricted: "#3D3430",
  fleet: "#146C43",
  pickup: "#111614",
};

export type PickupPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  instructions: string;
};

export type ZoneShape = {
  id: string;
  code: string;
  name: string;
  kind: ZoneKind;
  parentId: string | null;
  notes: string;
  points: [number, number][];
  holes: [number, number][][];
  archived: boolean;
  active: boolean;
  categories: string[];
  cash: boolean;
  pinRequired: boolean;
  minAppVersion: string;
  suspendedUntil: string;
  suspendReason: string;
  priceSet: string;
  zoneFeeOre: number;
  airportFeeOre: number;
  boostRule: string;
  searchRadiusKm: number;
  offerSeconds: number;
  nextTripKm: number;
  destinationMode: boolean;
  maxWaitMin: number;
  pickups: PickupPoint[];
  queueOn: boolean;
  maxQueueMin: number;
  queueFeeOre: number;
  terminals: string;
  schedule: "always" | "weekly" | "range";
  hours: string;
  from: string;
  until: string;
};

export type ZoneStatus = "draft" | "in_review";

export type ZoneBook = {
  authorId: string;
  status: ZoneStatus;
  draft: ZoneShape[];
  published: ZoneShape[];
  versions: ZoneShape[][];
};

export type ZoneIssue = { level: "error" | "warn"; zoneId: string; message: string };

export type ActivityPoint = {
  id: string;
  kind: "driver" | "trip" | "queue";
  name: string;
  lat: number;
  lng: number;
  online: boolean;
};

export const RIDE_CATEGORIES = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet"];

function rect(south: number, west: number, north: number, east: number): [number, number][] {
  return [
    [south, west],
    [south, east],
    [north, east],
    [north, west],
  ];
}

function zone(input: Pick<ZoneShape, "id" | "code" | "name" | "kind" | "points"> & Partial<ZoneShape>): ZoneShape {
  const airport = input.kind === "airport";
  return {
    parentId: input.kind === "service" ? null : "svc-stockholm",
    notes: "",
    archived: false,
    active: true,
    categories: [...RIDE_CATEGORIES],
    cash: false,
    pinRequired: airport,
    minAppVersion: "1.0.0",
    suspendedUntil: "",
    suspendReason: "",
    priceSet: "price-3",
    zoneFeeOre: airport ? 4500 : 0,
    airportFeeOre: airport ? 4500 : 0,
    boostRule: input.kind === "boost" ? "Friday 16:00–19:00 ×1.4" : "",
    searchRadiusKm: 5,
    offerSeconds: 8.5,
    nextTripKm: 30,
    destinationMode: false,
    maxWaitMin: 5,
    queueOn: airport,
    maxQueueMin: airport ? 45 : 0,
    queueFeeOre: airport ? 4500 : 0,
    terminals: "",
    schedule: "always",
    hours: "00:00–24:00",
    from: "",
    until: "",
    ...input,
    holes: input.holes ?? [],
    pickups: input.pickups ?? [],
  };
}

export function zoneStatus(zone: ZoneShape, book: ZoneBook): "Archived" | "In review" | "Draft" | "Published" {
  if (zone.archived) return "Archived";
  if (book.status === "in_review") return "In review";
  const published = book.published.find((item) => item.id === zone.id);
  if (!published) return "Draft";
  const sameShape = JSON.stringify(published.points) === JSON.stringify(zone.points) && JSON.stringify(published.holes) === JSON.stringify(zone.holes);
  return sameShape && published.zoneFeeOre === zone.zoneFeeOre ? "Published" : "Draft";
}

export function zoneTypeLabel(kind: ZoneKind): string {
  return ZONE_TYPES.find((item) => item.id === kind)?.label ?? kind;
}

/** Greater Stockholm, 9 operating zones, Arlanda and Bromma — the 12 areas — plus one of each other type. */
export function stockholmZones(): ZoneShape[] {
  const operating: Array<[string, string, string, number, number, number, number]> = [
    ["op-norrmalm", "NRM", "Norrmalm", 59.325, 18.06, 59.35, 18.11],
    ["op-sodermalm", "SOD", "Södermalm", 59.255, 18.008, 59.318, 18.145],
    ["op-ostermalm", "OST", "Östermalm", 59.325, 18.118, 59.39, 18.185],
    ["op-kungsholmen", "KUN", "Kungsholmen", 59.322, 18.008, 59.355, 18.055],
    ["op-vasastan", "VAS", "Vasastan", 59.358, 18.015, 59.395, 18.1],
    ["op-bromma", "BRO", "Bromma", 59.3, 17.9, 59.345, 18],
    ["op-solna", "SOL", "Solna", 59.4, 17.99, 59.445, 18.055],
    ["op-kista", "KIS", "Kista", 59.4, 17.85, 59.455, 17.97],
    ["op-sodertalje", "SODT", "Södertälje", 59.17, 17.52, 59.23, 17.7],
  ];
  return [
    zone({ id: "svc-stockholm", code: "STO", name: "Greater Stockholm", kind: "service", parentId: null, points: rect(59.1, 17.4, 59.8, 18.5) }),
    ...operating.map(([id, code, name, south, west, north, east]) => zone({ id, code, name, kind: "operating", points: rect(south, west, north, east) })),
    zone({ id: "air-arlanda", code: "ARN", name: "Arlanda", kind: "airport", terminals: "Terminal 2, Terminal 5", points: rect(59.62, 17.85, 59.68, 17.97) }),
    zone({ id: "air-bromma", code: "BMA", name: "Bromma airport", kind: "airport", terminals: "Main terminal", points: rect(59.348, 17.8, 59.378, 17.88) }),
    zone({ id: "boost-1", code: "BST", name: "Friday night Stureplan", kind: "boost", points: rect(59.333, 18.072, 59.341, 18.098) }),
    zone({ id: "event-1", code: "EVE", name: "Tele2 event", kind: "event", points: rect(59.22, 18.02, 59.248, 18.09) }),
    zone({ id: "nopick-1", code: "NOP", name: "Drottninggatan no pickup", kind: "no_pickup", points: rect(59.328, 18.068, 59.331, 18.09) }),
    zone({ id: "restricted-1", code: "DEP", name: "Depot", kind: "restricted", points: rect(59.3, 18.19, 59.32, 18.23) }),
    zone({ id: "fleet-1", code: "FLT", name: "Partner north", kind: "fleet", points: rect(59.46, 18, 59.505, 18.07) }),
    zone({ id: "pin-t5", code: "T5", name: "Terminal 5", kind: "pickup", parentId: "air-arlanda", points: [[59.651, 17.922]] }),
  ];
}

export function coreZones(zones: readonly ZoneShape[]): ZoneShape[] {
  return zones.filter((item) => item.kind === "service" || item.kind === "operating" || item.kind === "airport");
}

function cloneZones(zones: ZoneShape[]): ZoneShape[] {
  return JSON.parse(JSON.stringify(zones)) as ZoneShape[];
}

export function emptyBook(authorId = "nora"): ZoneBook {
  const seed = stockholmZones();
  return { authorId, status: "draft", draft: seed, published: cloneZones(seed), versions: [cloneZones(seed)] };
}

export function updateDraft(book: ZoneBook, zoneId: string, points: [number, number][], authorId: string): ZoneBook {
  return setOuter(book, zoneId, points, authorId, false);
}

export function setOuter(book: ZoneBook, zoneId: string, points: [number, number][], authorId: string, keepHoles: boolean): ZoneBook {
  return {
    ...book,
    authorId,
    status: "draft",
    draft: book.draft.map((item) => (item.id === zoneId ? { ...item, points, holes: keepHoles ? item.holes : [] } : item)),
  };
}

export function addHole(book: ZoneBook, zoneId: string, hole: [number, number][], authorId: string): { book: ZoneBook; error?: string } {
  const zone = book.draft.find((item) => item.id === zoneId);
  const outer = zone ? asPolygon(zone, false) : null;
  const inner = polygon([closedRing(hole)]);
  if (!zone || !outer || hole.length < 3) return { book, error: "A hole needs at least 3 points inside the zone." };
  if (kinks(inner).features.length > 0) return { book, error: "The hole crosses itself." };
  if (!booleanWithin(inner, outer)) return { book, error: "The hole must sit inside the zone." };
  return {
    book: {
      ...book,
      authorId,
      status: "draft",
      draft: book.draft.map((item) => (item.id === zoneId ? { ...item, holes: [...item.holes, hole] } : item)),
    },
  };
}

export function patchZone(book: ZoneBook, zoneId: string, patch: Partial<ZoneShape>, authorId: string): ZoneBook {
  return {
    ...book,
    authorId,
    status: "draft",
    draft: book.draft.map((item) => (item.id === zoneId ? { ...item, ...patch, id: item.id } : item)),
  };
}

export function createZone(book: ZoneBook, authorId: string): { book: ZoneBook; id: string } {
  const id = `zone-${book.draft.length + 1}`;
  const created = zone({ id, code: `N${book.draft.length + 1}`, name: "New zone", kind: "operating", points: [] });
  return {
    id,
    book: { ...book, authorId, status: "draft", draft: [...book.draft, created] },
  };
}

export function archiveZone(book: ZoneBook, zoneId: string, authorId: string): ZoneBook {
  return patchZone(book, zoneId, { archived: true, active: false }, authorId);
}

export function addPickup(book: ZoneBook, zoneId: string, pickup: PickupPoint, authorId: string): ZoneBook {
  return {
    ...book,
    authorId,
    status: "draft",
    draft: book.draft.map((item) => (item.id === zoneId ? { ...item, pickups: [...item.pickups, pickup] } : item)),
  };
}

export function restoreZone(book: ZoneBook, zoneId: string, versionIndex: number, authorId: string): { book: ZoneBook; error?: string } {
  const snapshot = book.versions[versionIndex]?.find((item) => item.id === zoneId);
  if (!snapshot) return { book, error: "That version has no such zone." };
  return {
    book: patchZone(book, zoneId, { ...snapshot, id: zoneId }, authorId),
  };
}

function closedRing(points: [number, number][]): [number, number][] {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  return ring;
}

function asPolygon(zone: ZoneShape, withHoles: boolean) {
  const ring = closedRing(zone.points);
  if (ring.length < 4) return null;
  const holes = withHoles ? zone.holes.map((hole) => closedRing(hole)).filter((hole) => hole.length >= 4) : [];
  return polygon([ring, ...holes]);
}

export function zoneAreaKm(zone: ZoneShape): number {
  const shape = asPolygon(zone, true);
  if (!shape) return 0;
  return area(shape) / 1_000_000;
}

export function validateZones(zones: ZoneShape[]): ZoneIssue[] {
  const issues: ZoneIssue[] = [];
  const live = zones.filter((item) => !item.archived);
  const service = live.filter((item) => item.kind === "service").map((item) => ({ item, shape: asPolygon(item, false) }));
  const operating = live.filter((item) => item.kind === "operating");

  for (const item of live) {
    if (item.kind === "pickup") {
      if (item.points.length < 1) issues.push({ level: "error", zoneId: item.id, message: `${item.name} needs a point.` });
      continue;
    }
    if (item.points.length < 3) {
      issues.push({ level: "error", zoneId: item.id, message: `${item.name} needs at least 3 points.` });
      continue;
    }
    const shape = asPolygon(item, false);
    if (!shape) {
      issues.push({ level: "error", zoneId: item.id, message: `${item.name} is not a closed polygon.` });
      continue;
    }
    if (kinks(shape).features.length > 0) {
      issues.push({ level: "error", zoneId: item.id, message: `${item.name} crosses itself.` });
      continue;
    }
    for (const hole of item.holes) {
      const inner = polygon([closedRing(hole)]);
      if (hole.length < 3 || kinks(inner).features.length > 0 || !booleanWithin(inner, shape)) {
        issues.push({ level: "error", zoneId: item.id, message: `${item.name} has a hole outside the shape.` });
      }
    }
    const squareKm = zoneAreaKm(item);
    if (item.kind === "service" && squareKm > 500) {
      issues.push({ level: "warn", zoneId: item.id, message: `${item.name} is the service area.` });
    } else if (squareKm > 500) {
      issues.push({ level: "warn", zoneId: item.id, message: `${item.name} is ${squareKm.toFixed(0)} km². Check it is not larger than intended.` });
    }
    if (squareKm < 0.01) issues.push({ level: "warn", zoneId: item.id, message: `${item.name} is under 0.01 km².` });
    if (item.points.length > 1000) issues.push({ level: "warn", zoneId: item.id, message: `${item.name} has more than 1,000 points.` });
    if (item.kind === "operating") {
      const inside = service.some((entry) => entry.shape && booleanWithin(shape, entry.shape));
      if (!inside) issues.push({ level: "error", zoneId: item.id, message: `${item.name} is outside the service area.` });
    }
  }

  for (let i = 0; i < operating.length; i += 1) {
    for (let j = i + 1; j < operating.length; j += 1) {
      const left = operating[i];
      const right = operating[j];
      if (!left || !right) continue;
      const a = asPolygon(left, false);
      const b = asPolygon(right, false);
      if (!a || !b || left.points.length < 3 || right.points.length < 3) continue;
      if (kinks(a).features.length > 0 || kinks(b).features.length > 0) continue;
      if (booleanIntersects(a, b)) {
        issues.push({ level: "error", zoneId: left.id, message: `${left.name} overlaps ${right.name}. Operating zones cannot overlap.` });
      }
    }
  }
  return issues;
}

export function zonesAt(zones: ZoneShape[], lat: number, lng: number): ZoneShape[] {
  const probe = point([lng, lat]);
  return zones.filter((item) => {
    if (item.archived) return false;
    if (item.kind === "pickup") {
      return item.points.some(([zoneLat, zoneLng]) => Math.abs(zoneLat - lat) < 0.002 && Math.abs(zoneLng - lng) < 0.002);
    }
    const shape = asPolygon(item, false);
    if (!shape || item.points.length < 3 || kinks(shape).features.length > 0) return false;
    return booleanWithin(probe, shape);
  });
}

function blocking(zones: ZoneShape[]): ZoneIssue | undefined {
  return validateZones(zones).find((issue) => issue.level === "error");
}

export function submitReview(book: ZoneBook, actorId: string): { book: ZoneBook; error?: string } {
  const issue = blocking(book.draft);
  if (issue) return { book, error: issue.message };
  return { book: { ...book, authorId: actorId, status: "in_review" } };
}

export function publishZones(book: ZoneBook, actorId: string): { book: ZoneBook; error?: string } {
  if (book.status !== "in_review") return { book, error: "Send the draft for review before publishing." };
  if (actorId === book.authorId) return { book, error: "A second agent must publish." };
  const issue = blocking(book.draft);
  if (issue) return { book, error: issue.message };
  const snapshot = cloneZones(book.draft);
  return { book: { ...book, authorId: actorId, status: "draft", published: snapshot, versions: [...book.versions, snapshot] } };
}

export function rollbackZones(book: ZoneBook): ZoneBook {
  if (book.versions.length < 2) return book;
  const versions = book.versions.slice(0, -1);
  const published = versions[versions.length - 1] ?? [];
  return { ...book, status: "draft", versions, published: cloneZones(published), draft: cloneZones(published) };
}

export type ZoneImpact = {
  areaKm: number;
  deltaKm: number;
  drivers: number;
  trips: number;
  reservations: number;
  feeChanges: string[];
};

export function activityPoints(): ActivityPoint[] {
  return [
    { id: "drv-1", kind: "driver", name: "Erik Lind", lat: 59.335, lng: 18.06, online: true },
    { id: "drv-2", kind: "driver", name: "Sara Berg", lat: 59.31, lng: 18.06, online: true },
    { id: "drv-3", kind: "driver", name: "Noah Ek", lat: 59.34, lng: 18.1, online: true },
    { id: "drv-4", kind: "driver", name: "Maja Holm", lat: 59.332, lng: 18.02, online: false },
    { id: "drv-5", kind: "driver", name: "Lars Dahl", lat: 59.355, lng: 18.05, online: true },
    { id: "drv-6", kind: "driver", name: "Ingrid Sand", lat: 59.335, lng: 17.93, online: true },
    { id: "trip-1", kind: "trip", name: "T0001", lat: 59.336, lng: 18.064, online: true },
    { id: "trip-2", kind: "trip", name: "T0008", lat: 59.338, lng: 18.095, online: true },
    { id: "trip-3", kind: "trip", name: "T0014", lat: 59.648, lng: 17.91, online: true },
    { id: "res-1", kind: "trip", name: "B0003", lat: 59.348, lng: 18.04, online: true },
    { id: "q-1", kind: "queue", name: "Queue 1", lat: 59.64, lng: 17.9, online: true },
    { id: "q-2", kind: "queue", name: "Queue 2", lat: 59.655, lng: 17.93, online: true },
    { id: "q-3", kind: "queue", name: "Queue 3", lat: 59.358, lng: 17.85, online: true },
  ];
}

function countInside(zones: ZoneShape[], kind: ActivityPoint["kind"]): number {
  return activityPoints().filter((item) => item.kind === kind && zonesAt(zones, item.lat, item.lng).length > 0).length;
}

function serviceKm(zones: ZoneShape[]): number {
  const service = zones.find((item) => item.kind === "service" && !item.archived);
  return service ? zoneAreaKm(service) : 0;
}

export function zoneImpact(published: ZoneShape[], draft: ZoneShape[]): ZoneImpact {
  const before = serviceKm(published);
  const after = serviceKm(draft);
  const feeChanges = draft.flatMap((item) => {
    const previous = published.find((zone) => zone.id === item.id);
    if (!previous || previous.zoneFeeOre === item.zoneFeeOre) return [];
    return [`${item.name} ${previous.zoneFeeOre / 100} kr → ${item.zoneFeeOre / 100} kr`];
  });
  const reservations = activityPoints().filter((item) => item.id.startsWith("res-") && zonesAt(draft, item.lat, item.lng).length > 0).length;
  return {
    areaKm: after,
    deltaKm: after - before,
    drivers: activityPoints().filter((item) => item.kind === "driver" && item.online && zonesAt(draft, item.lat, item.lng).length > 0).length,
    trips: countInside(draft, "trip") - reservations,
    reservations,
    feeChanges,
  };
}

export function zonesToGeoJSON(zones: ZoneShape[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const item of zones) {
    if (item.archived) continue;
    const color = ZONE_COLOR[item.kind];
    if (item.kind === "pickup") {
      const [lat, lng] = item.points[0] ?? [59.33, 18.06];
      features.push({ type: "Feature", properties: { id: item.id, name: item.name, kind: item.kind, color }, geometry: { type: "Point", coordinates: [lng, lat] } });
      continue;
    }
    if (item.points.length < 3) continue;
    const holes = item.holes.map((hole) => closedRing(hole)).filter((hole) => hole.length >= 4);
    features.push({
      type: "Feature",
      properties: { id: item.id, name: item.name, kind: item.kind, color },
      geometry: { type: "Polygon", coordinates: [closedRing(item.points), ...holes] },
    });
  }
  return { type: "FeatureCollection", features };
}

export function geoJSONToZones(raw: string, book: ZoneBook, authorId: string): { book: ZoneBook; error?: string } {
  let parsed: GeoJSON.FeatureCollection;
  try {
    parsed = JSON.parse(raw) as GeoJSON.FeatureCollection;
  } catch {
    return { book, error: "That file is not JSON." };
  }
  if (!parsed || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    return { book, error: "GeoJSON must be a FeatureCollection." };
  }
  const draft = book.draft.map((item) => ({ ...item }));
  for (const feature of parsed.features) {
    if (feature.type !== "Feature" || !feature.geometry) continue;
    const name = String(feature.properties?.name ?? "");
    const target = draft.find((item) => item.name === name || item.id === feature.properties?.id);
    if (!target) continue;
    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates;
      target.points = [[lat ?? 0, lng ?? 0]];
    }
    if (feature.geometry.type === "Polygon") {
      const rings = feature.geometry.coordinates;
      const outer = rings[0];
      if (!outer) continue;
      target.points = outer.slice(0, -1).map(([lng, lat]) => [lat ?? 0, lng ?? 0]);
      target.holes = rings.slice(1).map((ring) => ring.slice(0, -1).map(([lng, lat]) => [lat ?? 0, lng ?? 0]));
    }
  }
  return { book: { ...book, authorId, status: "draft", draft } };
}

export const ADDRESS_BOOK: { name: string; lat: number; lng: number }[] = [
  { name: "Östermalm, Stockholm", lat: 59.341, lng: 18.095 },
  { name: "Norrmalm, Stockholm", lat: 59.335, lng: 18.062 },
  { name: "Södermalm, Stockholm", lat: 59.312, lng: 18.07 },
  { name: "Arlanda Airport", lat: 59.649, lng: 17.923 },
  { name: "Bromma Airport", lat: 59.358, lng: 17.855 },
  { name: "Södertälje", lat: 59.195, lng: 17.628 },
  { name: "Kista", lat: 59.41, lng: 17.94 },
];
