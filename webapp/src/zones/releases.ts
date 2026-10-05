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

export type ZoneShape = {
  id: string;
  name: string;
  kind: ZoneKind;
  points: [number, number][];
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

function box(lat: number, lng: number, d = 0.006): [number, number][] {
  return [
    [lat - d, lng - d],
    [lat - d, lng + d],
    [lat + d, lng + d],
    [lat + d, lng - d],
  ];
}

function rect(south: number, west: number, north: number, east: number): [number, number][] {
  return [
    [south, west],
    [south, east],
    [north, east],
    [north, west],
  ];
}

export function zoneTypeLabel(kind: ZoneKind): string {
  return ZONE_TYPES.find((item) => item.id === kind)?.label ?? kind;
}

export function stockholmZones(): ZoneShape[] {
  const operating: Array<[string, string, number, number]> = [
    ["op-norrmalm", "Norrmalm", 59.334, 18.063],
    ["op-sodermalm", "Södermalm", 59.312, 18.07],
    ["op-ostermalm", "Östermalm", 59.341, 18.095],
    ["op-kungsholmen", "Kungsholmen", 59.332, 18.028],
    ["op-vasastan", "Vasastan", 59.352, 18.045],
    ["op-bromma", "Bromma", 59.34, 17.94],
    ["op-solna", "Solna", 59.368, 18.0],
    ["op-kista", "Kista", 59.403, 17.945],
    ["op-sodertalje", "Södertälje", 59.195, 17.628],
  ];
  return [
    { id: "svc-stockholm", name: "Greater Stockholm", kind: "service", points: rect(59.1, 17.45, 59.75, 18.35) },
    ...operating.map(([id, name, lat, lng]) => ({ id, name, kind: "operating" as const, points: box(lat, lng) })),
    { id: "air-arlanda", name: "Arlanda", kind: "airport", points: box(59.649, 17.923, 0.02) },
    { id: "air-bromma", name: "Bromma airport", kind: "airport", points: box(59.354, 17.868, 0.01) },
    { id: "boost-1", name: "Friday night Stureplan", kind: "boost", points: box(59.336, 18.073, 0.003) },
    { id: "event-1", name: "Tele2 event", kind: "event", points: box(59.29, 18.085, 0.008) },
    { id: "nopick-1", name: "Drottninggatan no pickup", kind: "no_pickup", points: box(59.3325, 18.0635, 0.0015) },
    { id: "restricted-1", name: "Depot", kind: "restricted", points: box(59.31, 18.11, 0.004) },
    { id: "fleet-1", name: "Partner north", kind: "fleet", points: box(59.42, 17.99, 0.02) },
    { id: "pin-t5", name: "Terminal 5", kind: "pickup", points: [[59.6498, 17.928]] },
  ];
}

function cloneZones(zones: ZoneShape[]): ZoneShape[] {
  return zones.map((zone) => ({ ...zone, points: zone.points.map((corner) => [...corner] as [number, number]) }));
}

export function emptyBook(authorId = "nora"): ZoneBook {
  const seed = stockholmZones();
  return { authorId, status: "draft", draft: seed, published: seed, versions: [seed] };
}

export function updateDraft(book: ZoneBook, zoneId: string, points: [number, number][], authorId: string): ZoneBook {
  return {
    ...book,
    authorId,
    status: "draft",
    draft: book.draft.map((zone) => (zone.id === zoneId ? { ...zone, points } : zone)),
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

function asPolygon(zone: ZoneShape) {
  const ring = closedRing(zone.points);
  if (ring.length < 4) return null;
  return polygon([ring]);
}

export function validateZones(zones: ZoneShape[]): ZoneIssue[] {
  const issues: ZoneIssue[] = [];
  const service = zones.filter((zone) => zone.kind === "service").map((zone) => ({ zone, shape: asPolygon(zone) }));
  const operating = zones.filter((zone) => zone.kind === "operating");

  for (const zone of zones) {
    if (zone.kind === "pickup") {
      if (zone.points.length < 1) issues.push({ level: "error", zoneId: zone.id, message: `${zone.name} needs a point.` });
      continue;
    }
    if (zone.points.length < 3) {
      issues.push({ level: "error", zoneId: zone.id, message: `${zone.name} needs at least 3 points.` });
      continue;
    }
    const shape = asPolygon(zone);
    if (!shape) {
      issues.push({ level: "error", zoneId: zone.id, message: `${zone.name} is not a closed polygon.` });
      continue;
    }
    if (kinks(shape).features.length > 0) {
      issues.push({ level: "error", zoneId: zone.id, message: `${zone.name} crosses itself.` });
      continue;
    }
    const squareKm = area(shape) / 1_000_000;
    if (squareKm > 500) issues.push({ level: "warn", zoneId: zone.id, message: `${zone.name} is ${squareKm.toFixed(0)} km². Check it is not larger than intended.` });
    if (squareKm < 0.01) issues.push({ level: "warn", zoneId: zone.id, message: `${zone.name} is under 0.01 km².` });
    if (zone.points.length > 1000) issues.push({ level: "warn", zoneId: zone.id, message: `${zone.name} has more than 1,000 points.` });
    if (zone.kind === "operating") {
      const inside = service.some((item) => item.shape && booleanWithin(shape, item.shape));
      if (!inside) issues.push({ level: "error", zoneId: zone.id, message: `${zone.name} is outside the service area.` });
    }
  }

  for (let i = 0; i < operating.length; i += 1) {
    for (let j = i + 1; j < operating.length; j += 1) {
      const left = operating[i];
      const right = operating[j];
      if (!left || !right) continue;
      const a = asPolygon(left);
      const b = asPolygon(right);
      if (!a || !b) continue;
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
  return zones.filter((zone) => {
    if (zone.kind === "pickup") {
      return zone.points.some(([zoneLat, zoneLng]) => Math.abs(zoneLat - lat) < 0.0008 && Math.abs(zoneLng - lng) < 0.0008);
    }
    const shape = asPolygon(zone);
    if (!shape || zone.points.length < 3 || kinks(shape).features.length > 0) return false;
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
  return { ...book, status: "draft", versions, published, draft: cloneZones(published) };
}
