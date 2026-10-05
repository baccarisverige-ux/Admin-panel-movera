export type ZoneKind = "operating" | "airport" | "no_pickup" | "boost" | "event";

export type ZoneShape = {
  id: string;
  name: string;
  kind: ZoneKind;
  points: [number, number][];
};

export type ZoneBook = {
  authorId: string;
  draft: ZoneShape[];
  published: ZoneShape[];
  versions: ZoneShape[][];
};

function box(lat: number, lng: number, d = 0.012): [number, number][] {
  return [
    [lat - d, lng - d],
    [lat - d, lng + d],
    [lat + d, lng + d],
    [lat + d, lng - d],
  ];
}

export function stockholmZones(): ZoneShape[] {
  const operating: Array<[string, string, number, number]> = [
    ["op-norrmalm", "Norrmalm", 59.334, 18.063],
    ["op-sodermalm", "Södermalm", 59.315, 18.07],
    ["op-ostermalm", "Östermalm", 59.338, 18.09],
    ["op-vasastan", "Vasastan", 59.346, 18.048],
    ["op-kungsholmen", "Kungsholmen", 59.33, 18.03],
    ["op-solna", "Solna", 59.36, 18.0],
    ["op-bromma", "Bromma", 59.34, 17.96],
    ["op-hagersten", "Hägersten", 59.3, 17.98],
    ["op-farsta", "Farsta", 59.244, 18.09],
  ];
  return [
    ...operating.map(([id, name, lat, lng]) => ({ id, name, kind: "operating" as const, points: box(lat, lng) })),
    { id: "air-arlanda", name: "Arlanda", kind: "airport", points: box(59.649, 17.923, 0.03) },
    { id: "air-bromma", name: "Bromma airport", kind: "airport", points: box(59.354, 17.942, 0.015) },
    { id: "nopick-1", name: "Drottninggatan no pickup", kind: "no_pickup", points: box(59.332, 18.06, 0.003) },
    { id: "boost-1", name: "Centralen boost", kind: "boost", points: box(59.33, 18.058, 0.006) },
    { id: "event-1", name: "Tele2 event", kind: "event", points: box(59.29, 18.085, 0.008) },
  ];
}

export function emptyBook(authorId = "nora"): ZoneBook {
  const seed = stockholmZones();
  return { authorId, draft: seed, published: seed, versions: [seed] };
}

export function updateDraft(book: ZoneBook, zoneId: string, points: [number, number][], authorId: string): ZoneBook {
  return {
    ...book,
    authorId,
    draft: book.draft.map((zone) => (zone.id === zoneId ? { ...zone, points } : zone)),
  };
}

export function publishZones(book: ZoneBook, actorId: string): { book: ZoneBook; error?: string } {
  if (actorId === book.authorId) return { book, error: "A second agent must publish." };
  const snapshot = book.draft.map((zone) => ({ ...zone, points: zone.points.map((point) => [...point] as [number, number]) }));
  return { book: { ...book, published: snapshot, versions: [...book.versions, snapshot] } };
}

export function rollbackZones(book: ZoneBook): ZoneBook {
  if (book.versions.length < 2) return book;
  const versions = book.versions.slice(0, -1);
  const published = versions[versions.length - 1] ?? [];
  return { ...book, versions, published, draft: published };
}
