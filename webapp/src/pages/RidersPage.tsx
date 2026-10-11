import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  Crown,
  Download,
  Gift,
  Heart,
  MessageCircleWarning,
  MessageSquare,
  Moon,
  Plus,
  Radio,
  Search,
  Send,
  ShieldOff,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { can } from "../auth/permissions";
import { AccountChip, Avatar, ContactActions } from "../fleet/ui";
import { market, zoneById } from "../markets/markets";
import { useMarketScope } from "../markets/useMarketScope";
import { AUTO_AUDIENCES, CARE_KEY, REPLY_TEMPLATES, autoState, type AutoAudience, editPromotion, messageGroup, promoResults, promoUsed, saveFilter, setAutoPromos, setPromotionOn, stopPromotion, type AutoPromos, type PromoEdit, type RiderCare } from "../riders/care";
import { PromoBuilder } from "../riders/PromoBuilder";
import { PromoShare } from "../riders/PromoShare";
import { RiderAppPreview } from "../riders/RiderAppPreview";
import { useCategoryPrices } from "../riders/useCategoryPrices";
import { categoryName } from "../riders/profile";
import { PERIODS, SEGMENTS, SORTS, insights, matches, ridersCsv, segmentCounts, sortRows, type Period, type RiderRow, type SegmentId, type SortId } from "../riders/segments";
import { LiveChip, PromoTicketCard, RiderBadges, Stars, money } from "../riders/ui";
import { useRidersData } from "../riders/useRidersData";
import { NumberField } from "../pricing/NumberField";
import { CommandButton } from "../ui/CommandButton";
import { useDialogFocus } from "../ui/useDialogFocus";

type View = "riders" | "promotions" | "insights";

const ICONS: Record<SegmentId, ReactNode> = {
  all: <Users size={17} />,
  new: <Sparkles size={17} />,
  top: <Crown size={17} />,
  loyal: <Heart size={17} />,
  online: <Radio size={17} />,
  attention: <AlertTriangle size={17} />,
  reply: <MessageCircleWarning size={17} />,
  unpaid: <Wallet size={17} />,
  cancels: <XCircle size={17} />,
  inactive: <Moon size={17} />,
  promo: <Gift size={17} />,
  blocked: <ShieldOff size={17} />,
};

const TONE: Record<SegmentId, string> = {
  all: "blue", new: "violet", top: "amber", loyal: "pink", online: "green", attention: "red",
  reply: "red", unpaid: "orange", cancels: "orange", inactive: "grey", promo: "aqua", blocked: "grey",
};

const PAGE = 40;

