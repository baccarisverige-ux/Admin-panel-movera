import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BellRing,
  CalendarClock,
  Clock,
  Cpu,
  Eye,
  Hand,
  Megaphone,
  Plus,
  Square,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Market } from "../markets/markets";
import { CommandButton } from "../ui/CommandButton";
import { demandSeries } from "./demand";
import { DemandChart } from "./DemandChart";
import { NumberField } from "./NumberField";
import type { SurgeRow } from "./rows";
import { activeProfile, inActiveHours, priceCheck, smartMultiplier, surgeTimeline, LEVEL_COLOR, type SurgeAlert } from "./surge";
import { SurgeMap } from "./SurgeMap";
import { SurgeSlider } from "./SurgeSlider";
import type { SurgeStyle } from "./surgeGeo";
import {
  SLICE_KEY,
  WEEKDAY_LABELS,
  notifyDriversNow,
  setNotifyDrivers,
  startManualSurge,
  stopManualSurges,
  type PricingStore,
  type Problem,
  type ScheduledSurge,
  type SmartSurge,
  type SurgeProfile,
  type ZoneBook,
  type ZoneLive,
} from "./zonePricing";

type Props = {
  market: Market;
  zoneId: string;
  zoneName: string;
  rows: SurgeRow[];
  alerts: SurgeAlert[];
  book: ZoneBook;
  live: ZoneLive;
  store: PricingStore;
  problems: Problem[];
  agentId: string | null;
  canEdit: boolean;
  now: number;
  map: { shown: boolean; style: SurgeStyle; setShown: (shown: boolean) => void; setStyle: (style: SurgeStyle) => void };
  onSmart: (patch: Partial<SmartSurge>) => void;
  onScheduled: (list: ScheduledSurge[]) => void;
  onSelectZone: (zoneId: string) => void;
  onNotice: (message: string) => void;
};

const DURATIONS = [15, 30, 60, 120, 240, 480];

