import { useSyncExternalStore } from "react";
import {
  ADDRESS_BOOK,
  addHole,
  addPickup,
  archiveZone,
  createZone,
  emptyBook,
  geoJSONToZones,
  kmlToZones,
  mergeZones,
  normalizeZoneBook,
  patchZone,
  publishZones,
  reorderZonePriorities,
  restoreZone,
  rollbackZones,
  rotateZone,
  setOuter,
  splitZone,
  submitReview,
  type PickupPoint,
  type ZoneBook,
  type ZoneShape,
} from "./releases";

export type DrawTool = "render" | "polygon" | "rectangle" | "circle" | "freehand" | "point" | "select" | "hole";

export type ZoneLayers = {
  drivers: boolean;
  trips: boolean;
  requests: boolean;
  demandHour: boolean;
  demand7d: boolean;
  pickups: boolean;
  queue: boolean;
  boosts: boolean;
  events: boolean;
};

export type ZoneFocus = { lat: number; lng: number; nonce: number };

export type ZoneUi = {
  book: ZoneBook;
  selectedId: string;
  tool: DrawTool;
  notice: string;
  focus: ZoneFocus | null;
  selectionNonce: number;
  layers: ZoneLayers;
  past: ZoneBook[];
  future: ZoneBook[];
};

const STORE_KEY = "movera-admin-zones-v3";

function loadBook(): ZoneBook {
  if (typeof localStorage === "undefined") return emptyBook();
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyBook();
  try {
    const parsed = JSON.parse(raw) as ZoneBook;
    if (!parsed?.draft?.length || !parsed.draft[0]?.code || !parsed.published || !Array.isArray(parsed.versions)) return emptyBook();
    return normalizeZoneBook(parsed);
  } catch {
    return emptyBook();
  }
}

let coalesce = false;
let state: ZoneUi = {
  book: loadBook(),
  selectedId: "op-norrmalm",
  tool: "render",
  notice: "Pick a zone, draw with Terra Draw, then send it for review. A second agent publishes.",
  focus: null,
  selectionNonce: 0,
  layers: {
    drivers: true,
    trips: true,
    requests: true,
    demandHour: false,
    demand7d: false,
    pickups: true,
    queue: true,
    boosts: true,
    events: true,
  },
  past: [],
  future: [],
};

const listeners = new Set<() => void>();

function emit() {
  if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(state.book));
  listeners.forEach((listener) => listener());
}

function update(recipe: (current: ZoneUi) => ZoneUi) {
  state = recipe(state);
  emit();
}

