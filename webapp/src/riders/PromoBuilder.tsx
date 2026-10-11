import { useMemo, useState } from "react";
import { Crown, Search, Sparkles, Users, X } from "lucide-react";
import { market, type MarketId } from "../markets/markets";
import { NumberField } from "../pricing/NumberField";
import { CommandButton } from "../ui/CommandButton";
import { CARE_KEY, createPromotion, maxCost, validatePromo, type PromoDraft, type RiderCare } from "./care";
import { categoryName } from "./profile";
import type { RiderRow, SegmentId } from "./segments";
import { CURRENCY_SYMBOL, money, PromoTicketCard } from "./ui";
import { CARD_IMAGES, RiderAppPreview, imageUrl } from "./RiderAppPreview";

const CATEGORIES = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet", "child_seat"];
const QUICK: { id: SegmentId; label: string }[] = [
  { id: "new", label: "New riders" },
  { id: "top", label: "Top riders" },
  { id: "loyal", label: "Loyal riders" },
  { id: "inactive", label: "Inactive" },
  { id: "all", label: "Everyone" },
];

type Props = {
  country: MarketId;
  care: RiderCare;
  agentId: string | null;
  canEdit: boolean;
  /** Riders to choose from (group promotion). One row means a promotion for that rider only. */
  rows: RiderRow[];
  preselected?: string[];
  single?: boolean;
  onCreated: (message: string) => void;
  onClose?: () => void;
};