export function RidersPage() {
  const { agent } = useSession();
  const role = agent?.role ?? "viewer";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { market: place, country } = useMarketScope();
  const view = (["riders", "promotions", "insights"].includes(params.get("view") ?? "") ? params.get("view") : "riders") as View;
  const segment = (SEGMENTS.find((item) => item.id === params.get("seg"))?.id ?? "all") as SegmentId;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>(segment === "top" ? "rides" : "recent");
  const [period, setPeriod] = useState<Period>("month");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [limit, setLimit] = useState(PAGE);
  const [notice, setNotice] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [builder, setBuilder] = useState<string[] | null>(null);
  const [filterName, setFilterName] = useState<string | null>(null);
  const data = useRidersData(period);
  const { rows, care, now } = data;
  const counts = useMemo(() => segmentCounts(rows), [rows]);
  const filtered = useMemo(() => sortRows(rows.filter((row) => row.segments.has(segment) && matches(row, query)), sort), [rows, segment, query, sort]);
  const shown = filtered.slice(0, limit);
  const chosen = rows.filter((row) => selected.has(row.rider.id));
  const keep = params.get("country") ? `?country=${params.get("country")}` : "";
  const date = new Intl.DateTimeFormat(place.locale, { day: "numeric", month: "short", year: "2-digit" });

  function go(next: { view?: View; seg?: SegmentId }) {
    const search = new URLSearchParams(params);
    if (next.view) search.set("view", next.view);
    if (next.seg) search.set("seg", next.seg);
    setParams(search);
    setLimit(PAGE);
    if (next.seg === "top") setSort("rides");
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv(list: RiderRow[]) {
    const csv = ridersCsv(list, (row, minor) => money(minor, row.profile.country));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `movera-riders-${country}-${new Date(now).toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice(`Exported ${list.length} rider${list.length === 1 ? "" : "s"} to CSV.`);
  }

  const save = agent && filterName !== null ? saveFilter(care, { name: filterName, by: agent.id, segment, query, sort, period }) : { care, error: "Name the filter." };
  const mine = care.savedFilters.filter((item) => item.by === agent?.id);

  return (
    <div className="fd-page rd-page">
      <div className="fd-head">
        <div>
          <h2>Riders</h2>
          <p>{data.loading ? "Loading riders." : `${rows.length} riders in ${place.name}.`} Click a rider to see every booking, payment, message and promotion.</p>
        </div>
        {can(role, "riders.promotions") ? (
          <button data-command="admin.riders.promoCreate" type="button" className="dash-btn publish" onClick={() => { setBuilder([]); go({ view: "promotions" }); }}>
            <Ticket size={15} aria-hidden="true" /> New promotion
          </button>
        ) : null}
      </div>

      <div className="dash-tabs" role="tablist" aria-label="Riders sections">
        {([["riders", "Riders", <Users key="u" size={15} />], ["promotions", "Promotions", <Gift key="g" size={15} />], ["insights", "Insights", <BarChart3 key="b" size={15} />]] as const).map(([id, label, icon]) => (
          <button data-command="admin.riders.view" key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? "active" : undefined} onClick={() => go({ view: id })}>
            {icon}{label}
            {id === "riders" && counts.attention ? <span className="tab-count">{counts.attention}</span> : null}
          </button>
        ))}
      </div>

      {notice || data.careSlice.message ? <p className="fd-notice" role="status">{notice} {data.careSlice.message}</p> : null}

      {view === "riders" ? (
        <>
          <section className="rd-segments" aria-label="Rider categories">
            {SEGMENTS.map((item) => (
              <button data-command="admin.table.filter" key={item.id} type="button" className={`rd-seg tone-${TONE[item.id]}${segment === item.id ? " active" : ""}`} aria-pressed={segment === item.id} title={item.hint} onClick={() => go({ seg: item.id })}>
                <span className="rd-seg-icon" aria-hidden="true">{ICONS[item.id]}</span>
                <span className="rd-seg-label">{item.label}</span>
                <strong>{counts[item.id]}</strong>
              </button>
            ))}
          </section>

          <div className="rd-toolbar">
            <label className="rd-search"><Search size={15} aria-hidden="true" /><input aria-label="Find rider" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE); }} placeholder="Name, phone, email, rider code or trip" /></label>
            <label className="fd-select"><span>Sort</span>
              <select aria-label="Sort riders" value={sort} onChange={(event) => setSort(event.target.value as SortId)}>
                {SORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <div className="rd-period" role="radiogroup" aria-label="Ranking period">
              {PERIODS.map((item) => <button data-command="admin.ui.period" key={item.id} type="button" role="radio" aria-checked={period === item.id} className={period === item.id ? "active" : undefined} onClick={() => setPeriod(item.id)}>{item.label}</button>)}
            </div>
            <label className="fd-select"><span><Bookmark size={12} aria-hidden="true" /> Saved</span>
              <select aria-label="Saved filters" value="" onChange={(event) => {
                const found = mine.find((item) => item.id === event.target.value);
                if (!found) return;
                setQuery(found.query);
                setSort(found.sort as SortId);
                setPeriod(found.period as Period);
                go({ seg: found.segment as SegmentId });
              }}>
                <option value="">{mine.length ? "Pick a saved filter" : "No saved filter"}</option>
                {mine.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {filterName === null ? (
              <button data-command="admin.riders.saveFilter" type="button" className="dash-btn ghost small" onClick={() => setFilterName("")}><Bookmark size={13} aria-hidden="true" /> Save filter</button>
            ) : (
              <span className="rd-inline">
                <input aria-label="Filter name" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Top riders in Norrmalm" />
                <CommandButton command="admin.riders.saveFilter" className="dash-btn small" targetId="saved-filter" confirmTarget={false} scope="all" before="" after={filterName} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={save.care} disabled={Boolean(save.error)} onDone={() => { setNotice(`Filter "${filterName}" saved.`); setFilterName(null); }}>Save</CommandButton>
                <button data-command="admin.confirm.cancel" type="button" className="link-action" onClick={() => setFilterName(null)}>Cancel</button>
              </span>
            )}
            <button data-command="admin.riders.export" type="button" className="dash-btn ghost small" onClick={() => exportCsv(filtered)}><Download size={13} aria-hidden="true" /> Export</button>
          </div>

          {segment === "top" ? (
            <div className="rd-topbar">
              <Crown size={16} aria-hidden="true" />
              <span><b>Top bookers · {PERIODS.find((item) => item.id === period)?.label.toLowerCase()}</b> Ranked by completed rides, then money spent.</span>
              {[10, 25, 50].map((size) => <button data-command="admin.riders.select" key={size} type="button" className="dash-btn small ghost" onClick={() => setSelected(new Set(filtered.slice(0, size).map((row) => row.rider.id)))}>Select top {size}</button>)}
            </div>
          ) : null}

          {selected.size ? (
            <div className="rd-bulk" role="region" aria-label="Selected riders">
              <b>{selected.size} selected</b>
              {can(role, "support.reply") ? <button data-command="admin.riders.bulkMessage" type="button" className="dash-btn small" onClick={() => setMessageOpen(true)}><MessageSquare size={13} aria-hidden="true" /> Message</button> : null}
              {can(role, "riders.promotions") ? <button data-command="admin.riders.promoCreate" type="button" className="dash-btn small" onClick={() => { setBuilder([...selected]); go({ view: "promotions" }); }}><Gift size={13} aria-hidden="true" /> Add promotion</button> : null}
              <button data-command="admin.riders.export" type="button" className="dash-btn small ghost" onClick={() => exportCsv(chosen)}><Download size={13} aria-hidden="true" /> Export</button>
              <button data-command="admin.riders.select" type="button" className="link-action" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          ) : null}

          <div className="rd-list-wrap">
            <div className="rd-row head" aria-hidden="true">
              <span><input type="checkbox" tabIndex={-1} checked={shown.length > 0 && shown.every((row) => selected.has(row.rider.id))} onChange={() => setSelected((current) => (shown.every((row) => current.has(row.rider.id)) ? new Set() : new Set(shown.map((row) => row.rider.id))))} /></span>
              <span>#</span><span /><span>Rider</span><span>Now</span><span>Rating</span><span>Rides</span><span>Spent</span><span>Last ride</span><span>Status</span><span />
            </div>
            {data.loading ? <p className="state-line">Loading riders.</p> : shown.length === 0 ? <p className="state-line">No rider in {SEGMENTS.find((item) => item.id === segment)?.label.toLowerCase()}{query ? ` matching "${query}"` : ""}.</p> : (
              <ul className="rd-list" aria-label="Riders">
                {shown.map((row, index) => (
                  <li key={row.rider.id} className={selected.has(row.rider.id) ? "rd-row on" : "rd-row"} onClick={() => navigate({ pathname: `/riders/${row.rider.id}`, search: keep })}>
                    <span onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${row.rider.name}`} checked={selected.has(row.rider.id)} onChange={() => toggle(row.rider.id)} /></span>
                    <span className="rd-rank">{index + 1}</span>
                    <Avatar name={row.rider.name} size={38} />
                    <span className="rd-who">
                      <Link to={{ pathname: `/riders/${row.rider.id}`, search: keep }} onClick={(event) => event.stopPropagation()}>{row.rider.name}</Link>
                      <small>{row.profile.code} · {zoneById(row.rider.zoneId)?.name ?? row.rider.zoneId}</small>
                      <RiderBadges row={row} compact />
                    </span>
                    <LiveChip state={row.live} />
                    <Stars value={row.profile.rating} />
                    <span className="rd-num" title={`${row.periodRides} in the chosen period · ${row.profile.completed} in total`}><b>{period === "year" || sort === "rides" || segment === "top" ? row.periodRides : row.profile.completed}</b><small>{period === "year" || sort === "rides" || segment === "top" ? `${row.profile.completed} total` : `${row.periodRides} this ${period === "today" ? "day" : period}`}</small></span>
                    <span className="rd-num"><b>{money(segment === "top" || sort === "spent" ? row.periodSpentMinor : row.profile.spentMinor, row.profile.country, true)}</b><small>{segment === "top" || sort === "spent" ? "in period" : "all time"}</small></span>
                    <span className="rd-date">{row.profile.lastRideAt ? date.format(row.profile.lastRideAt) : "Never"}</span>
                    <AccountChip status={row.rider.status} />
                    <span onClick={(event) => event.stopPropagation()}>
                      <ContactActions kind="rider" compact id={row.rider.id} name={row.rider.name} phone={row.rider.phone} zoneId={row.rider.zoneId} messageTo={`/riders/${row.rider.id}?tab=messages`} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {filtered.length > limit ? <button data-command="admin.table.filter" type="button" className="dash-btn ghost rd-more" onClick={() => setLimit((value) => value + PAGE)}>Show {Math.min(PAGE, filtered.length - limit)} more of {filtered.length - limit}</button> : null}
          </div>
        </>
      ) : null}

      {view === "promotions" ? (
        <PromotionsView
          care={care}
          rows={rows}
          country={country}
          agentId={agent?.id ?? null}
          canEdit={can(role, "riders.promotions")}
          builder={builder}
          onBuilder={setBuilder}
          onNotice={(text) => { setNotice(text); setSelected(new Set()); }}
          now={now}
        />
      ) : null}

      {view === "insights" ? <InsightsView rows={rows} now={now} locale={place.locale} country={country} onSegment={(seg) => go({ view: "riders", seg })} /> : null}

      {messageOpen ? <GroupMessage care={care} rows={chosen} agentId={agent?.id ?? ""} now={now} onClose={() => setMessageOpen(false)} onSent={(count) => { setMessageOpen(false); setSelected(new Set()); setNotice(`Message sent to ${count} rider${count === 1 ? "" : "s"}.`); }} /> : null}
    </div>
  );
}

