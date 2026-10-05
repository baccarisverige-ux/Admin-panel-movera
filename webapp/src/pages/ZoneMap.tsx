import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import {
  emptyBook,
  publishZones,
  rollbackZones,
  submitReview,
  updateDraft,
  validateZones,
  zoneTypeLabel,
  zonesAt,
  type ZoneBook,
  type ZoneShape,
} from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";
import { mapProviderLabel, ZoneCanvas, type DrawMode } from "./ZoneCanvas";

const STORE_KEY = "movera-admin-zones-v2";

function loadBook(): ZoneBook {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyBook();
  try {
    const parsed = JSON.parse(raw) as ZoneBook;
    if (!parsed?.draft || !parsed.published || !Array.isArray(parsed.versions)) return emptyBook();
    if (parsed.status !== "draft" && parsed.status !== "in_review") return { ...parsed, status: "draft" };
    return parsed;
  } catch {
    return emptyBook();
  }
}

export function ZoneMap() {
  const { agent } = useSession();
  const [book, setBook] = useState<ZoneBook>(() => loadBook());
  const [selected, setSelected] = useState("op-norrmalm");
  const [mode, setMode] = useState<DrawMode>("render");
  const [notice, setNotice] = useState("Pick a zone, draw with Terra Draw, then send it for review. A second agent publishes.");
  const [probe, setProbe] = useState("59.334, 18.063");

  function save(next: ZoneBook, text: string) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setBook(next);
    setNotice(text);
  }

  const selectedZone: ZoneShape | undefined = book.draft.find((zone) => zone.id === selected);
  const issues = validateZones(book.draft);
  const hits = (() => {
    const [latRaw, lngRaw] = probe.split(",");
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return zonesAt(book.draft, lat, lng);
  })();

  return (
    <article className="panel">
      <div className="panel-title-row">
        <h3>Stockholm zones</h3>
        <div className="actions">
          <CommandButton command="admin.zone.drawPolygon" className="secondary-btn" type="button" onDone={() => setMode("polygon")}>
            Draw polygon
          </CommandButton>
          <CommandButton command="admin.zone.drawRectangle" className="secondary-btn" type="button" onDone={() => setMode("rectangle")}>
            Draw rectangle
          </CommandButton>
          <CommandButton command="admin.zone.drawPoint" className="secondary-btn" type="button" onDone={() => setMode("point")}>
            Place pickup point
          </CommandButton>
          <CommandButton command="admin.zone.review" className="secondary-btn" type="button" onDone={() => {
            if (!agent) return;
            const result = submitReview(book, agent.id);
            if (result.error) setNotice(result.error);
            else save(result.book, "In review. A different agent can publish.");
          }}>
            Send for review
          </CommandButton>
          <CommandButton command="admin.zone.publish" className="primary-btn" type="button" onDone={() => {
            if (!agent) return;
            const result = publishZones(book, agent.id);
            if (result.error) setNotice(result.error);
            else save(result.book, `Published version ${result.book.versions.length}.`);
          }}>
            Publish
          </CommandButton>
          <CommandButton command="admin.zone.rollback" className="secondary-btn" type="button" onDone={() => save(rollbackZones(book), "Rolled back to the previous published zones.")}>
            Roll back
          </CommandButton>
        </div>
      </div>
      <p className="state-line">
        {notice} Map: {mapProviderLabel()}. Drawing: Terra Draw. Status: {book.status === "in_review" ? "in review" : "draft"}. Versions: {book.versions.length}.
      </p>
      <label>
        Zone
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          {book.draft.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name} · {zoneTypeLabel(zone.kind)}
            </option>
          ))}
        </select>
      </label>
      <p className="state-line">Selected: {selectedZone?.name} ({selectedZone ? zoneTypeLabel(selectedZone.kind) : "none"}).</p>
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
        zones={book.draft}
        selectedId={selected}
        mode={mode}
        onDrawn={(points) => {
          if (!agent || !selectedZone) return;
          save(updateDraft(book, selected, points, agent.id), `Updated ${selectedZone.name}. Draft only.`);
          setMode("render");
        }}
      />
    </article>
  );
}