function isoDay(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** Build a promotion like "30% off the next 10 rides, max 50 kr per ride" for one rider or a group. */
export function PromoBuilder({ country, care, agentId, canEdit, rows, preselected = [], single = false, onCreated, onClose }: Props) {
  const symbol = CURRENCY_SYMBOL[country];
  const defaults = { SE: [50, 0], FR: [5, 0], TN: [15, 0] }[country];
  const [code, setCode] = useState(single ? `${(rows[0]?.rider.name.split(" ")[0] ?? "RIDER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}30` : "");
  const [title, setTitle] = useState(single ? "A gift from Movera" : "");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(30);
  const [rides, setRides] = useState(10);
  const [maxPerRide, setMaxPerRide] = useState(defaults[0]);
  const [minFare, setMinFare] = useState(defaults[1]);
  const [from, setFrom] = useState(isoDay(0));
  const [to, setTo] = useState(isoDay(30));
  const [categories, setCategories] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [budget, setBudget] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(single ? rows.map((row) => row.rider.id) : preselected));
  const [group, setGroup] = useState(single ? "One rider" : preselected.length ? "Picked riders" : "");
  const [query, setQuery] = useState("");
  const [image, setImage] = useState("gradient");

  const draft: PromoDraft = {
    code: code.trim().toUpperCase(), title, kind, value, rides, maxPerRide: kind === "percent" ? maxPerRide : value, minFare,
    validFrom: from ? new Date(`${from}T00:00:00`).toISOString() : "", validTo: to ? new Date(`${to}T23:59:00`).toISOString() : "",
    country, zones, categories, budget: budget > 0 ? budget : null, riderIds: [...picked], group: group || "Picked riders", image,
  };
  const error = validatePromo(draft);
  const created = agentId ? createPromotion(care, draft, agentId, Date.now()) : { care, error: "Sign in again." };
  const shown = useMemo(() => rows.filter((row) => !query.trim() || `${row.rider.name} ${row.profile.code}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 80), [rows, query]);
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

  function quickPick(id: SegmentId, label: string) {
    setPicked(new Set(rows.filter((row) => row.segments.has(id) && !row.segments.has("blocked")).map((row) => row.rider.id)));
    setGroup(label);
  }

  return (
    <div className={single ? "rd-builder single" : "rd-builder"}>
      <div className="rd-builder-form">
        <div className="rd-builder-head">
          <h3>{single ? "New promotion for this rider" : "New group promotion"}</h3>
          {onClose ? <button data-command="admin.confirm.cancel" type="button" className="icon-ghost" aria-label="Close promotion" onClick={onClose}><X size={16} aria-hidden="true" /></button> : null}
        </div>
        <div className="rd-form-grid">
          <label className="field">Code<input aria-label="Promotion code" value={code} maxLength={16} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="SPRING30" /></label>
          <label className="field">Title riders see<input aria-label="Promotion title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Thank you for riding" /></label>
        </div>
        <div className="rd-kind" role="radiogroup" aria-label="Discount type">
          <button data-command="admin.ui.quickAction" type="button" role="radio" aria-checked={kind === "percent"} className={kind === "percent" ? "active" : undefined} onClick={() => setKind("percent")}>% off</button>
          <button data-command="admin.ui.quickAction" type="button" role="radio" aria-checked={kind === "fixed"} className={kind === "fixed" ? "active" : undefined} onClick={() => setKind("fixed")}>Fixed amount off</button>
        </div>
        <div className="rd-form-grid four">
          <label className="field">{kind === "percent" ? "Discount" : "Amount off"}<NumberField label="Promotion discount" value={value} unit={kind === "percent" ? "%" : symbol} max={kind === "percent" ? 100 : undefined} onChange={setValue} /></label>
          <label className="field">For the next<NumberField label="Promotion rides" value={rides} unit="rides" max={100} onChange={(next) => setRides(Math.round(next))} /></label>
          {kind === "percent" ? <label className="field">Max per ride<NumberField label="Promotion max per ride" value={maxPerRide} unit={symbol} onChange={setMaxPerRide} /></label> : null}
          <label className="field">Min fare<NumberField label="Promotion min fare" value={minFare} unit={symbol} onChange={setMinFare} /></label>
          <label className="field">Starts<input type="date" aria-label="Promotion starts" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="field">Ends<input type="date" aria-label="Promotion ends" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label className="field">Budget (optional)<NumberField label="Promotion budget" value={budget} unit={symbol} onChange={setBudget} /></label>
        </div>
        <fieldset className="rd-chips rd-pictures">
          <legend>Picture on the rider app card</legend>
          {CARD_IMAGES.map((item) => (
            <label key={item.id} className={image === item.id ? "rd-pic on" : "rd-pic"}>
              <input type="radio" name="promo-picture" aria-label={`Picture ${item.label}`} checked={image === item.id} onChange={() => setImage(item.id)} />
              <span className="rd-pic-thumb" style={imageUrl(item.id) ? { backgroundImage: `url(${imageUrl(item.id)})` } : undefined} aria-hidden="true" />
              {item.label}
            </label>
          ))}
        </fieldset>
        <fieldset className="rd-chips">
          <legend>Categories <small>(none = all)</small></legend>
          {CATEGORIES.map((id) => (
            <label key={id} className={categories.includes(id) ? "check-chip on" : "check-chip"}>
              <input type="checkbox" checked={categories.includes(id)} onChange={() => setCategories(toggle(categories, id))} />{categoryName(id)}
            </label>
          ))}
        </fieldset>
        <fieldset className="rd-chips">
          <legend>Zones in {market(country).name} <small>(none = all)</small></legend>
          {market(country).zones.map((zone) => (
            <label key={zone.id} className={zones.includes(zone.id) ? "check-chip on" : "check-chip"}>
              <input type="checkbox" checked={zones.includes(zone.id)} onChange={() => setZones(toggle(zones, zone.id))} />{zone.name}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="rd-builder-side">
        <RiderAppPreview promo={draft} />
        <PromoTicketCard ticket={{ ...draft, status: "active" }} locale={market(country).locale} />
        <dl className="rd-cost">
          <div><dt>Riders</dt><dd>{picked.size}</dd></div>
          <div><dt>Most it can cost</dt><dd>{money(Math.round(maxCost(draft) * market(country).minorUnits), country)}</dd></div>
          <div><dt>Budget</dt><dd>{budget > 0 ? money(budget * market(country).minorUnits, country) : "No limit"}</dd></div>
        </dl>
        {error ? <p className="rd-form-error" role="alert">{error}</p> : null}
        <CommandButton command="admin.riders.promoCreate" className="dash-btn publish" targetId={draft.code || "promotion"} confirmTarget={false} scope="all" before="none" after={`${draft.code} for ${picked.size} riders`} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={created.care} disabled={!canEdit || Boolean(error) || Boolean(created.error)} title={error ?? created.error} onDone={() => onCreated(`Promotion ${draft.code} given to ${picked.size} rider${picked.size === 1 ? "" : "s"}.`)}>
          <Sparkles size={15} aria-hidden="true" /> Give promotion
        </CommandButton>
      </div>

      {!single ? (
        <div className="rd-audience">
          <div className="rd-audience-head">
            <h4><Users size={15} aria-hidden="true" /> Who gets it · {picked.size} selected</h4>
            <div className="rd-quick" role="group" aria-label="Quick groups">
              {QUICK.map((item) => <button data-command="admin.riders.select" key={item.id} type="button" className={group === item.label ? "check-chip on" : "check-chip"} onClick={() => quickPick(item.id, item.label)}>{item.label}</button>)}
              <button data-command="admin.riders.select" type="button" className="check-chip" onClick={() => { setPicked(new Set()); setGroup(""); }}>Clear</button>
            </div>
          </div>
          <label className="rd-search small"><Search size={14} aria-hidden="true" /><input aria-label="Find riders for the promotion" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find by name or code" /></label>
          <ul className="rd-audience-list" aria-label="Riders for the promotion">
            {shown.map((row) => (
              <li key={row.rider.id} className={picked.has(row.rider.id) ? "on" : undefined}>
                <label>
                  <input type="checkbox" aria-label={`Give promotion to ${row.rider.name}`} checked={picked.has(row.rider.id)} disabled={row.segments.has("blocked")} onChange={() => {
                    setPicked((current) => {
                      const next = new Set(current);
                      if (next.has(row.rider.id)) next.delete(row.rider.id);
                      else next.add(row.rider.id);
                      return next;
                    });
                    setGroup("Picked riders");
                  }} />
                  <span className="rd-aud-name">{row.rider.name}<small>{row.profile.code}</small></span>
                  {row.isNew ? <span className="rd-badge new"><Sparkles size={11} aria-hidden="true" />New</span> : null}
                  {row.segments.has("top") ? <span className="rd-badge top"><Crown size={11} aria-hidden="true" />Top</span> : null}
                  <span className="rd-aud-num"><b>{row.profile.completed}</b> rides</span>
                  <span className="rd-aud-num">{money(row.profile.spentMinor, row.profile.country, true)}</span>
                </label>
              </li>
            ))}
          </ul>
          {rows.length > shown.length ? <small className="fine">Showing {shown.length} of {rows.length}. Use a quick group or search to reach the rest.</small> : null}
        </div>
      ) : null}
    </div>
  );
}