function GroupMessage({ care, rows, agentId, now, onClose, onSent }: { care: RiderCare; rows: RiderRow[]; agentId: string; now: number; onClose: () => void; onSent: (count: number) => void }) {
  const root = useDialogFocus(true, onClose);
  const [text, setText] = useState("");
  return (
    <div ref={root} tabIndex={-1} className="modal open" role="dialog" aria-modal="true" aria-label="Message riders">
      <div className="modal-card rd-modal">
        <h3>Message {rows.length} rider{rows.length === 1 ? "" : "s"}</h3>
        <p className="fine">{rows.slice(0, 6).map((row) => row.rider.name).join(", ")}{rows.length > 6 ? ` and ${rows.length - 6} more` : ""}</p>
        <div className="fd-templates">{REPLY_TEMPLATES.map((item) => <button key={item} data-command="admin.ui.quickAction" type="button" className="fd-template" onClick={() => setText(item)}>{item}</button>)}</div>
        <textarea aria-label="Group message" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write to the selected riders" />
        <div className="cat-actions end">
          <button data-command="admin.confirm.cancel" type="button" className="dash-btn ghost" onClick={onClose}>Cancel</button>
          <CommandButton command="admin.riders.bulkMessage" className="dash-btn" targetId={`${rows.length}-riders`} confirmTarget={false} scope="all" before="" after={`message to ${rows.length}`} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={messageGroup(care, rows.map((row) => row.rider), text, agentId, now)} disabled={!text.trim() || !rows.length} onDone={() => onSent(rows.length)}>
            <MessageSquare size={14} aria-hidden="true" /> Send to {rows.length}
          </CommandButton>
        </div>
      </div>
    </div>
  );
}