function localInput(iso: string, timeZone: string): string {
  if (!iso) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(Date.parse(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Turn a wall-clock time in the zone's time zone into an instant. */
function fromLocalInput(value: string, timeZone: string): string {
  if (!value) return "";
  const guess = Date.parse(`${value}:00Z`);
  const shown = Date.parse(`${localInput(new Date(guess).toISOString(), timeZone)}:00Z`);
  return new Date(guess - (shown - guess)).toISOString();
}

export function SurgePanel({ market, zoneId, zoneName, rows, alerts, book, live, store, problems, agentId, canEdit, now, map, onSmart, onScheduled, onSelectZone, onNotice }: Props) {
  const [manual, setManual] = useState(1.5);
  const [minutes, setMinutes] = useState(60);
  const current = rows.find((row) => row.surge.zoneId === zoneId)?.surge;
  const at = new Date(now).toISOString();
  const time = new Intl.DateTimeFormat(market.locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: market.timeZone });
  const dateTime = new Intl.DateTimeFormat(market.locale, { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: market.timeZone });
  const bad = new Set(problems.map((problem) => problem.path.split(".").slice(0, 2).join(".")));
  const running = live.manual && Date.parse(live.manual.endsAt) > now ? live.manual : null;
  const start = agentId ? startManualSurge(store, zoneId, manual, minutes, agentId, "Manual surge", at) : { store, error: "Sign in again." };
  const stop = agentId ? stopManualSurges(store, [zoneId], agentId, "Manual surge stopped", at) : { store, error: "Sign in again.", stopped: [] };
  const profileNow = activeProfile(book.smart, now, market.timeZone);
  const hoursOn = inActiveHours(book.smart, now, market.timeZone);
  const bucket = Math.floor(now / 600_000) * 600_000;
  const series = useMemo(() => demandSeries(zoneId, bucket, 6, 10), [zoneId, bucket]);
  const seriesSurge = series.map((point) => {
    if (running && point.at >= Date.parse(running.startedAt)) return running.multiplier;
    const profile = activeProfile(book.smart, point.at, market.timeZone);
    return book.smart.enabled && profile && inActiveHours(book.smart, point.at, market.timeZone) ? smartMultiplier(profile, point.ratio) : 1;
  });
  const timeline = surgeTimeline(book, store.surgeLog, now, 8).slice(0, 12);
  const check = current ? priceCheck(current) : { saw: 0, left: 0, leftPct: 0 };

  const patchProfile = (id: string, patch: Partial<SurgeProfile>) => onSmart({ profiles: book.smart.profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)) });
  const moveProfile = (id: string, by: number) => {
    const list = [...book.smart.profiles];
    const index = list.findIndex((profile) => profile.id === id);
    const target = index + by;
    if (target < 0 || target >= list.length || list[target].isDefault || list[index].isDefault) return;
    [list[index], list[target]] = [list[target], list[index]];
    onSmart({ profiles: list });
  };

  return (
    <div className="surge-panel">
      {/* Live status and manual control for the chosen zone */}
      <div className="surge-top">
        <section className={`surge-now lvl-${current?.level ?? "none"}`} aria-label={`Surge now in ${zoneName}`}>
          <div className="surge-now-head">
            <span className="eyebrow"><span className="live-dot" aria-hidden="true" /> Live · {zoneName}</span>
            <span className={`source-chip ${current?.source ?? "off"}`}>
              {current?.source === "manual" ? <Hand size={12} aria-hidden="true" /> : current?.source === "scheduled" ? <CalendarClock size={12} aria-hidden="true" /> : current?.source === "smart" ? <Cpu size={12} aria-hidden="true" /> : null}
              {current?.source === "manual" ? "Manual" : current?.source === "scheduled" ? "Scheduled" : current?.source === "smart" ? "Smart" : "No surge"}
            </span>
          </div>
          <div className="surge-big" data-testid="surge-now">×{(current?.multiplier ?? 1).toFixed(1)}</div>
          <div className="surge-gauge" aria-hidden="true"><i style={{ width: `${Math.min(100, (((current?.multiplier ?? 1) - 1) / 5) * 100)}%`, background: LEVEL_COLOR[current?.level ?? "none"] }} /></div>
          <dl className="surge-facts">
            <div><dt>Ride requests</dt><dd>{current?.requests ?? 0}</dd></div>
            <div><dt>Free online drivers</dt><dd>{current?.free ?? 0}</dd></div>
            <div><dt>Requests per free driver</dt><dd>{(current?.ratio ?? 0).toFixed(1)}</dd></div>
            <div><dt>Time profile</dt><dd>{profileNow?.name ?? "—"}</dd></div>
          </dl>
          <p className="surge-note">
            {current?.source === "manual" && running ? `Manual surge until ${time.format(Date.parse(running.endsAt))}, started by ${running.by}. Smart surge is paused.`
              : current?.source === "scheduled" ? `Scheduled "${current.scheduledName}" until ${time.format(Date.parse(current.endsAt!))}.`
              : current?.smartNote ? `${current.smartNote}.`
              : current?.source === "smart" ? `Smart surge follows demand and stops by itself when requests per free online driver stay under ${profileNow?.steps[0]?.ratio ?? 1.5} for ${book.smart.stopAfterMin} min.`
              : "Enough drivers. Smart surge is watching."}
          </p>
        </section>

        <section className="surge-manual" aria-labelledby="manual-title">
          <h3 id="manual-title"><Zap size={16} aria-hidden="true" /> Manual surge</h3>
          {running ? (
            <div className="manual-running">
              <strong>×{running.multiplier.toFixed(1)} running</strong>
              <span>Ends {time.format(Date.parse(running.endsAt))} · {Math.max(0, Math.round((Date.parse(running.endsAt) - now) / 60_000))} min left</span>
              <CommandButton command="admin.pricing.stopSurge" className="dash-btn danger" targetId={zoneId} confirmTarget={false} scope={zoneId} before={`×${running.multiplier}`} after="stopped" expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={stop.store} disabled={!canEdit || Boolean(stop.error)} title={stop.error} onDone={() => onNotice(`Manual surge in ${zoneName} stopped.`)}>
                <Square size={13} aria-hidden="true" /> Stop surge
              </CommandButton>
            </div>
          ) : (
            <>
              <SurgeSlider label="Manual surge" value={manual} onChange={setManual} disabled={!canEdit} />
              <label className="field inline">
                Runs for
                <select aria-label="Manual surge duration" value={minutes} disabled={!canEdit} onChange={(event) => setMinutes(Number(event.target.value))}>
                  {DURATIONS.map((value) => <option key={value} value={value}>{value < 60 ? `${value} min` : `${value / 60} h`}</option>)}
                </select>
              </label>
              <CommandButton command="admin.pricing.startSurge" className="dash-btn surge-go" targetId={zoneId} confirmTarget={false} scope={zoneId} before="no manual surge" after={`×${manual.toFixed(1)} for ${minutes} min`} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={start.store} disabled={!canEdit || manual <= 1 || Boolean(start.error)} title={manual <= 1 ? "Move the slider above ×1.0" : start.error} onDone={() => onNotice(`Manual surge ×${manual.toFixed(1)} started in ${zoneName} for ${minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}.${live.notifyDrivers ? " Drivers were told." : ""}`)}>
                <Zap size={14} aria-hidden="true" /> Start surge ×{manual.toFixed(1)}
              </CommandButton>
              <small className="fine">It stops by itself at the end. Manual surge wins over smart and scheduled surge.</small>
            </>
          )}
          <div className="notify-row">
            <CommandButton command="admin.pricing.notifySetting" className={live.notifyDrivers ? "surge-toggle on" : "surge-toggle"} targetId={zoneId} confirmTarget={false} scope={zoneId} before={String(live.notifyDrivers)} after={String(!live.notifyDrivers)} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={setNotifyDrivers(store, zoneId, !live.notifyDrivers)} disabled={!canEdit} aria-label="Tell drivers when a surge starts">
              <BellRing size={14} aria-hidden="true" /> Tell drivers when a surge starts <span className="switch" aria-hidden="true"><i /></span>
            </CommandButton>
            <CommandButton command="admin.pricing.notifyDrivers" className="dash-btn small ghost" targetId={zoneId} confirmTarget={false} scope={zoneId} before="" after={`drivers told ×${(current?.multiplier ?? 1).toFixed(1)}`} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={agentId ? notifyDriversNow(store, zoneId, current?.multiplier ?? 1, agentId, at) : store} disabled={!canEdit || (current?.multiplier ?? 1) <= 1} title={(current?.multiplier ?? 1) <= 1 ? "No surge to tell drivers about" : undefined} onDone={() => onNotice(`Drivers in and near ${zoneName} were told about surge ×${(current?.multiplier ?? 1).toFixed(1)}.`)}>
              <Megaphone size={13} aria-hidden="true" /> Tell drivers now
            </CommandButton>
          </div>
          {live.lastNotifiedAt ? <small className="fine">Drivers last told {dateTime.format(Date.parse(live.lastNotifiedAt))}.</small> : null}
        </section>
      </div>

      {/* Alerts only when a person is needed */}
      <section className="surge-alerts" aria-label="Surge alerts">
        {alerts.length === 0 ? (
          <p className="all-good"><Activity size={15} aria-hidden="true" /> All zones are fine. Smart surge is handling demand.</p>
        ) : alerts.map((alert) => (
          <div key={alert.id} className={`surge-alert ${alert.tone}`} role={alert.tone === "critical" ? "alert" : undefined}>
            <AlertTriangle size={16} aria-hidden="true" />
            <div>
              <strong>{alert.title}</strong>
              <small>{alert.detail}</small>
            </div>
            <button data-command="admin.pricing.zone" type="button" className="dash-btn small" onClick={() => { onSelectZone(alert.zoneId); document.getElementById(alert.action === "settings" ? "smart-title" : "manual-title")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
              {alert.action === "manual" ? "Start manual surge" : alert.action === "stop" ? "Review surge" : "Open settings"}
            </button>
          </div>
        ))}
      </section>

      <section className="dash-card surge-map-card" aria-labelledby="surge-map-title">
        <div className="card-head">
          <h3 id="surge-map-title"><Zap size={16} aria-hidden="true" /> Surge map · {market.name}</h3>
          <span className="fine-print">Click a zone to open it</span>
        </div>
        <SurgeMap market={market} rows={rows.map((row) => row.surge)} selectedId={zoneId} onSelect={onSelectZone} shown={map.shown} style={map.style} onShown={map.setShown} onStyle={map.setStyle} />
        <ul className="zone-surge-strip" aria-label="Surge by zone">
          {[...rows].sort((a, b) => b.surge.multiplier - a.surge.multiplier || b.surge.ratio - a.surge.ratio).map(({ surge }) => (
            <li key={surge.zoneId}>
              <button data-command="admin.pricing.zone" type="button" className={surge.zoneId === zoneId ? "active" : undefined} onClick={() => onSelectZone(surge.zoneId)}>
                <i style={{ background: LEVEL_COLOR[surge.level] }} />
                <span>{surge.name}</span>
                <b>×{surge.multiplier.toFixed(1)}</b>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="surge-two">
        <section className="dash-card" aria-labelledby="demand-title">
          <div className="card-head">
            <h3 id="demand-title"><TrendingUp size={16} aria-hidden="true" /> Demand · {zoneName}</h3>
            <span className="fine-print">Last 6 hours</span>
          </div>
          <DemandChart points={series} surge={seriesSurge} locale={market.locale} timeZone={market.timeZone} />
        </section>
        <section className="dash-card" aria-labelledby="check-title">
          <div className="card-head">
            <h3 id="check-title"><Eye size={16} aria-hidden="true" /> Rider price check</h3>
            <span className="fine-print">Last hour</span>
          </div>
          {check.saw ? (
            <div className="price-check">
              <div><span>Saw the surge price</span><strong>{check.saw}</strong></div>
              <div className={check.leftPct >= 25 ? "warn" : undefined}><span>Left without booking</span><strong>{check.left}</strong><small>{check.leftPct}%</small></div>
              <p>{check.leftPct >= 25 ? "Many riders leave at this price. Consider a lower surge or a driver boost." : "Most riders still book at this price."}</p>
            </div>
          ) : <p className="state-line">No surge in {zoneName} in the last hour, so no rider saw a higher price.</p>}
        </section>
      </div>

      {/* Smart surge settings, saved with the draft */}
      <section className="dash-card smart-card" aria-labelledby="smart-title">
        <div className="card-head">
          <h3 id="smart-title"><Cpu size={16} aria-hidden="true" /> Smart surge · {zoneName}</h3>
          <label className="mini-switch big">
            <input type="checkbox" aria-label="Smart surge on" checked={book.smart.enabled} disabled={!canEdit} onChange={(event) => onSmart({ enabled: event.target.checked })} />
            <span aria-hidden="true"><i /></span>
            {book.smart.enabled ? "On" : "Off"}
          </label>
        </div>
        <p className="smart-explain">Every {book.smart.checkEveryMin} min smart surge compares <b>ride requests</b> with <b>free online drivers</b> (online and not on a trip). Many drivers and few requests means no surge. It starts only when a level holds for {book.smart.holdMin} min, goes down one step at a time, waits {book.smart.cooldownMin} min between changes, and stops by itself when the level stays low for {book.smart.stopAfterMin} min.</p>
        <div className={bad.has("smart.active") || bad.has("smart.checkEveryMin") ? "timing-grid invalid" : "timing-grid"}>
          <label className="field">Active from<input type="time" aria-label="Smart surge active from" value={book.smart.activeFrom} disabled={!canEdit} onChange={(event) => onSmart({ activeFrom: event.target.value })} /></label>
          <label className="field">Active until<input type="time" aria-label="Smart surge active until" value={book.smart.activeTo} disabled={!canEdit} onChange={(event) => onSmart({ activeTo: event.target.value })} /></label>
          <label className="field">Check every<NumberField label="Check every" value={book.smart.checkEveryMin} unit="min" max={15} disabled={!canEdit} onChange={(value) => onSmart({ checkEveryMin: value })} /></label>
          <label className="field">Start only if it holds<NumberField label="Start only if it holds" value={book.smart.holdMin} unit="min" max={30} disabled={!canEdit} onChange={(value) => onSmart({ holdMin: value })} /></label>
          <label className="field">Stop after low for<NumberField label="Stop after low for" value={book.smart.stopAfterMin} unit="min" max={60} disabled={!canEdit} onChange={(value) => onSmart({ stopAfterMin: value })} /></label>
          <label className="field">Wait between changes<NumberField label="Wait between changes" value={book.smart.cooldownMin} unit="min" max={30} disabled={!canEdit} onChange={(value) => onSmart({ cooldownMin: value })} /></label>
        </div>
        <small className="fine">{book.smart.activeFrom === book.smart.activeTo ? "Active all day." : `Active ${book.smart.activeFrom}–${book.smart.activeTo}.`} {hoursOn ? "" : "Outside active hours now."} The first matching profile from the top wins; Normal is used the rest of the time.</small>

        <div className="profile-list">
          {book.smart.profiles.map((profile, index) => {
            const isNow = profileNow?.id === profile.id;
            const invalid = bad.has(`smart.${profile.id}`);
            return (
              <article key={profile.id} className={["profile-card", isNow ? "now" : "", invalid ? "invalid" : ""].filter(Boolean).join(" ")} aria-label={`Time profile ${profile.name}`}>
                <div className="profile-head">
                  <input className="profile-name" aria-label="Profile name" value={profile.name} disabled={!canEdit} onChange={(event) => patchProfile(profile.id, { name: event.target.value })} />
                  {isNow ? <span className="badge-live">Active now</span> : null}
                  {profile.isDefault ? <span className="badge-soft">Fallback</span> : (
                    <span className="profile-tools">
                      <button data-command="admin.pricing.edit" type="button" className="icon-ghost" aria-label={`Move ${profile.name} up`} disabled={!canEdit || index === 0} onClick={() => moveProfile(profile.id, -1)}><ArrowUp size={14} aria-hidden="true" /></button>
                      <button data-command="admin.pricing.edit" type="button" className="icon-ghost" aria-label={`Move ${profile.name} down`} disabled={!canEdit || book.smart.profiles[index + 1]?.isDefault !== false} onClick={() => moveProfile(profile.id, 1)}><ArrowDown size={14} aria-hidden="true" /></button>
                      <button data-command="admin.pricing.edit" type="button" className="icon-ghost danger" aria-label={`Delete profile ${profile.name}`} disabled={!canEdit} onClick={() => onSmart({ profiles: book.smart.profiles.filter((item) => item.id !== profile.id) })}><Trash2 size={14} aria-hidden="true" /></button>
                    </span>
                  )}
                </div>
                {profile.isDefault ? <p className="fine">Used whenever no other profile matches.</p> : (
                  <>
                    <div className="day-chips" role="group" aria-label={`${profile.name} days`}>
                      {WEEKDAY_LABELS.map((day, dayIndex) => (
                        <label key={day} className={profile.days.includes(dayIndex) ? "day on" : "day"}>
                          <input type="checkbox" aria-label={`${profile.name} ${day}`} checked={profile.days.includes(dayIndex)} disabled={!canEdit} onChange={(event) => patchProfile(profile.id, { days: event.target.checked ? [...profile.days, dayIndex].sort() : profile.days.filter((item) => item !== dayIndex) })} />
                          {day}
                        </label>
                      ))}
                    </div>
                    <div className="window-list">
                      {profile.windows.map((window, windowIndex) => (
                        <span key={windowIndex} className="window">
                          <Clock size={13} aria-hidden="true" />
                          <input type="time" aria-label={`${profile.name} from`} value={window.from} disabled={!canEdit} onChange={(event) => patchProfile(profile.id, { windows: profile.windows.map((item, i) => (i === windowIndex ? { ...item, from: event.target.value } : item)) })} />
                          –
                          <input type="time" aria-label={`${profile.name} to`} value={window.to} disabled={!canEdit} onChange={(event) => patchProfile(profile.id, { windows: profile.windows.map((item, i) => (i === windowIndex ? { ...item, to: event.target.value } : item)) })} />
                          {profile.windows.length > 1 ? <button data-command="admin.pricing.edit" type="button" className="icon-ghost" aria-label="Remove time window" disabled={!canEdit} onClick={() => patchProfile(profile.id, { windows: profile.windows.filter((_, i) => i !== windowIndex) })}><Trash2 size={12} aria-hidden="true" /></button> : null}
                        </span>
                      ))}
                      <button data-command="admin.pricing.edit" type="button" className="link-action" disabled={!canEdit} onClick={() => patchProfile(profile.id, { windows: [...profile.windows, { from: "12:00", to: "14:00" }] })}>+ time</button>
                    </div>
                  </>
                )}
                <div className="step-list">
                  {profile.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="step-row">
                      <span className="step-when">When requests per free driver reach</span>
                      <NumberField label={`${profile.name} step ${stepIndex + 1} level`} value={step.ratio} step={0.1} max={20} disabled={!canEdit} onChange={(value) => patchProfile(profile.id, { steps: profile.steps.map((item, i) => (i === stepIndex ? { ...item, ratio: value } : item)) })} />
                      <SurgeSlider compact label={`${profile.name} step ${stepIndex + 1} surge`} value={step.multiplier} disabled={!canEdit} onChange={(value) => patchProfile(profile.id, { steps: profile.steps.map((item, i) => (i === stepIndex ? { ...item, multiplier: value } : item)) })} />
                      {profile.steps.length > 1 ? <button data-command="admin.pricing.edit" type="button" className="icon-ghost" aria-label={`Remove ${profile.name} step ${stepIndex + 1}`} disabled={!canEdit} onClick={() => patchProfile(profile.id, { steps: profile.steps.filter((_, i) => i !== stepIndex) })}><Trash2 size={13} aria-hidden="true" /></button> : <span />}
                    </div>
                  ))}
                  {profile.steps.length < 5 ? (
                    <button data-command="admin.pricing.edit" type="button" className="link-action" disabled={!canEdit} onClick={() => {
                      const last = profile.steps[profile.steps.length - 1] ?? { ratio: 1, multiplier: 1 };
                      patchProfile(profile.id, { steps: [...profile.steps, { ratio: Math.round((last.ratio + 1) * 10) / 10, multiplier: Math.min(profile.cap, Math.round((last.multiplier + 0.3) * 10) / 10) }] });
                    }}>+ step</button>
                  ) : null}
                </div>
                <SurgeSlider compact label={`${profile.name} cap`} value={profile.cap} disabled={!canEdit} onChange={(value) => patchProfile(profile.id, { cap: value })} />
              </article>
            );
          })}
        </div>
        <button data-command="admin.pricing.edit" type="button" className="dash-btn small ghost" disabled={!canEdit} onClick={() => {
          const list = [...book.smart.profiles];
          const fallback = list.findIndex((profile) => profile.isDefault);
          list.splice(fallback < 0 ? list.length : fallback, 0, { id: `profile-${Date.now() % 1_000_000}`, name: "New profile", days: [5, 6], windows: [{ from: "10:00", to: "14:00" }], steps: [{ ratio: 1.5, multiplier: 1.2 }, { ratio: 2, multiplier: 1.5 }], cap: 2, isDefault: false });
          onSmart({ profiles: list });
        }}>
          <Plus size={14} aria-hidden="true" /> Add time profile
        </button>
      </section>

      <div className="surge-two">
        <section className="dash-card" aria-labelledby="scheduled-title">
          <div className="card-head">
            <h3 id="scheduled-title"><CalendarClock size={16} aria-hidden="true" /> Scheduled surges</h3>
            <span className="fine-print">Events, holidays</span>
          </div>
          {book.scheduled.length === 0 ? <p className="state-line">Nothing planned for {zoneName}.</p> : (
            <ul className="scheduled-list" aria-label="Scheduled surges">
              {book.scheduled.map((item) => (
                <li key={item.id} className={bad.has(`scheduled.${item.id}`) ? "invalid" : undefined}>
                  <input aria-label="Scheduled surge name" placeholder="Name, e.g. Concert" value={item.name} disabled={!canEdit} onChange={(event) => onScheduled(book.scheduled.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)))} />
                  <div className="sched-times">
                    <input type="datetime-local" aria-label="Scheduled surge start" value={localInput(item.startsAt, market.timeZone)} disabled={!canEdit} onChange={(event) => onScheduled(book.scheduled.map((row) => (row.id === item.id ? { ...row, startsAt: fromLocalInput(event.target.value, market.timeZone) } : row)))} />
                    <input type="datetime-local" aria-label="Scheduled surge end" value={localInput(item.endsAt, market.timeZone)} disabled={!canEdit} onChange={(event) => onScheduled(book.scheduled.map((row) => (row.id === item.id ? { ...row, endsAt: fromLocalInput(event.target.value, market.timeZone) } : row)))} />
                  </div>
                  <SurgeSlider compact label={`${item.name || "Scheduled"} surge`} value={item.multiplier} disabled={!canEdit} onChange={(value) => onScheduled(book.scheduled.map((row) => (row.id === item.id ? { ...row, multiplier: value } : row)))} />
                  <button data-command="admin.pricing.edit" type="button" className="icon-ghost danger" aria-label={`Remove scheduled surge ${item.name}`} disabled={!canEdit} onClick={() => onScheduled(book.scheduled.filter((row) => row.id !== item.id))}><Trash2 size={14} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
          <button data-command="admin.pricing.schedule" type="button" className="dash-btn small ghost" disabled={!canEdit} onClick={() => {
            const startAt = Math.ceil(now / 3_600_000) * 3_600_000 + 2 * 3_600_000;
            onScheduled([...book.scheduled, { id: `${zoneId}-sched-${startAt}-${book.scheduled.length}`, name: "", multiplier: 1.5, startsAt: new Date(startAt).toISOString(), endsAt: new Date(startAt + 3 * 3_600_000).toISOString() }]);
          }}>
            <Plus size={14} aria-hidden="true" /> Plan a surge
          </button>
        </section>

        <section className="dash-card" aria-labelledby="timeline-title">
          <div className="card-head">
            <h3 id="timeline-title"><Activity size={16} aria-hidden="true" /> Surge timeline and effect</h3>
            <span className="fine-print">Last 8 hours</span>
          </div>
          {timeline.length === 0 ? <p className="state-line">No surge in {zoneName} in the last hours.</p> : (
            <ol className="surge-timeline" aria-label="Surge timeline">
              {timeline.map((item) => (
                <li key={item.id} className={`src-${item.source}`}>
                  <time>{dateTime.format(item.at)}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.by}</small>
                    {item.effect ? (
                      <span className="effect">
                        <b className="good">+{item.effect.drivers} drivers came</b>
                        <b className={item.effect.ridesPct >= 0 ? "good" : "bad"}>rides {item.effect.ridesPct >= 0 ? "+" : ""}{item.effect.ridesPct}%</b>
                        <b className={item.effect.leftPct >= 25 ? "bad" : "soft"}>{item.effect.leftPct}% left on price</b>
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
