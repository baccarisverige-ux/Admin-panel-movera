import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Car,
  Check,
  Circle,
  CircleCheck,
  Copy,
  FileUp,
  Grid3x3,
  MapPinned,
  PenLine,
  Pentagon,
  Scissors,
  Sparkles,
  Square,
  Users,
  X,
} from "lucide-react";
import { useSession } from "../auth/SessionContext";
import type { MarketId } from "../markets/markets";
import { NumberField } from "../pricing/NumberField";
import { CommandButton } from "../ui/CommandButton";
import { citiesOf, cityById, PLACES, type City } from "../zones/cities";
import { zoneStore, useZoneUi, type DrawTool } from "../zones/bookStore";
import {
  activityInside,
  circleRing,
  cityGaps,
  clipToCity,
  displayName,
  firstShapeFromFile,
  joinShapes,
  removeOverlaps,
  ringAreaKm,
  ringSizeKm,
  shapeChecks,
  suggestCode,
  suggestedShape,
  ZONE_COLOR,
  ZONE_TYPES,
  type ZoneKind,
  type ZoneShape,
} from "../zones/releases";

export type WizardOverlay = { districts?: { ring: [number, number][]; name: string; picked: boolean }[]; outline?: [number, number][] };

type Method = "city" | "districts" | "polygon" | "rectangle" | "circle" | "address" | "freehand" | "copy" | "import" | "suggest";

const METHODS: { id: Method; label: string; hint: string; icon: ReactNode; draw?: DrawTool }[] = [
  { id: "city", label: "Whole city", hint: "The full city area", icon: <Building2 size={18} /> },
  { id: "districts", label: "Pick districts", hint: "Join neighbourhoods", icon: <Grid3x3 size={18} /> },
  { id: "polygon", label: "Draw shape", hint: "Click point by point", icon: <Pentagon size={18} />, draw: "polygon" },
  { id: "rectangle", label: "Rectangle", hint: "Drag a box", icon: <Square size={18} />, draw: "rectangle" },
  { id: "circle", label: "Circle", hint: "Centre and size", icon: <Circle size={18} />, draw: "circle" },
  { id: "address", label: "Address + distance", hint: "Around a place", icon: <MapPinned size={18} /> },
  { id: "freehand", label: "Free hand", hint: "Draw with mouse or finger", icon: <PenLine size={18} />, draw: "freehand" },
  { id: "copy", label: "Copy a zone", hint: "Start from another zone", icon: <Copy size={18} /> },
  { id: "import", label: "Import file", hint: "GeoJSON or KML", icon: <FileUp size={18} /> },
  { id: "suggest", label: "Suggested", hint: "Where riders book most", icon: <Sparkles size={18} /> },
];

const KINDS: ZoneKind[] = ["operating", "airport", "boost", "event", "no_pickup", "restricted", "fleet"];

const KIND_HINT: Partial<Record<ZoneKind, string>> = {
  operating: "Riders can book here",
  airport: "Queue, fees and pickup doors",
  boost: "Extra pay for drivers",
  event: "Concerts, matches, fairs",
  no_pickup: "No pickup or drop-off",
  restricted: "Drivers may not enter",
  fleet: "A fleet owner's area",
};

type Step = 1 | 2 | 3 | 4;