function remember(book: ZoneBook, notice: string, extra?: Partial<ZoneUi>) {
  coalesce = false;
  update((current) => ({
    ...current,
    ...extra,
    notice,
    book,
    past: [...current.past, current.book].slice(-50),
    future: [],
  }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useZoneUi(): ZoneUi {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const zoneStore = {
  select(id: string) {
    coalesce = false;
    update((current) => ({ ...current, selectedId: id, selectionNonce: current.selectionNonce + 1 }));
  },
  setTool(tool: DrawTool) {
    coalesce = false;
    update((current) => ({ ...current, tool }));
  },
  cancelTool() {
    coalesce = false;
    update((current) => ({ ...current, tool: "render", notice: "Drawing cancelled." }));
  },
  toggleLayer(layer: keyof ZoneLayers) {
    update((current) => ({ ...current, layers: { ...current.layers, [layer]: !current.layers[layer] } }));
  },
  search(query: string) {
    const hit = ADDRESS_BOOK.find((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (!hit) {
      update((current) => ({ ...current, notice: "No matching address." }));
      return;
    }
    update((current) => ({
      ...current,
      focus: { lat: hit.lat, lng: hit.lng, nonce: (current.focus?.nonce ?? 0) + 1 },
      notice: `Moved to ${hit.name}.`,
    }));
  },
  undo() {
    coalesce = false;
    update((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return { ...current, notice: "Nothing to undo." };
      return {
        ...current,
        book: previous,
        past: current.past.slice(0, -1),
        future: [...current.future, current.book].slice(-50),
        notice: "Undone.",
      };
    });
  },
  redo() {
    coalesce = false;
    update((current) => {
      const next = current.future[current.future.length - 1];
      if (!next) return { ...current, notice: "Nothing to redo." };
      return {
        ...current,
        book: next,
        future: current.future.slice(0, -1),
        past: [...current.past, current.book].slice(-50),
        notice: "Redone.",
      };
    });
  },
  replace(zoneId: string, points: [number, number][], authorId: string) {
    const name = state.book.draft.find((zone) => zone.id === zoneId)?.name ?? "zone";
    remember(setOuter(state.book, zoneId, points, authorId, false), `Updated ${name}. Draft only.`);
  },
  cut(zoneId: string, hole: [number, number][], authorId: string) {
    const result = addHole(state.book, zoneId, hole, authorId);
    const name = state.book.draft.find((zone) => zone.id === zoneId)?.name ?? "zone";
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "The hole was rejected." }));
    else remember(result.book, `Cut a hole in ${name}.`);
  },
  edit(zoneId: string, points: [number, number][], authorId: string) {
    const book = setOuter(state.book, zoneId, points, authorId, true);
    if (!coalesce) {
      coalesce = true;
      update((current) => ({
        ...current,
        book,
        past: [...current.past, current.book].slice(-50),
        future: [],
        notice: "Editing points.",
      }));
      return;
    }
    update((current) => ({ ...current, book, notice: "Editing points." }));
  },
  place(zoneId: string, points: [number, number][], authorId: string) {
    const zone = state.book.draft.find((item) => item.id === zoneId);
    const point = points[0];
    if (!zone || !point) return;
    if (zone.kind === "pickup") {
      remember(setOuter(state.book, zoneId, [point], authorId, false), `Moved ${zone.name}.`);
      return;
    }
    const pickup: PickupPoint = { id: `pin-${Date.now()}`, name: "Map pin", lat: point[0], lng: point[1], instructions: "", photoUrl: "" };
    remember(addPickup(state.book, zoneId, pickup, authorId), `Pickup added in ${zone.name}.`);
  },
  review(actorId: string) {
    const result = submitReview(state.book, actorId);
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "Review blocked." }));
    else update((current) => ({ ...current, book: result.book, notice: "In review. A different agent can publish." }));
  },
  publish(actorId: string) {
    const result = publishZones(state.book, actorId);
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "Publish blocked." }));
    else update((current) => ({ ...current, book: result.book, notice: `Published version ${result.book.versions.length}.` }));
  },
  rollback(actorId?: string) {
    update((current) => {
      const next = rollbackZones(current.book, actorId ?? current.book.authorId);
      return {
        ...current,
        book: next,
        notice: next === current.book ? "No previous published zones to restore." : "Rolled back to the previous published zones.",
      };
    });
  },
  create(authorId: string) {
    const result = createZone(state.book, authorId);
    coalesce = false;
    update((current) => ({
      ...current,
      book: result.book,
      past: [...current.past, current.book].slice(-50),
      future: [],
      selectedId: result.id,
      selectionNonce: current.selectionNonce + 1,
      tool: "polygon",
      notice: "Drawing New zone. Click the map, then press Enter.",
    }));
    return result.id;
  },
  archive(zoneId: string, authorId: string) {
    const name = state.book.draft.find((zone) => zone.id === zoneId)?.name ?? "zone";
    remember(archiveZone(state.book, zoneId, authorId), `Archived ${name}.`);
  },
  patch(zoneId: string, patch: Partial<ZoneShape>, authorId: string) {
    const name = state.book.draft.find((zone) => zone.id === zoneId)?.name ?? "zone";
    remember(patchZone(state.book, zoneId, patch, authorId), `Saved ${name}.`);
  },
  addPickup(zoneId: string, pickup: PickupPoint, authorId: string) {
    const name = state.book.draft.find((zone) => zone.id === zoneId)?.name ?? "zone";
    remember(addPickup(state.book, zoneId, pickup, authorId), `Pickup added in ${name}.`);
  },
  restore(zoneId: string, versionIndex: number, authorId: string) {
    const result = restoreZone(state.book, zoneId, versionIndex, authorId);
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "Restore failed." }));
    else remember(result.book, `Restored version ${versionIndex + 1}.`);
  },
  importGeo(raw: string, authorId: string) {
    const result = geoJSONToZones(raw, state.book, authorId);
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "Import failed." }));
    else remember(result.book, "Imported GeoJSON into matching zones.");
  },
  importKml(raw: string, authorId: string) {
    const result = kmlToZones(raw, state.book, authorId);
    if (result.error) update((current) => ({ ...current, notice: result.error ?? "KML import failed." }));
    else remember(result.book, "Imported KML into matching zones.");
  },
  rotate(zoneId: string, degrees: number, authorId: string) {
    const before = state.book;
    const next = rotateZone(before, zoneId, degrees, authorId);
    if (next === before) {
      update((current) => ({ ...current, notice: "Select a polygon zone to rotate." }));
      return;
    }
    remember(next, `Rotated selected zone ${degrees}°.`);
  },
  split(zoneId: string, authorId: string) {
    const result = splitZone(state.book, zoneId, authorId);
    if (result.error) {
      update((current) => ({ ...current, notice: result.error ?? "Split failed." }));
      return;
    }
    remember(result.book, "Split the selected rectangular zone.", result.newId ? { selectedId: result.newId, selectionNonce: state.selectionNonce + 1 } : undefined);
  },
  merge(targetId: string, sourceId: string, authorId: string) {
    const result = mergeZones(state.book, targetId, sourceId, authorId);
    if (result.error) {
      update((current) => ({ ...current, notice: result.error ?? "Merge failed." }));
      return;
    }
    remember(result.book, `Merged ${sourceId} into ${targetId}; the source id was archived.`);
  },
  reorderPriority(orderedIds: string[], authorId: string) {
    remember(reorderZonePriorities(state.book, orderedIds, authorId), "Updated overlap priority.");
  },
};