function PromotionsView({ care, rows, country, agentId, canEdit, builder, onBuilder, onNotice, now }: { care: RiderCare; rows: RiderRow[]; country: "SE" | "FR" | "TN"; agentId: string | null; canEdit: boolean; builder: string[] | null; onBuilder: (ids: string[] | null) => void; onNotice: (text: string) => void; now: number }) {
  const [editing, setEditing] = useState<{ id: string; edit: PromoEdit } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [chosenPart, setPart] = useState<"list" | "auto">("list");
  // A new promotion always opens in the list part, whichever button started it.
  const part = builder ? "list" : chosenPart;
  const [sharingId, setSharingId] = useState<string | null>(null);
  const sharing = care.promotions.find((ticket) => ticket.id === sharingId) ?? null;
  const prices = useCategoryPrices(country);
  const byId = useMemo(() => new Map(rows.map((row) => [row.rider.id, row])), [rows]);
  const tickets = care.promotions.filter((ticket) => ticket.country === country);
  const locale = market(country).locale;
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return (
    <div className="rd-promos">
      <div className="dash-tabs small rd-promo-parts" role="tablist" aria-label="Promotion types">
        <button data-command="admin.ui.quickAction" type="button" role="tab" aria-selected={part === "list"} className={part === "list" ? "active" : undefined} onClick={() => setPart("list")}><Ticket size={14} aria-hidden="true" /> Promotions and codes <b className="rd-count">{tickets.length}</b></button>
        <button data-command="admin.ui.quickAction" type="button" role="tab" aria-selected={part === "auto"} className={part === "auto" ? "active" : undefined} onClick={() => { onBuilder(null); setPart("auto"); }}><Sparkles size={14} aria-hidden="true" /> Automatic <b className="rd-count">{Object.values(care.autoPromos).filter((item) => autoState(item, now) === "running").length} running</b></button>
      </div>
      {part === "auto" ? <AutoPromosCard key={JSON.stringify(care.autoPromos)} care={care} country={country} canEdit={canEdit} onNotice={onNotice} now={now} /> : <>
      {builder ? (
        <section className="dash-card">
          <PromoBuilder country={country} care={care} agentId={agentId} canEdit={canEdit} rows={rows} preselected={builder} onClose={() => onBuilder(null)} onCreated={(text, id) => { onBuilder(null); onNotice(text); if (id) setSharingId(id); }} />
        </section>
      ) : (
        <button data-command="admin.riders.promoCreate" type="button" className="rd-new-promo" disabled={!canEdit} onClick={() => onBuilder([])}>
          <Plus size={18} aria-hidden="true" /> <span><b>New promotion</b><small>For riders you pick, random or newest riders, or a code anyone can use</small></span>
        </button>
      )}

      <section className="dash-card" aria-labelledby="promo-list-title">
        <div className="card-head">
          <h3 id="promo-list-title"><Ticket size={16} aria-hidden="true" /> Promotions in {market(country).name}</h3>
          <span className="fine-print">{tickets.filter((ticket) => ticket.status === "active").length} active</span>
        </div>
        {tickets.length === 0 ? <p className="state-line">No promotion yet in {market(country).name}.</p> : (
          <ul className="rd-promo-list" aria-label="Promotions">
            {tickets.map((ticket) => {
              const results = promoResults(ticket, (id) => {
                const row = byId.get(id);
                return row ? { used: promoUsed(ticket, id, row.bookings), avgFare: row.profile.avgFareMinor / market(country).minorUnits } : { used: 0, avgFare: 0 };
              });
              const spent = ticket.budget ? Math.min(100, (results.cost / ticket.budget) * 100) : null;
              const symbol = { SE: "kr", FR: "€", TN: "DT" }[country];
              const draft = editing?.id === ticket.id ? editing.edit : null;
              const edited = draft && agentId ? editPromotion(care, ticket.id, draft, agentId, now) : null;
              const on = ticket.status === "active";
              return (
                <li key={ticket.id}>
                  <div className="rd-promo-card">
                    <PromoTicketCard ticket={draft ? { ...ticket, ...draft, maxPerRide: ticket.kind === "percent" ? draft.maxPerRide : draft.value } : ticket} locale={locale} />
                    {ticket.status !== "stopped" ? (
                      <div className="rd-promo-controls">
                        <CommandButton command="admin.riders.promoToggle" className={on ? "surge-toggle on" : "surge-toggle"} targetId={ticket.code} confirmTarget={false} scope="all" before={ticket.status} after={on ? "off" : "on"} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={setPromotionOn(care, ticket.id, !on)} disabled={!canEdit} aria-label={`${ticket.code} ${on ? "on" : "off"}`} onDone={() => onNotice(`Promotion ${ticket.code} switched ${on ? "off" : "on"}.`)}>
                          {on ? "On" : "Off"} <span className="switch" aria-hidden="true"><i /></span>
                        </CommandButton>
                        {draft ? null : <button data-command="admin.riders.promoEdit" type="button" className="dash-btn small ghost" disabled={!canEdit} onClick={() => setEditing({ id: ticket.id, edit: { value: ticket.value, maxPerRide: ticket.maxPerRide, rides: ticket.rides } })}>Edit</button>}
                        <button data-command="admin.ui.quickAction" type="button" className="dash-btn small ghost" aria-pressed={previewId === ticket.id} onClick={() => setPreviewId(previewId === ticket.id ? null : ticket.id)}>{previewId === ticket.id ? "Hide app preview" : "See in rider app"}</button>
                        {on ? <button data-command="admin.riders.promoSend" type="button" className="dash-btn small" disabled={!canEdit} onClick={() => setSharingId(ticket.id)}><Send size={13} aria-hidden="true" /> Send and share</button> : null}
                      </div>
                    ) : null}
                    {draft ? (
                      <div className="rd-promo-edit" role="group" aria-label={`Change ${ticket.code}`}>
                        <label className="field">{ticket.kind === "percent" ? "Discount" : "Amount off"}<NumberField label={`${ticket.code} discount`} value={draft.value} unit={ticket.kind === "percent" ? "%" : symbol} max={ticket.kind === "percent" ? 100 : undefined} onChange={(value) => setEditing({ id: ticket.id, edit: { ...draft, value } })} /></label>
                        {ticket.kind === "percent" ? <label className="field">Max per ride<NumberField label={`${ticket.code} max per ride`} value={draft.maxPerRide} unit={symbol} onChange={(value) => setEditing({ id: ticket.id, edit: { ...draft, maxPerRide: value } })} /></label> : null}
                        <label className="field">Rides<NumberField label={`${ticket.code} rides`} value={draft.rides} unit="rides" max={100} onChange={(value) => setEditing({ id: ticket.id, edit: { ...draft, rides: Math.round(value) } })} /></label>
                        {edited?.error ? <p className="rd-form-error">{edited.error}</p> : null}
                        <div className="cat-actions">
                          <CommandButton command="admin.riders.promoEdit" className="dash-btn small" targetId={ticket.code} confirmTarget={false} scope="all" before={`${ticket.value} · max ${ticket.maxPerRide} · ${ticket.rides} rides`} after={`${draft.value} · max ${draft.maxPerRide} · ${draft.rides} rides`} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={edited?.care ?? care} disabled={!canEdit || !edited || Boolean(edited.error)} onDone={() => { setEditing(null); onNotice(`Promotion ${ticket.code} changed.`); }}>Save changes</CommandButton>
                          <button data-command="admin.confirm.cancel" type="button" className="dash-btn small ghost" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : null}
                    {previewId === ticket.id || draft ? <RiderAppPreview promo={draft ? { ...ticket, ...draft, maxPerRide: ticket.kind === "percent" ? draft.maxPerRide : draft.value } : ticket} prices={prices.rows} zoneName={prices.zoneName} off={ticket.status !== "active"} popup={ticket.popup} /> : null}
                  </div>
                  <div className="rd-promo-stats">
                    {ticket.audience === "code"
                      ? <div><span>Code can be used by</span><b>{ticket.maxUses ?? 0}</b><small>Anyone with the code</small></div>
                      : <div><span>Riders</span><b>{results.reached}</b><small>{ticket.group}</small></div>}
                    <div><span>Used by</span><b>{results.usedBy}</b><small>{results.reached ? Math.round((results.usedBy / results.reached) * 100) : 0}%</small></div>
                    <div><span>Rides with promo</span><b>{results.ridesUsed}</b><small>+{results.ridesGained} extra rides</small></div>
                    <div><span>Cost so far</span><b>{money(results.cost * market(country).minorUnits, country, true)}</b><small>{ticket.budget ? `of ${money(ticket.budget * market(country).minorUnits, country, true)}` : "no budget"}</small></div>
                    {spent !== null ? <span className="rd-budget" aria-label={`${Math.round(spent)}% of budget used`}><i style={{ width: `${spent}%` }} /></span> : null}
                    {ticket.sends?.length || ticket.popup ? (
                      <p className="rd-sent-line">
                        {ticket.popup ? <span className="rd-badge promo">Popup on</span> : null}
                        {ticket.sends?.length ? <span>Sent {ticket.sends.length} time{ticket.sends.length === 1 ? "" : "s"} · {ticket.sends.reduce((sum, item) => sum + item.riders + item.emails, 0)} people</span> : null}
                      </p>
                    ) : null}
                    <p className="fine">Created {date.format(Date.parse(ticket.createdAt))} by {ticket.createdBy}{ticket.editedBy ? ` · changed by ${ticket.editedBy}` : ""} · {ticket.status === "stopped" ? "Stopped" : ticket.status === "paused" ? "Off: riders cannot use it now" : `Ends ${date.format(Date.parse(ticket.validTo))}`}</p>
                    {ticket.status !== "stopped" ? (
                      <CommandButton command="admin.riders.promoStop" className="dash-btn small ghost" targetId={ticket.code} confirmTarget={false} scope="all" before="active" after="stopped" expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={stopPromotion(care, ticket.id)} disabled={!canEdit} onDone={() => onNotice(`Promotion ${ticket.code} stopped.`)}>Stop promotion</CommandButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </>}
      {sharing ? <PromoShare ticket={sharing} care={care} rows={rows} country={country} agentId={agentId} canEdit={canEdit} now={now} onClose={() => setSharingId(null)} onNotice={onNotice} /> : null}
    </div>
  );
}

/** Keyed on the saved settings, so the form shows them once they load or after a save. */
const PROMO_CATEGORIES = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet", "child_seat"];

const AUTO_STATE: Record<ReturnType<typeof autoState>, string> = { off: "Off", running: "Running now", waiting: "Starts later", ended: "Ended" };

function AutoPromosCard({ care, country, canEdit, onNotice, now }: { care: RiderCare; country: "SE" | "FR" | "TN"; canEdit: boolean; onNotice: (text: string) => void; now: number }) {
  const [auto, setAuto] = useState<AutoPromos>(care.autoPromos);
  const [preview, setPreview] = useState<keyof AutoPromos | null>(null);
  const saved = setAutoPromos(care, auto);
  const prices = useCategoryPrices(country);
  return (
        <section className="dash-card" aria-labelledby="auto-title">
          <div className="card-head">
            <h3 id="auto-title"><Sparkles size={16} aria-hidden="true" /> Automatic promotions</h3>
            <span className="fine-print">Given by the system when the moment comes</span>
          </div>
          <div className="rd-auto">
            {([["firstRide", "First ride", "New riders get a discount on their first ride"], ["birthday", "Birthday", "A gift on the rider's birthday"], ["winBack", "Come back", "Riders with no ride for a while"]] as const).map(([key, label, hint]) => (
              <div key={key} className={auto[key].on ? "rd-auto-card on" : "rd-auto-card"}>
                <div className="rd-auto-top">
                <label className="mini-switch big">
                  <input type="checkbox" aria-label={`${label} promotion on`} checked={auto[key].on} disabled={!canEdit} onChange={(event) => setAuto({ ...auto, [key]: { ...auto[key], on: event.target.checked } })} />
                  <span aria-hidden="true"><i /></span>
                  <b>{label}</b>
                </label>
                <span className={`rd-auto-state ${autoState(auto[key], now)}`}>{AUTO_STATE[autoState(auto[key], now)]}</span>
                </div>
                <small>{hint}</small>
                <div className="rd-form-grid">
                  <label className="field">Discount<NumberField label={`${label} discount`} value={auto[key].percent} unit="%" max={100} disabled={!canEdit} onChange={(value) => setAuto({ ...auto, [key]: { ...auto[key], percent: value } })} /></label>
                  <label className="field">Max per ride<NumberField label={`${label} max per ride`} value={auto[key].maxPerRide} unit={{ SE: "kr", FR: "€", TN: "DT" }[country]} disabled={!canEdit} onChange={(value) => setAuto({ ...auto, [key]: { ...auto[key], maxPerRide: value } })} /></label>
                  <label className="field">For how many rides<NumberField label={`${label} rides`} value={auto[key].rides} unit="rides" max={20} disabled={!canEdit} onChange={(value) => setAuto({ ...auto, [key]: { ...auto[key], rides: Math.max(1, Math.round(value)) } })} /></label>
                  {key === "winBack" ? <label className="field">After no ride for<NumberField label="Come back after days" value={auto.winBack.afterDays} unit="days" disabled={!canEdit} onChange={(value) => setAuto({ ...auto, winBack: { ...auto.winBack, afterDays: Math.round(value) } })} /></label> : null}
                  <label className="field">Who gets it
                    <select aria-label={`${label} audience`} value={auto[key].audience} disabled={!canEdit} onChange={(event) => setAuto({ ...auto, [key]: { ...auto[key], audience: event.target.value as AutoAudience } })}>
                      {AUTO_AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="rd-when">
                  <legend>When it runs <small>(empty = always)</small></legend>
                  <label className="field">Starts<input type="date" aria-label={`${label} starts`} value={auto[key].from} disabled={!canEdit} onChange={(event) => setAuto({ ...auto, [key]: { ...auto[key], from: event.target.value } })} /></label>
                  <label className="field">Ends<input type="date" aria-label={`${label} ends`} value={auto[key].to} disabled={!canEdit} onChange={(event) => setAuto({ ...auto, [key]: { ...auto[key], to: event.target.value } })} /></label>
                </fieldset>
                <fieldset className="rd-chips">
                  <legend>Categories <small>(none = all)</small></legend>
                  {PROMO_CATEGORIES.map((id) => (
                    <label key={id} className={auto[key].categories.includes(id) ? "check-chip on" : "check-chip"}>
                      <input type="checkbox" aria-label={`${label} ${categoryName(id)}`} disabled={!canEdit} checked={auto[key].categories.includes(id)} onChange={() => setAuto({ ...auto, [key]: { ...auto[key], categories: auto[key].categories.includes(id) ? auto[key].categories.filter((item) => item !== id) : [...auto[key].categories, id] } })} />{categoryName(id)}
                    </label>
                  ))}
                </fieldset>
                <button data-command="admin.ui.quickAction" type="button" className="dash-btn small ghost" aria-pressed={preview === key} onClick={() => setPreview(preview === key ? null : key)}>{preview === key ? "Hide app preview" : "See in rider app"}</button>
                {preview === key ? (
                  <RiderAppPreview promo={{ title: label, kind: "percent", value: auto[key].percent, rides: auto[key].rides, maxPerRide: auto[key].maxPerRide, minFare: 0, country, categories: auto[key].categories }} prices={prices.rows} zoneName={prices.zoneName} off={!auto[key].on} />
                ) : null}
              </div>
            ))}
          </div>
          {saved.error ? <p className="rd-form-error" role="alert">{saved.error}</p> : null}
          <CommandButton command="admin.riders.autoPromo" className="dash-btn" targetId="auto-promotions" confirmTarget={false} scope="all" before={JSON.stringify(care.autoPromos)} after={JSON.stringify(auto)} expectedSliceRev={care.draftRev} sliceKey={CARE_KEY} value={saved.care} disabled={!canEdit || Boolean(saved.error) || JSON.stringify(auto) === JSON.stringify(care.autoPromos)} title={saved.error} onDone={() => onNotice("Automatic promotions saved.")}>
            Save automatic promotions
          </CommandButton>
        </section>
  );
}

function InsightsView({ rows, now, locale, country, onSegment }: { rows: RiderRow[]; now: number; locale: string; country: "SE" | "FR" | "TN"; onSegment: (seg: SegmentId) => void }) {
  const facts = useMemo(() => insights(rows, now), [rows, now]);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const peak = Math.max(1, ...facts.signups.map((item) => item.count));
  const maxZone = Math.max(1, ...facts.topZones.map((item) => item.rides));
  const newThisWeek = facts.signups.slice(-7).reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="rd-insights">
      <section className="fd-cards" aria-label="Rider insights">
        <article className="fd-card tone-violet"><span className="fd-card-icon" aria-hidden="true"><Sparkles size={18} /></span><span className="fd-card-label">New riders this week</span><strong>{newThisWeek}</strong><small className="fd-card-hint">{facts.signups.slice(-1)[0]?.count ?? 0} today</small></article>
        <article className="fd-card tone-green"><span className="fd-card-icon" aria-hidden="true"><TrendingUp size={18} /></span><span className="fd-card-label">First ride within 7 days</span><strong>{facts.firstRideIn7}%</strong><small className="fd-card-hint">of riders who joined lately</small></article>
        <article className="fd-card tone-blue"><span className="fd-card-icon" aria-hidden="true"><Heart size={18} /></span><span className="fd-card-label">Came back for a 2nd ride</span><strong>{facts.retention}%</strong><small className="fd-card-hint">retention</small></article>
        <article className="fd-card tone-red"><span className="fd-card-icon" aria-hidden="true"><Moon size={18} /></span><span className="fd-card-label">Stopped riding this month</span><strong>{facts.churned}</strong><small className="fd-card-hint"><button data-command="admin.table.filter" type="button" className="link-action" onClick={() => onSegment("inactive")}>See inactive riders</button></small></article>
      </section>
      <div className="surge-two">
        <section className="dash-card" aria-labelledby="signups-title">
          <div className="card-head"><h3 id="signups-title"><Users size={16} aria-hidden="true" /> New riders per day</h3><span className="fine-print">Last 14 days</span></div>
          <div className="rd-bars" role="img" aria-label={`New riders per day: ${facts.signups.map((item) => item.count).join(", ")}`}>
            {facts.signups.map((item) => (
              <span key={item.day} className="rd-bar"><i style={{ height: `${(item.count / peak) * 100}%` }} /><b>{item.count}</b><small>{day.format(item.day)}</small></span>
            ))}
          </div>
        </section>
        <section className="dash-card" aria-labelledby="zones-title">
          <div className="card-head"><h3 id="zones-title"><BarChart3 size={16} aria-hidden="true" /> Where riders book most</h3><span className="fine-print">Last 30 days</span></div>
          <ul className="rd-zone-bars">
            {facts.topZones.map((item) => (
              <li key={item.zoneId}><span>{zoneById(item.zoneId)?.name ?? item.zoneId}</span><i style={{ width: `${(item.rides / maxZone) * 100}%` }} /><b>{item.rides}</b></li>
            ))}
          </ul>
        </section>
      </div>
      <p className="fine">Spend in the last 30 days: {money(rows.reduce((sum, row) => sum + row.bookings.filter((booking) => booking.status === "completed" && booking.at > now - 30 * 86_400_000).reduce((acc, booking) => acc + booking.fareMinor, 0), 0), country)}</p>
    </div>
  );
}
