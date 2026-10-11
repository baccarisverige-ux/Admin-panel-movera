import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  History,
  Layers3,
  MapPinned,
  Plane,
  Plus,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Undo2,
  Users,
} from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { can } from "../auth/permissions";
import { useMarketScope } from "../markets/useMarketScope";
import { Flag } from "../ui/Flag";
import { CommandButton } from "../ui/CommandButton";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import {
  cityGaps,
  citiesWithZones,
  displayName,
  goLiveState,
  validateZones,
  zoneAreaKm,
  zoneChanges,
  zoneHealth,
  zoneImpact,
  zoneStatus,
  zoneTypeLabel,
  ZONE_COLOR,
  type ZoneShape,
} from "../zones/releases";
import { statusTone, ZoneMap } from "./ZoneMap";

type Filter = "all" | "operating" | "airport" | "rules" | "pickup" | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "operating", label: "Operating zones" },
  { id: "airport", label: "Airports" },
  { id: "rules", label: "Rules (boost, event, no pickup…)" },
  { id: "pickup", label: "Pickup points" },
  { id: "archived", label: "Archived" },
];

function matchesFilter(zone: ZoneShape, filter: Filter): boolean {
  if (filter === "archived") return zone.archived;
  if (zone.archived) return false;
  if (filter === "all") return zone.kind !== "service";
  if (filter === "rules") return ["boost", "event", "no_pickup", "restricted", "fleet"].includes(zone.kind);
  return zone.kind === filter;
}

