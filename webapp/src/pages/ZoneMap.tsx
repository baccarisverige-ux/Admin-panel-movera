import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useSession } from "../auth/SessionContext";
import { emptyBook, publishZones, rollbackZones, updateDraft, type ZoneBook, type ZoneShape } from "../zones/releases";

const STORE_KEY = "movera-admin-zones";

function loadBook(): ZoneBook {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyBook();
  try {
    return JSON.parse(raw) as ZoneBook;
  } catch {
    return emptyBook();
  }
}

export function ZoneMap() {
  const { agent } = useSession();
  const mapRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<ZoneBook>(() => loadBook());
  const [selected, setSelected] = useState("op-norrmalm");
  const [notice, setNotice] = useState("Click the map to add a corner to the selected zone.");

  function save(next: ZoneBook, text: string) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setBook(next);
    setNotice(text);
  }

  useEffect(() => {
    const host = mapRef.current;
    if (!host) return;
    let alive = true;
    let map: { remove: () => void } | null = null;
    void import("leaflet").then((leaflet) => {
      if (!alive || !mapRef.current) return;
      const L = leaflet.default;
      const view = L.map(mapRef.current).setView([59.33, 18.06], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(view);
      for (const zone of book.draft) {
        L.polygon(zone.points, { color: zone.id === selected ? "#1FA463" : "#111614", weight: 2 }).addTo(view);
      }
      view.on("click", (event) => {
        const zone = book.draft.find((item) => item.id === selected);
        if (!zone || !agent) return;
        const points = [...zone.points, [event.latlng.lat, event.latlng.lng] as [number, number]];
        save(updateDraft(book, selected, points, agent.id), `Added a corner to ${zone.name}. Draft only.`);
      });
      map = view;
    });
    return () => {
      alive = false;
      map?.remove();
    };
  }, [book, selected, agent]);

  const selectedZone: ZoneShape | undefined = book.draft.find((zone) => zone.id === selected);

  return (
    <article className="panel">
      <div className="panel-title-row">
        <h3>Stockholm zones</h3>
        <div className="actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              if (!agent) return;
              const result = publishZones(book, agent.id);
              if (result.error) setNotice(result.error);
              else save(result.book, `Published version ${result.book.versions.length}.`);
            }}
          >
            Publish
          </button>
          <button className="secondary-btn" type="button" onClick={() => save(rollbackZones(book), "Rolled back to the previous published zones.")}>
            Roll back
          </button>
        </div>
      </div>
      <p className="state-line">{notice} Published versions: {book.versions.length}. Selected: {selectedZone?.name} ({selectedZone?.kind}).</p>
      <label>
        Zone
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          {book.draft.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name} · {zone.kind}
            </option>
          ))}
        </select>
      </label>
      <div ref={mapRef} className="live-map" />
    </article>
  );
}
