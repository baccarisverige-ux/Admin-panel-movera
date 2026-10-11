import { useMemo, useState, type ReactNode } from "react";
import { Ban, CalendarDays, Clock, Gauge, Layers, MapPinned, Minus, Plus, Route, Search, ShieldCheck, Star, Tags, Timer, Trophy, Users, Wallet, X, Zap } from "lucide-react";
import { CATEGORIES } from "../domain/contract";
import { market, type MarketId } from "../markets/markets";
import { NumberField } from "../pricing/NumberField";
import { CommandButton } from "../ui/CommandButton";
import { BonusAreaMap } from "./BonusAreaMap";
import { DriverAppPreview } from "./DriverAppPreview";
import {
  AUDIENCES,
  BONUS_KEY,
  DAY_SHORT,
  inAudience,
  maxPerDriver,
  REWARD_TYPES,
  saveBonus,
  validateBonus,
  windowMinutes,
  type BonusBook,
  type BonusKind,
  type BonusRules,
  type DriverBonus,
  type DriverFacts,
  type RewardType,
} from "./bonus";

export type BonusDriver = { facts: DriverFacts; name: string; code: string; zoneId: string; home: [number, number] };

const SYMBOL: Record<MarketId, string> = { SE: "kr", FR: "€", TN: "DT" };

/** The amount each reward type starts with: a target bonus, an extra per ride, an hourly guarantee. */
const REWARD_START: Record<RewardType, Record<MarketId, number>> = {
  target: { SE: 150, FR: 15, TN: 20 },
  steps: { SE: 150, FR: 15, TN: 20 },
  per_ride: { SE: 20, FR: 2, TN: 3 },
  multiplier: { SE: 0, FR: 0, TN: 0 },
  guarantee: { SE: 300, FR: 25, TN: 20 },
};