/** Make a new zone in four steps: city, type and name, how to make the shape, check and save. */
export function ZoneWizard({ country, startCity, onClose, onOverlay }: { country: MarketId; startCity?: string; onClose: () => void; onOverlay: (overlay: WizardOverlay) => void }) {
  const { agent } = useSession();
  const ui = useZoneUi();
  const cities = citiesOf(country);
  const [cityId, setCityId] = useState(startCity && cityById(startCity)?.country === country ? startCity : "");
  const [step, setStep] = useState<Step>(cityId ? 2 : 1);
  const [kind, setKind] = useState<ZoneKind>("operating");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [placeName, setPlaceName] = useState("");
  const [km, setKm] = useState(2);
  const [copyId, setCopyId] = useState("");
  const [settingsFrom, setSettingsFrom] = useState("");
  const [schedule, setSchedule] = useState<ZoneShape["schedule"]>("always");
  const [hours, setHours] = useState("22:00–06:00");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [goLive, setGoLive] = useState<"publish" | "later">("publish");
  const [goLiveAt, setGoLiveAt] = useState("");
  const [error, setError] = useState("");
  const city = cityById(cityId);
  const sketch = ui.sketch;
  const countryZones = useMemo(() => ui.book.draft.filter((zone) => zone.country === country && !zone.archived), [ui.book.draft, country]);
  const cityZones = countryZones.filter((zone) => zone.city === cityId);
  const autoCode = city ? suggestCode(city, name || "New", ui.book.draft) : "";
  const finalCode = codeTouched ? code : autoCode;
  const checks = useMemo(() => (sketch.length >= 3 && city ? shapeChecks(sketch, city, kind, ui.book.draft) : []), [sketch, city, kind, ui.book.draft]);
  const inside = useMemo(() => activityInside(sketch), [sketch]);
  const areaKm = ringAreaKm(sketch);
  const size = ringSizeKm(sketch);
  const blocking = checks.filter((issue) => issue.level === "error");

  useEffect(() => {
    if (!city) {
      onOverlay({});
      return;
    }
    onOverlay({
      outline: city.outline,
      districts: method === "districts" ? city.districts.map((item) => ({ ring: item.ring, name: item.name, picked: picked.includes(item.id) })) : undefined,
    });
  }, [city, method, picked]);

  useEffect(() => {
    if (city) zoneStore.focusOn(city.center[0], city.center[1]);
  }, [cityId]);

  function chooseCity(next: City) {
    setCityId(next.id);
    setStep(2);
    zoneStore.clearSketch();
  }

  function shape(points: [number, number][], notice: string) {
    setError("");
    zoneStore.setSketch(points, notice);
  }

  function chooseMethod(next: Method) {
    if (!city) return;
    setMethod(next);
    setError("");
    const spec = METHODS.find((item) => item.id === next);
    if (spec?.draw) {
      zoneStore.clearSketch();
      zoneStore.setTool(spec.draw, "sketch");
      zoneStore.notify(`${spec.label}: draw the new zone on the map.`);
      return;
    }
    zoneStore.setTool("render");
    if (next === "city") shape(city.outline.map((point) => [...point] as [number, number]), `The whole of ${city.name} is the shape.`);
    if (next === "suggest") {
      const result = suggestedShape(city);
      if (result.error) setError(result.error);
      else shape(result.points, "Suggested shape around the busiest streets.");
    }
    if (next === "districts" || next === "address" || next === "copy" || next === "import") zoneStore.clearSketch();
  }

  function toggleDistrict(id: string) {
    if (!city) return;
    const next = picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id];
    setPicked(next);
    const result = joinShapes(city.districts.filter((item) => next.includes(item.id)).map((item) => item.ring));
    if (!next.length) zoneStore.clearSketch();
    else if (result.error) setError(result.error);
    else shape(result.points, `${next.length} district${next.length === 1 ? "" : "s"} joined.`);
    if (!name && next.length === 1) setName(city.districts.find((item) => item.id === id)?.name ?? "");
  }

  function aroundPlace(placeLabel: string, distance: number) {
    const place = PLACES.find((item) => item.name === placeLabel);
    if (!place) return;
    shape(circleRing(place.lat, place.lng, distance), `${distance} km around ${place.name}.`);
    if (!name) setName(place.name.split(",")[0] ?? "");
  }

  function save() {
    if (!agent || !city) return;
    const id = zoneStore.createIn({
      country,
      city: city.id,
      kind,
      name,
      code: finalCode,
      points: sketch,
      copyFrom: settingsFrom || (method === "copy" ? copyId : "") || undefined,
      schedule,
      hours: schedule === "weekly" ? hours : "00:00–24:00",
      from: schedule === "range" ? from : "",
      until: schedule === "range" ? until : "",
      goLiveAt: goLive === "later" ? goLiveAt : "",
    }, agent.id);
    if (id) onClose();
  }

  const saveError = !city ? "Pick the city." : !name.trim() ? "Give the zone a name." : sketch.length < 3 ? "Make the shape first." : blocking[0]?.message ?? (goLive === "later" && !goLiveAt ? "Pick when it goes live." : schedule === "range" && (!from || !until) ? "Pick the dates." : "");

  return (
    <div className="zn-panel zn-wizard" aria-label="New zone">
      <div className="zn-wiz-head">
        <h3>New zone{city ? ` in ${city.name}` : ""}</h3>
        <button data-command="admin.zone.cancel" type="button" className="icon-ghost" aria-label="Close new zone" onClick={onClose}><X size={16} aria-hidden="true" /></button>
      </div>
      <ol className="zn-steps" aria-label="Steps">
        {(["City", "Type and name", "Shape", "Check and save"] as const).map((label, index) => (
          <li key={label} className={step === index + 1 ? "on" : step > index + 1 ? "done" : undefined}>
            <button data-command="admin.zone.wizard" type="button" disabled={index + 1 > step} onClick={() => setStep((index + 1) as Step)}>
              <i>{step > index + 1 ? <Check size={11} aria-hidden="true" /> : index + 1}</i>{label}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="zn-step" aria-label="Pick the city">
          <p className="zn-lead">Which city is the zone in? The name will start with the city.</p>
          <div className="zn-cities">
            {cities.map((item) => {
              const count = countryZones.filter((zone) => zone.city === item.id).length;
              const coverage = cityGaps(ui.book.draft, item, 12).coverage;
              return (
                <button data-command="admin.zone.wizard" key={item.id} type="button" className="zn-city" onClick={() => chooseCity(item)}>
                  <b>{item.name}</b>
                  <small>{item.code} · {count ? `${count} zone${count === 1 ? "" : "s"}` : "No zones yet"}</small>
                  <span className="zn-cover" aria-label={`${coverage}% covered`}><i style={{ width: `${coverage}%` }} /></span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 2 && city ? (
        <section className="zn-step" aria-label="Type and name">
          <div className="zn-kinds" role="radiogroup" aria-label="Zone type">
            {KINDS.map((item) => (
              <button data-command="admin.zone.wizard" key={item} type="button" role="radio" aria-checked={kind === item} className={kind === item ? "zn-kind on" : "zn-kind"} style={{ ["--zc" as string]: ZONE_COLOR[item] }} onClick={() => setKind(item)}>
                <i aria-hidden="true" />
                <span><b>{ZONE_TYPES.find((type) => type.id === item)?.label}</b><small>{KIND_HINT[item]}</small></span>
              </button>
            ))}
          </div>
          <label className="field">Name
            <span className="zn-name">
              <em>{city.name} ·</em>
              <input aria-label="Zone name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Kista Nord" maxLength={40} />
            </span>
          </label>
          <label className="field">Code
            <input aria-label="Zone code" value={finalCode} onChange={(event) => { setCodeTouched(true); setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); }} maxLength={12} />
            <small className="fine">Made from the city code. You can change it.</small>
          </label>
          <div className="zn-step-foot">
            <button data-command="admin.zone.wizard" type="button" className="dash-btn" disabled={!name.trim()} onClick={() => setStep(3)}>Next: the shape</button>
          </div>
        </section>
      ) : null}

      {step === 3 && city ? (
        <section className="zn-step" aria-label="Make the shape">
          <div className="zn-methods" role="radiogroup" aria-label="How to make it">
            {METHODS.map((item) => (
              <button data-command="admin.zone.wizard" key={item.id} type="button" role="radio" aria-checked={method === item.id} className={method === item.id ? "zn-method on" : "zn-method"} onClick={() => chooseMethod(item.id)}>
                {item.icon}
                <b>{item.label}</b>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>

          {method === "districts" ? (
            <div className="zn-option" role="group" aria-label="Districts">
              <p className="fine">Click the districts to join. They must touch.</p>
              <div className="zn-chips">
                {city.districts.map((item) => {
                  const used = cityZones.some((zone) => zone.kind === "operating" && zone.name.endsWith(item.name));
                  return (
                    <label key={item.id} className={picked.includes(item.id) ? "check-chip on" : "check-chip"}>
                      <input type="checkbox" checked={picked.includes(item.id)} onChange={() => toggleDistrict(item.id)} />{item.name}{used ? <small> · has a zone</small> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          {method === "address" ? (
            <div className="zn-option zn-row">
              <label className="field">Place
                <select aria-label="Place" value={placeName} onChange={(event) => { setPlaceName(event.target.value); aroundPlace(event.target.value, km); }}>
                  <option value="">Pick a place</option>
                  {PLACES.filter((item) => item.city === city.id).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </label>
              <label className="field">Distance around<NumberField label="Distance around" value={km} unit="km" max={50} onChange={(value) => { const next = Math.max(0.2, value); setKm(next); if (placeName) aroundPlace(placeName, next); }} /></label>
            </div>
          ) : null}
          {method === "copy" ? (
            <div className="zn-option">
              <label className="field">Zone to copy
                <select aria-label="Zone to copy" value={copyId} onChange={(event) => {
                  setCopyId(event.target.value);
                  setSettingsFrom(event.target.value);
                  const source = countryZones.find((zone) => zone.id === event.target.value);
                  if (source) shape(source.points.map((point) => [...point] as [number, number]), `Copied the shape of ${displayName(source)}. Change it after saving.`);
                }}>
                  <option value="">Pick a zone</option>
                  {countryZones.filter((zone) => zone.kind !== "service" && zone.kind !== "pickup").map((zone) => <option key={zone.id} value={zone.id}>{displayName(zone)}</option>)}
                </select>
              </label>
            </div>
          ) : null}
          {method === "import" ? (
            <div className="zn-option">
              <label className="dash-btn small ghost zn-file">
                <FileUp size={13} aria-hidden="true" /> Choose a GeoJSON or KML file
                <input type="file" aria-label="Shape file" accept=".geojson,.json,.kml,application/geo+json,application/json,application/vnd.google-earth.kml+xml" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void file.text().then((raw) => {
                    const result = firstShapeFromFile(raw);
                    if (result.error) setError(result.error);
                    else shape(result.points, `Shape from ${file.name}.`);
                  });
                }} />
              </label>
            </div>
          ) : null}
          {method && METHODS.find((item) => item.id === method)?.draw ? (
            <div className="zn-option zn-row">
              <p className="fine">{ui.tool !== "render" ? "Draw on the map now. Esc stops." : sketch.length ? "Shape drawn." : "Drawing stopped."}</p>
              <button data-command="admin.zone.wizard" type="button" className="dash-btn small ghost" onClick={() => chooseMethod(method)}>Draw again</button>
            </div>
          ) : null}
          {error ? <p className="rd-form-error" role="alert">{error}</p> : null}

          {sketch.length >= 3 ? (
            <div className="zn-shape-sum" aria-label="Shape">
              <span><b>{areaKm.toFixed(2)} km²</b> · {size.width.toFixed(1)} × {size.height.toFixed(1)} km</span>
              <div className="zn-row">
                <button data-command="admin.zone.snap" type="button" className="dash-btn small ghost" onClick={() => { const result = clipToCity(sketch, city); if (result.error) setError(result.error); else shape(result.points, `Cut to the ${city.name} border.`); }}><Scissors size={13} aria-hidden="true" /> Fit to city border</button>
                <button data-command="admin.zone.snap" type="button" className="dash-btn small ghost" onClick={() => { const result = removeOverlaps(sketch, ui.book.draft.filter((zone) => zone.country === country)); if (result.error) setError(result.error); else shape(result.points, "Overlaps with other zones removed. Zones now touch."); }}><Scissors size={13} aria-hidden="true" /> Remove overlaps</button>
              </div>
            </div>
          ) : null}
          <div className="zn-step-foot">
            <button data-command="admin.zone.wizard" type="button" className="dash-btn ghost" onClick={() => setStep(2)}>Back</button>
            <button data-command="admin.zone.wizard" type="button" className="dash-btn" disabled={sketch.length < 3} onClick={() => { zoneStore.setTool("render"); setStep(4); }}>Next: check and save</button>
          </div>
        </section>
      ) : null}

      {step === 4 && city ? (
        <section className="zn-step" aria-label="Check and save">
          <div className="zn-summary">
            <i style={{ background: ZONE_COLOR[kind] }} aria-hidden="true" />
            <span><b>{city.name} · {name}</b><small>{finalCode} · {ZONE_TYPES.find((type) => type.id === kind)?.label} · {areaKm.toFixed(2)} km²</small></span>
          </div>
          <div className="zn-live-checks" aria-label="Live checks">
            {checks.length === 0 ? <p className="zn-ok"><CircleCheck size={14} aria-hidden="true" /> No overlap, inside {city.name}, lines do not cross.</p> : checks.map((issue) => (
              <p key={issue.message} className={issue.level === "error" ? "zn-alert bad" : "zn-alert busy"}><AlertTriangle size={14} aria-hidden="true" /> {issue.message}</p>
            ))}
          </div>
          <dl className="zn-inside" aria-label="Inside the shape now">
            <div><dt><Car size={12} aria-hidden="true" /> Drivers online</dt><dd>{inside.drivers}</dd></div>
            <div><dt><Users size={12} aria-hidden="true" /> Open requests</dt><dd>{inside.requests}</dd></div>
            <div><dt>Trips now</dt><dd>{inside.trips}</dd></div>
            <div><dt>Requests · 7 days</dt><dd>{inside.demand7d}</dd></div>
          </dl>
          <label className="field">Copy prices and settings from
            <select aria-label="Copy settings from" value={settingsFrom} onChange={(event) => setSettingsFrom(event.target.value)}>
              <option value="">Movera default settings</option>
              {countryZones.filter((zone) => zone.kind === kind || zone.kind === "operating").filter((zone) => zone.kind !== "service").map((zone) => <option key={zone.id} value={zone.id}>{displayName(zone)}</option>)}
            </select>
          </label>
          <fieldset className="zn-fieldset">
            <legend>Opening hours</legend>
            <div className="zn-seg" role="radiogroup" aria-label="Opening hours">
              {([["always", "Always open"], ["weekly", "Set hours"], ["range", "From – to dates"]] as const).map(([id, label]) => (
                <button data-command="admin.zone.wizard" key={id} type="button" role="radio" aria-checked={schedule === id} className={schedule === id ? "on" : undefined} onClick={() => setSchedule(id)}>{label}</button>
              ))}
            </div>
            {schedule === "weekly" ? <label className="field">Hours<input aria-label="Hours" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="22:00–06:00" /></label> : null}
            {schedule === "range" ? (
              <div className="zn-row">
                <label className="field">From<input type="date" aria-label="From day" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
                <label className="field">Until<input type="date" aria-label="Until day" value={until} onChange={(event) => setUntil(event.target.value)} /></label>
              </div>
            ) : null}
          </fieldset>
          <fieldset className="zn-fieldset">
            <legend>Goes live</legend>
            <div className="zn-seg" role="radiogroup" aria-label="Goes live">
              <button data-command="admin.zone.wizard" type="button" role="radio" aria-checked={goLive === "publish"} className={goLive === "publish" ? "on" : undefined} onClick={() => setGoLive("publish")}>When published</button>
              <button data-command="admin.zone.wizard" type="button" role="radio" aria-checked={goLive === "later"} className={goLive === "later" ? "on" : undefined} onClick={() => setGoLive("later")}>At a set time</button>
            </div>
            {goLive === "later" ? <label className="field">Start<input type="datetime-local" aria-label="Go live at" value={goLiveAt} onChange={(event) => setGoLiveAt(event.target.value)} /></label> : null}
          </fieldset>
          <p className="fine">Saved as a draft. Then send it for review: a second admin publishes it.</p>
          {saveError ? <p className="rd-form-error" role="alert">{saveError}</p> : null}
          <div className="zn-step-foot">
            <button data-command="admin.zone.wizard" type="button" className="dash-btn ghost" onClick={() => setStep(3)}>Back</button>
            <CommandButton command="admin.zone.create" className="dash-btn publish" type="button" disabled={Boolean(saveError)} title={saveError} onDone={save}>Save as draft</CommandButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