export function ZonesPage() {
  const { agent } = useSession();
  const { country, market, zones: scopeZones } = useMarketScope();
  const [params] = useSearchParams();
  const ui = useZoneUi();
  const canEdit = Boolean(agent && can(agent.role, "zones.edit"));
  const canPublish = Boolean(agent && can(agent.role, "zones.publish"));
  const [wizard, setWizard] = useState<{ city?: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [gapCity, setGapCity] = useState<string | null>(null);
  const zones = useMemo(() => ui.book.draft.filter((zone) => zone.country === country), [ui.book.draft, country]);
  const live = zones.filter((zone) => !zone.archived && zone.kind !== "service" && zone.kind !== "pickup");
  const issues = useMemo(() => validateZones(ui.book.draft), [ui.book.draft]);
  const changes = useMemo(() => zoneChanges(ui.book.published, ui.book.draft, country), [ui.book.published, ui.book.draft, country]);
  const otherChanges = useMemo(() => (["SE", "FR", "TN"] as const).filter((id) => id !== country).reduce((sum, id) => sum + zoneChanges(ui.book.published, ui.book.draft, id).length, 0), [ui.book.published, ui.book.draft, country]);
  const impact = useMemo(() => zoneImpact(ui.book.published, ui.book.draft, country), [ui.book.published, ui.book.draft, country]);
  const health = useMemo(() => new Map(live.map((zone) => [zone.id, zoneHealth(zone)])), [live]);
  const attention = live.filter((zone) => health.get(zone.id)?.tone === "bad" || issues.some((issue) => issue.zoneId === zone.id && issue.level === "error"));
  const drivers = [...health.values()].reduce((sum, item) => sum + item.drivers, 0);
  const requests = [...health.values()].reduce((sum, item) => sum + item.requests, 0);
  const groups = citiesWithZones(ui.book.draft, country);
  const errors = issues.filter((issue) => issue.level === "error" && zones.some((zone) => zone.id === issue.zoneId));
  const version = ui.book.versions.length;
  const inReview = ui.book.status === "in_review";
  const preferred = params.get("zone") ?? (scopeZones.length === 1 ? scopeZones[0] : undefined);

  // The zone chosen in the top bar is picked on the map.
  useEffect(() => zoneStore.ensureCountry(country, preferred), [country, preferred]);

  function pick(zone: ZoneShape) {
    setWizard(null);
    zoneStore.select(zone.id);
    document.querySelector(".zn-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function newZone(city?: string) {
    zoneStore.clearSketch();
    zoneStore.cancelTool();
    setWizard({ city });
    window.setTimeout(() => document.querySelector(".zn-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  return (
    <div className="zones">
      <header className="pricing-hero zn-hero">
        <div className="pricing-title">
          <h2>Zones</h2>
          <p><Flag id={country} /> {market.name} · {groups.filter((group) => group.zones.length).length} cities with zones · {live.length} zones · version {version}</p>
        </div>
        <div className="zn-hero-actions">
          <span className={`zn-release-pill ${inReview ? "review" : changes.length ? "draft" : "live"}`}>
            {inReview ? <><ShieldCheck size={14} aria-hidden="true" /> In review</> : changes.length ? <><ClipboardList size={14} aria-hidden="true" /> {changes.length} change{changes.length === 1 ? "" : "s"} not published</> : <><CheckCircle2 size={14} aria-hidden="true" /> All published</>}
          </span>
          <button data-command="admin.zone.create" type="button" className="dash-btn publish" disabled={!canEdit} onClick={() => newZone()}><Plus size={15} aria-hidden="true" /> New zone</button>
        </div>
      </header>

      <section className="zn-kpis" aria-label="Zones at a glance">
        <div className="zn-kpi"><Layers3 size={18} aria-hidden="true" /><span><b>{live.length}</b><small>Live zones</small></span></div>
        <div className="zn-kpi"><Car size={18} aria-hidden="true" /><span><b>{drivers}</b><small>Drivers online in zones</small></span></div>
        <div className="zn-kpi"><Users size={18} aria-hidden="true" /><span><b>{requests}</b><small>Open requests</small></span></div>
        <div className={attention.length ? "zn-kpi bad" : "zn-kpi"}><AlertTriangle size={18} aria-hidden="true" /><span><b>{attention.length}</b><small>Need attention</small></span></div>
        <div className="zn-kpi"><MapPinned size={18} aria-hidden="true" /><span><b>{impact.areaKm.toFixed(0)} km²</b><small>Service area</small></span></div>
      </section>

      <section className="zn-release" aria-label="Publish zones">
        <ol className="zn-flow" aria-label="How zones go live">
          <li className={!inReview ? "on" : "done"}><i>1</i><span><b>Edit</b><small>Drafts only riders don't see</small></span></li>
          <li className={inReview ? "on" : undefined}><i>2</i><span><b>Send for review</b><small>Checks must pass</small></span></li>
          <li><i>3</i><span><b>Second admin publishes</b><small>Goes live for riders and drivers</small></span></li>
        </ol>
        <div className="zn-release-actions">
          <button data-command="admin.zone.changes" type="button" className="dash-btn small ghost" aria-expanded={changesOpen} onClick={() => setChangesOpen(!changesOpen)}><ClipboardList size={13} aria-hidden="true" /> {changesOpen ? "Hide" : "See"} changes and impact ({changes.length})</button>
          <CommandButton command="admin.zone.review" className="dash-btn small" type="button" disabled={!canEdit || inReview || (changes.length === 0 && otherChanges === 0)} onDone={() => { if (agent) zoneStore.review(agent.id); }}><Send size={13} aria-hidden="true" /> Send for review</CommandButton>
          <CommandButton command="admin.zone.publish" className="dash-btn small publish" type="button" disabled={!canPublish || !inReview} onDone={() => { if (agent) zoneStore.publish(agent.id); }}><Rocket size={13} aria-hidden="true" /> Publish</CommandButton>
          <CommandButton command="admin.zone.rollback" className="dash-btn small ghost" type="button" disabled={!canPublish || version < 2} onDone={() => zoneStore.rollback(agent?.id)}><Undo2 size={13} aria-hidden="true" /> Undo last publish</CommandButton>
        </div>
        {errors.length ? <p className="zn-alert bad"><AlertTriangle size={14} aria-hidden="true" /> {errors.length} problem{errors.length === 1 ? "" : "s"} block publishing: {errors[0]!.message}</p> : null}
        {otherChanges ? <p className="fine">Also {otherChanges} change{otherChanges === 1 ? "" : "s"} in other countries go in the same review.</p> : null}
        {changesOpen ? (
          <div className="zn-changes" aria-label="Changes and impact">
            {changes.length === 0 ? <p className="fine">Nothing changed in {market.name} since version {version}.</p> : (
              <ul>
                {changes.map((item) => (
                  <li key={item.zoneId} className={item.change}>
                    <b>{item.change === "added" ? "New" : item.change === "removed" ? "Deleted" : item.change === "archived" ? "Archived" : "Changed"}</b>
                    <span>{item.name}</span>
                    {item.fields.length ? <small>{item.fields.join(", ")}</small> : null}
                  </li>
                ))}
              </ul>
            )}
            <dl className="zn-impact" data-impact="zones">
              <div><dt>Service area</dt><dd>{impact.areaKm.toFixed(0)} km² ({impact.deltaKm >= 0 ? "+" : ""}{impact.deltaKm.toFixed(1)})</dd></div>
              <div><dt>Drivers online inside</dt><dd>{impact.drivers}</dd></div>
              <div><dt>Trips now</dt><dd>{impact.trips}</dd></div>
              <div><dt>Bookings made ahead</dt><dd>{impact.reservations}</dd></div>
              <div><dt>Price changes</dt><dd>{impact.feeChanges.length ? impact.feeChanges.join(", ") : "None"}</dd></div>
            </dl>
          </div>
        ) : null}
        <p className="zn-version" data-versions={version}><History size={13} aria-hidden="true" /> Versions: {version} · status {inReview ? "in review" : "draft"}</p>
      </section>

      <ZoneMap country={country} wizard={wizard} onWizard={setWizard} />

      <section className="zn-list" aria-label="Zones by city">
        <div className="zn-list-head">
          <div className="zn-filters" role="group" aria-label="Filter zones">
            {FILTERS.map((item) => (
              <button data-command="admin.zone.filter" key={item.id} type="button" aria-pressed={filter === item.id} className={filter === item.id ? "zn-chip on" : "zn-chip"} onClick={() => setFilter(item.id)}>{item.label}</button>
            ))}
          </div>
          <label className="rd-search small"><Search size={14} aria-hidden="true" /><input aria-label="Find a zone" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find by name or code" /></label>
        </div>

        {groups.map(({ city, zones: cityZones }) => {
          const shown = cityZones.filter((zone) => matchesFilter(zone, filter) && (!query.trim() || `${zone.name} ${zone.code}`.toLowerCase().includes(query.trim().toLowerCase())));
          if (!cityZones.length && (filter !== "all" || query.trim())) return null;
          const gaps = gapCity === city.id || ui.layers.gaps ? cityGaps(ui.book.draft, city, 20) : null;
          const coverage = gaps?.coverage ?? cityGaps(ui.book.draft, city, 12).coverage;
          return (
            <article key={city.id} className="zn-city-block" aria-label={`${city.name} zones`}>
              <header className="zn-city-head">
                <div>
                  <h3>{city.name} <small>{city.code}</small></h3>
                  <span className="zn-cover-line"><span className="zn-cover" aria-hidden="true"><i style={{ width: `${coverage}%` }} /></span>{cityZones.length ? `${coverage}% of the city has a zone` : "No zones yet"}</span>
                </div>
                <div className="zn-city-actions">
                  <button data-command="admin.zone.gaps" type="button" className="dash-btn small ghost" aria-pressed={ui.layers.gaps} onClick={() => { setGapCity(city.id); zoneStore.toggleLayer("gaps"); zoneStore.focusOn(city.center[0], city.center[1]); }}>{ui.layers.gaps ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />} {ui.layers.gaps ? "Hide gaps" : "Show gaps on map"}</button>
                  <button data-command="admin.zone.create" type="button" className="dash-btn small" disabled={!canEdit} onClick={() => newZone(city.id)}><Plus size={13} aria-hidden="true" /> New zone in {city.name}</button>
                </div>
              </header>
              {shown.length === 0 ? <p className="zn-empty">{cityZones.length ? "No zone matches." : `Launch ${city.name}: make the first zone, for example the whole city.`}</p> : (
                <ul className="zn-cards" aria-label={`${city.name} zone list`}>
                  {shown.map((zone) => {
                    const status = zoneStatus(zone, ui.book);
                    const item = health.get(zone.id) ?? zoneHealth(zone);
                    const scheduled = goLiveState(zone, Date.now()) === "scheduled";
                    const zoneErrors = issues.filter((issue) => issue.zoneId === zone.id && issue.level === "error");
                    return (
                      <li key={zone.id}>
                        <article className={zone.id === ui.selectedId ? "zn-card on" : "zn-card"} style={{ ["--zc" as string]: zone.color || ZONE_COLOR[zone.kind] }}>
                          <button data-command="admin.zone.pick" type="button" className="zn-card-main" aria-label={`Show ${displayName(zone)} on the map`} onClick={() => pick(zone)}>
                            <span className="zn-card-type">{zone.kind === "airport" ? <Plane size={12} aria-hidden="true" /> : <i aria-hidden="true" />}{zoneTypeLabel(zone.kind)}</span>
                            <b>{zone.name.replace(`${city.name} · `, "")}</b>
                            <small>{zone.code} · {zone.kind === "pickup" ? "pin" : `${zoneAreaKm(zone).toFixed(1)} km²`}</small>
                            <span className="zn-card-health">
                              <span title="Drivers online"><Car size={12} aria-hidden="true" /> {item.drivers}</span>
                              <span title="Open requests"><Users size={12} aria-hidden="true" /> {item.requests}</span>
                              {!zone.active ? <em className="bad">Off</em> : null}
                            </span>
                          </button>
                          <footer>
                            <span className={`zn-status ${statusTone(status)}`}>{scheduled ? "Scheduled" : status}</span>
                            {zoneErrors.length ? <span className="zn-flag bad" title={zoneErrors[0]!.message}><AlertTriangle size={11} aria-hidden="true" /> Fix</span> : item.alert ? <span className={`zn-flag ${item.tone}`} title={item.alert}><AlertTriangle size={11} aria-hidden="true" /> {item.alert}</span> : null}
                            <Link to={`/zones/${zone.id}`} aria-label={`Open ${displayName(zone)}`}>Open</Link>
                          </footer>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