export function categoryName(id: string): string {
  return CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

type RuleKey = Exclude<keyof BonusRules, "categories">;
const RULES: { key: RuleKey; label: string; hint: string; unit: (symbol: string) => string; icon: ReactNode; max?: number }[] = [
  { key: "maxCancelPct", label: "Cancel rate at most", hint: "Drivers who cancel more get nothing", unit: () => "%", icon: <Ban size={15} />, max: 100 },
  { key: "minAcceptPct", label: "Acceptance at least", hint: "Share of ride offers accepted", unit: () => "%", icon: <ShieldCheck size={15} />, max: 100 },
  { key: "backToBack", label: "Rides back to back", hint: "Max minutes between one ride and the next", unit: () => "min", icon: <Route size={15} /> },
  { key: "minFare", label: "Minimum fare per ride", hint: "Short cheap rides do not count", unit: (symbol) => symbol, icon: <Wallet size={15} /> },
  { key: "minKm", label: "Minimum distance per ride", hint: "Rides shorter than this do not count", unit: () => "km", icon: <MapPinned size={15} /> },
  { key: "minRating", label: "Rating at least", hint: "Driver rating, 1 to 5", unit: () => "stars", icon: <Star size={15} />, max: 5 },
  { key: "minOnlineMin", label: "Online at least", hint: "Minutes online in the time window", unit: () => "min", icon: <Timer size={15} /> },
  { key: "maxRides", label: "Max rides counted", hint: "Extra rides after this do not add more", unit: () => "rides", icon: <Gauge size={15} /> },
  { key: "maxPayout", label: "Max payout per driver", hint: "The most one driver can earn", unit: (symbol) => symbol, icon: <Trophy size={15} /> },
];

function Section({ n, title, icon, children }: { n: number; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="db-section" aria-label={title}>
      <h4><i>{n}</i>{icon}{title}</h4>
      {children}
    </section>
  );
}

type Props = {
  country: MarketId;
  book: BonusBook;
  agentId: string | null;
  canEdit: boolean;
  drivers: BonusDriver[];
  fleets: { id: string; name: string }[];
  start: DriverBonus;
  now: number;
  onSaved: (message: string) => void;
  onClose: () => void;
};

/** Make or change a driver bonus. Left: the steps. Right: how drivers see it, and what it can cost. */
export function BonusBuilder({ country, book, agentId, canEdit, drivers, fleets, start, now, onSaved, onClose }: Props) {
  const [bonus, setBonus] = useState<DriverBonus>(start);
  const [query, setQuery] = useState("");
  const symbol = SYMBOL[country];
  const info = market(country);
  const money = (value: number) => `${new Intl.NumberFormat(info.locale, { maximumFractionDigits: 2 }).format(value)} ${symbol}`;
  const editing = Boolean(start.id);
  const set = (patch: Partial<DriverBonus>) => setBonus((current) => ({ ...current, ...patch }));
  const setRule = <K extends keyof BonusRules>(key: K, value: Partial<BonusRules[K]>) => setBonus((current) => ({ ...current, rules: { ...current.rules, [key]: { ...current.rules[key], ...value } } }));
  const setReward = (patch: Partial<DriverBonus["reward"]>) => setBonus((current) => ({ ...current, reward: { ...current.reward, ...patch } }));
  const error = validateBonus(bonus);
  const saved = agentId ? saveBonus(book, bonus, agentId, now) : { book, error: "Sign in again." };
  const audience = drivers.filter((driver) => inAudience(bonus, driver.facts));
  const most = maxPerDriver(bonus);
  const shown = useMemo(() => drivers.filter((driver) => !query.trim() || `${driver.name} ${driver.code}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 60), [drivers, query]);
  const toggleDay = (day: number) => set({ days: bonus.days.includes(day) ? bonus.days.filter((item) => item !== day) : [...bonus.days, day].sort() });

  function chooseKind(kind: BonusKind) {
    set({ kind, name: bonus.name === "Morning rush" && kind === "area" ? "Area bonus" : bonus.name === "Area bonus" && kind === "rides" ? "Morning rush" : bonus.name });
  }

  return (
    <div className="db-builder">
      <div className="db-form">
        <div className="db-form-head">
          <h3>{editing ? `Change ${start.name}` : "New driver bonus"}</h3>
          <button data-command="admin.confirm.cancel" type="button" className="icon-ghost" aria-label="Close bonus form" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>

        <Section n={1} title="Kind and name" icon={<Layers size={15} />}>
          <div className="db-kinds" role="radiogroup" aria-label="Bonus kind">
            <button data-command="admin.drivers.bonusForm" type="button" role="radio" aria-checked={bonus.kind === "rides"} className={bonus.kind === "rides" ? "db-kind on" : "db-kind"} onClick={() => chooseKind("rides")}>
              <Zap size={20} aria-hidden="true" />
              <span><b>Ride bonus</b><small>Do rides in a time window, anywhere in the zones you pick</small></span>
            </button>
            <button data-command="admin.drivers.bonusForm" type="button" role="radio" aria-checked={bonus.kind === "area"} className={bonus.kind === "area" ? "db-kind on area" : "db-kind area"} onClick={() => chooseKind("area")}>
              <MapPinned size={20} aria-hidden="true" />
              <span><b>Area bonus</b><small>Only rides in an area you draw on the map</small></span>
            </button>
          </div>
          <label className="field">Name drivers see<input aria-label="Bonus name" value={bonus.name} maxLength={40} onChange={(event) => set({ name: event.target.value })} placeholder="Morning rush" /></label>
          <label className="field">Message to drivers <small>(optional, shown in the app and on the map)</small>
            <textarea aria-label="Message to drivers" rows={2} maxLength={140} value={bonus.note} onChange={(event) => set({ note: event.target.value })} placeholder={bonus.kind === "area" ? "Concert ends at 22:00. Wait at the north exit." : "Busy morning. Stay online near the station."} />
            <small className="fine">{bonus.note.length} / 140</small>
          </label>
        </Section>

        <Section n={2} title="Reward" icon={<Trophy size={15} />}>
          <div className="db-rewards" role="radiogroup" aria-label="Reward type">
            {REWARD_TYPES.map((item) => (
              <button data-command="admin.drivers.bonusForm" key={item.id} type="button" role="radio" aria-checked={bonus.reward.type === item.id} className={bonus.reward.type === item.id ? "db-reward on" : "db-reward"} onClick={() => setReward({ type: item.id as RewardType, amount: REWARD_START[item.id as RewardType][country] })}>
                <b>{item.label}</b><small>{item.hint}</small>
              </button>
            ))}
          </div>
          {bonus.reward.type === "target" ? (
            <div className="db-row">
              <label className="field">Rides to do<NumberField label="Rides to do" value={bonus.reward.rides} unit="rides" max={50} onChange={(value) => setReward({ rides: Math.round(value) })} /></label>
              <label className="field">Bonus<NumberField label="Bonus amount" value={bonus.reward.amount} unit={symbol} onChange={(value) => setReward({ amount: value })} /></label>
            </div>
          ) : null}
          {bonus.reward.type === "steps" ? (
            <div className="db-steps" aria-label="Steps">
              {bonus.reward.steps.map((step, index) => (
                <div key={index} className="db-step">
                  <i>{index + 1}</i>
                  <label className="field">Rides<NumberField label={`Step ${index + 1} rides`} value={step.rides} unit="rides" max={50} onChange={(value) => setReward({ steps: bonus.reward.steps.map((item, at) => (at === index ? { ...item, rides: Math.round(value) } : item)) })} /></label>
                  <label className="field">Bonus<NumberField label={`Step ${index + 1} amount`} value={step.amount} unit={symbol} onChange={(value) => setReward({ steps: bonus.reward.steps.map((item, at) => (at === index ? { ...item, amount: value } : item)) })} /></label>
                  <button data-command="admin.drivers.bonusForm" type="button" className="icon-ghost" aria-label={`Remove step ${index + 1}`} disabled={bonus.reward.steps.length <= 2} onClick={() => setReward({ steps: bonus.reward.steps.filter((_, at) => at !== index) })}><Minus size={14} aria-hidden="true" /></button>
                </div>
              ))}
              <button data-command="admin.drivers.bonusForm" type="button" className="dash-btn small ghost" disabled={bonus.reward.steps.length >= 6} onClick={() => {
                const last = bonus.reward.steps[bonus.reward.steps.length - 1] ?? { rides: 2, amount: 50 };
                setReward({ steps: [...bonus.reward.steps, { rides: last.rides + 2, amount: Math.round(last.amount * 1.5) }] });
              }}><Plus size={13} aria-hidden="true" /> Add a step</button>
              <small className="fine">Drivers get the highest step they reach, not all of them added up.</small>
            </div>
          ) : null}
          {bonus.reward.type === "per_ride" ? (
            <div className="db-row">
              <label className="field">Extra on each ride<NumberField label="Extra per ride" value={bonus.reward.amount} unit={symbol} onChange={(value) => setReward({ amount: value })} /></label>
              <small className="fine">Set "Max payout per driver" in the rules so the cost has a limit.</small>
            </div>
          ) : null}
          {bonus.reward.type === "multiplier" ? (
            <div className="db-row">
              <label className="field">Boost on fares<NumberField label="Earnings boost" value={bonus.reward.multiplier} unit="×" step={0.05} max={3} onChange={(value) => setReward({ multiplier: value })} /></label>
              <small className="fine">×1.3 means 30% more on the driver's share of each fare. Needs a max payout.</small>
            </div>
          ) : null}
          {bonus.reward.type === "guarantee" ? (
            <div className="db-row">
              <label className="field">At least per hour<NumberField label="Guaranteed per hour" value={bonus.reward.amount} unit={symbol} onChange={(value) => setReward({ amount: value })} /></label>
              <small className="fine">If the driver earns less while online in the window, Movera pays the rest. Needs a max payout.</small>
            </div>
          ) : null}
        </Section>

        <Section n={3} title="When" icon={<Clock size={15} />}>
          <div className="db-row">
            <label className="field">From<input type="time" aria-label="Start time" value={bonus.start} onChange={(event) => set({ start: event.target.value })} /></label>
            <label className="field">To<input type="time" aria-label="End time" value={bonus.end} onChange={(event) => set({ end: event.target.value })} /></label>
            <span className="db-window">{windowMinutes(bonus) ? `${Math.floor(windowMinutes(bonus) / 60)} h ${windowMinutes(bonus) % 60 ? `${windowMinutes(bonus) % 60} min` : ""}` : "—"}{bonus.end < bonus.start ? " · past midnight" : ""}</span>
          </div>
          <div className="db-days" role="group" aria-label="Days">
            {DAY_SHORT.map((label, day) => (
              <button data-command="admin.drivers.bonusForm" key={label} type="button" aria-pressed={bonus.days.includes(day)} className={bonus.days.includes(day) ? "db-day on" : "db-day"} onClick={() => toggleDay(day)}>{label}</button>
            ))}
            <span className="db-quick">
              <button data-command="admin.drivers.bonusForm" type="button" className="zn-chip" onClick={() => set({ days: [0, 1, 2, 3, 4] })}>Weekdays</button>
              <button data-command="admin.drivers.bonusForm" type="button" className="zn-chip" onClick={() => set({ days: [5, 6] })}>Weekend</button>
              <button data-command="admin.drivers.bonusForm" type="button" className="zn-chip" onClick={() => set({ days: [0, 1, 2, 3, 4, 5, 6] })}>Every day</button>
            </span>
          </div>
          <div className="db-row">
            <label className="field">First day<input type="date" aria-label="First day" value={bonus.from} onChange={(event) => set({ from: event.target.value })} /></label>
            <label className="field">Last day <small>(empty = no end)</small><input type="date" aria-label="Last day" value={bonus.until} onChange={(event) => set({ until: event.target.value })} /></label>
          </div>
        </Section>

        <Section n={4} title="Where" icon={<MapPinned size={15} />}>
          {bonus.kind === "rides" ? (
            <fieldset className="rd-chips">
              <legend>Zones in {info.name} <small>(none = the whole country)</small></legend>
              {info.zones.map((zone) => (
                <label key={zone.id} className={bonus.zones.includes(zone.id) ? "check-chip on" : "check-chip"}>
                  <input type="checkbox" checked={bonus.zones.includes(zone.id)} onChange={() => set({ zones: bonus.zones.includes(zone.id) ? bonus.zones.filter((id) => id !== zone.id) : [...bonus.zones, zone.id] })} />{zone.name}
                </label>
              ))}
            </fieldset>
          ) : (
            <>
              <div className="zn-seg db-seg" role="radiogroup" aria-label="A ride counts when">
                {([["pickup", "Pickup inside"], ["dropoff", "Drop-off inside"], ["both", "Both inside"]] as const).map(([id, label]) => (
                  <button data-command="admin.drivers.bonusForm" key={id} type="button" role="radio" aria-checked={bonus.areaCounts === id} className={bonus.areaCounts === id ? "on" : undefined} onClick={() => set({ areaCounts: id })}>{label}</button>
                ))}
              </div>
              <BonusAreaMap country={country} areas={bonus.areas} onChange={(areas) => set({ areas })} />
            </>
          )}
        </Section>

        <Section n={5} title="Rules" icon={<ShieldCheck size={15} />}>
          <p className="fine">Switch on the rules you want. Off rules do not count.</p>
          <ul className="db-rules" aria-label="Rules">
            {RULES.map((rule) => {
              const value = bonus.rules[rule.key];
              return (
                <li key={rule.key} className={value.on ? "db-rule on" : "db-rule"}>
                  <label className="db-rule-switch">
                    <input type="checkbox" aria-label={`${rule.label} on`} checked={value.on} onChange={(event) => setRule(rule.key, { on: event.target.checked })} />
                    <span className="zd-switch" aria-hidden="true"><i /></span>
                  </label>
                  <span className="db-rule-icon" aria-hidden="true">{rule.icon}</span>
                  <span className="db-rule-text"><b>{rule.label}</b><small>{rule.hint}</small></span>
                  <NumberField label={rule.label} value={value.value} unit={rule.unit(symbol)} step={rule.key === "minRating" ? 0.1 : 1} max={rule.max} disabled={!value.on} onChange={(next) => setRule(rule.key, { value: next })} />
                </li>
              );
            })}
            <li className={bonus.rules.categories.on ? "db-rule on wide" : "db-rule wide"}>
              <label className="db-rule-switch">
                <input type="checkbox" aria-label="Only some categories on" checked={bonus.rules.categories.on} onChange={(event) => setRule("categories", { on: event.target.checked })} />
                <span className="zd-switch" aria-hidden="true"><i /></span>
              </label>
              <span className="db-rule-icon" aria-hidden="true"><Tags size={15} /></span>
              <span className="db-rule-text"><b>Only some categories</b><small>Rides in other categories do not count</small></span>
              {bonus.rules.categories.on ? (
                <span className="db-cats">
                  {CATEGORIES.map((category) => (
                    <label key={category.id} className={bonus.rules.categories.value.includes(category.id) ? "check-chip on" : "check-chip"}>
                      <input type="checkbox" aria-label={`Bonus category ${category.label}`} checked={bonus.rules.categories.value.includes(category.id)} onChange={() => setRule("categories", { value: bonus.rules.categories.value.includes(category.id) ? bonus.rules.categories.value.filter((id) => id !== category.id) : [...bonus.rules.categories.value, category.id] })} />{category.label}
                    </label>
                  ))}
                </span>
              ) : null}
            </li>
          </ul>
        </Section>

        <Section n={6} title="Who gets it and budget" icon={<Users size={15} />}>
          <div className="db-row">
            <label className="field">Drivers
              <select aria-label="Bonus audience" value={bonus.audience} onChange={(event) => set({ audience: event.target.value as DriverBonus["audience"] })}>
                {AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            {bonus.audience === "fleet" ? (
              <label className="field">Fleet
                <select aria-label="Bonus fleet" value={bonus.fleetId} onChange={(event) => set({ fleetId: event.target.value })}>
                  <option value="">Pick a fleet</option>
                  {fleets.map((fleet) => <option key={fleet.id} value={fleet.id}>{fleet.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="field">Total budget <small>(optional)</small>
              <span className="db-budget">
                <NumberField label="Bonus budget" value={bonus.budget ?? 0} unit={symbol} onChange={(value) => set({ budget: value > 0 ? value : null })} />
              </span>
            </label>
          </div>
          {bonus.audience === "picked" ? (
            <div className="db-pick">
              <label className="rd-search small"><Search size={14} aria-hidden="true" /><input aria-label="Find drivers for the bonus" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find by name or code" /></label>
              <ul className="rd-audience-list" aria-label="Drivers for the bonus">
                {shown.map((driver) => (
                  <li key={driver.facts.id} className={bonus.driverIds.includes(driver.facts.id) ? "on" : undefined}>
                    <label>
                      <input type="checkbox" aria-label={`Give bonus to ${driver.name}`} disabled={driver.facts.status !== "active"} checked={bonus.driverIds.includes(driver.facts.id)} onChange={() => set({ driverIds: bonus.driverIds.includes(driver.facts.id) ? bonus.driverIds.filter((id) => id !== driver.facts.id) : [...bonus.driverIds, driver.facts.id] })} />
                      <span className="rd-aud-name">{driver.name}<small>{driver.code}{driver.facts.status !== "active" ? ` · ${driver.facts.status}` : ""}</small></span>
                      <span className="rd-aud-num">Rating {driver.facts.rating.toFixed(2)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="fine"><CalendarDays size={12} aria-hidden="true" /> Only active drivers get bonuses. A driver on hold or suspended earns nothing.</p>
        </Section>
      </div>

      <aside className="db-side">
        <DriverAppPreview bonus={bonus} money={money} categoryName={categoryName} />
        <dl className="rd-cost db-cost">
          <div><dt>Drivers in it</dt><dd>{audience.length}</dd></div>
          <div><dt>Most per driver, each time</dt><dd>{most === null ? "No limit" : money(most)}</dd></div>
          <div><dt>Most it can cost, each time</dt><dd>{most === null ? "No limit" : money(most * audience.length)}</dd></div>
          <div><dt>Budget</dt><dd>{bonus.budget ? money(bonus.budget) : "No budget"}</dd></div>
        </dl>
        {error ? <p className="rd-form-error" role="alert">{error}</p> : null}
        <CommandButton command={editing ? "admin.drivers.bonusEdit" : "admin.drivers.bonusCreate"} className="dash-btn publish" targetId={bonus.name || "bonus"} confirmTarget={false} scope="all" before={editing ? start.name : "none"} after={`${bonus.name}: ${bonus.kind}, ${bonus.start}-${bonus.end}`} expectedSliceRev={book.draftRev} sliceKey={BONUS_KEY} value={saved.book} disabled={!canEdit || Boolean(error) || Boolean(saved.error)} title={error ?? saved.error} onDone={() => onSaved(editing ? `Bonus ${bonus.name} changed.` : `Bonus ${bonus.name} is on for ${audience.length} driver${audience.length === 1 ? "" : "s"}.`)}>
          <Zap size={15} aria-hidden="true" /> {editing ? "Save changes" : "Start bonus"}
        </CommandButton>
      </aside>
    </div>
  );
}
