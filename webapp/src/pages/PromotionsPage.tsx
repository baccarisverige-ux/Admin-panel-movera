import { useDirtyWarning } from "../ui/useDirtyWarning";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Gift, Plus, Share2, Ticket, Wallet } from "lucide-react";
import { useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { can } from "../auth/permissions";
import { Card, Num, Row, Switch } from "../dispatch/fields";
import { BONUS_KEY, emptyBonusBook, normalizeBonusBook, type BonusBook } from "../drivers/bonus";
import { PROMO_OPS_KEY, emptyPromoOps, normalizePromoOps, referralError, results, returnPer, saveVoucher, statusWithBudget, voucherError, type HubItem, type HubKind, type PromoOps, type Referral, type Voucher } from "../growth/hub";
import { useMarketScope } from "../markets/useMarketScope";
import { Cards } from "../reports/ui";
import { CARE_KEY, emptyRiderCare, normalizeCare, type RiderCare } from "../riders/care";
import { CommandButton } from "../ui/CommandButton";
import { GrowthPage } from "./GrowthPage";

/** Average fare per country, major units, for demo results until rides are counted per promotion. */
const AVG_FARE = { SE: 250, FR: 22, TN: 15 } as const;
const KINDS: { id: HubKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rider", label: "Rider promotions" },
  { id: "driver", label: "Driver bonuses" },
  { id: "voucher", label: "Voucher codes" },
  { id: "referral", label: "Invite a friend" },
];
const STATE_LABEL: Record<HubItem["status"], string> = { active: "Active", paused: "Paused", ended: "Ended", stopped: "Stopped", budget: "Budget used up" };

type Tab = "all" | "vouchers" | "referral" | "rules";

export function PromotionsPage() {
  const { agent } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (["vouchers", "referral", "rules"].includes(params.get("tab") ?? "") ? params.get("tab") : "all") as Tab;
  const scope = useMarketScope();
  const country = scope.market.id;
  const care = normalizeCare(useSlice<RiderCare>(CARE_KEY, emptyRiderCare()).value);
  const bonuses = normalizeBonusBook(useSlice<BonusBook>(BONUS_KEY, emptyBonusBook()).value);
  const slice = useSlice<PromoOps>(PROMO_OPS_KEY, emptyPromoOps());
  const ops = normalizePromoOps(slice.value);
  const [kind, setKind] = useState<HubKind | "all">("all");
  const [notice, setNotice] = useState("");
  const editable = Boolean(agent && can(agent.role, "settings.publish"));
  const money = useMemo(() => new Intl.NumberFormat(scope.market.locale, { style: "currency", currency: scope.market.currency, maximumFractionDigits: 0 }), [scope.market]);
  const selectTab = (id: Tab) => setParams(() => {
    const next = new URLSearchParams(globalThis.location.search);
    if (id === "all") next.delete("tab");
    else next.set("tab", id);
    return next;
  }, { replace: true });

  const items = useMemo<HubItem[]>(() => {
    const fare = AVG_FARE[country];
    const make = (base: Omit<HubItem, "cost" | "rides" | "newRiders" | "revenue">): HubItem => {
      const result = results(base.id, base.budget, fare);
      return { ...base, ...result, status: statusWithBudget(base.status, result.cost, base.budget, ops.autoStop) };
    };
    const referral = ops.referral[country];
    return [
      ...care.promotions.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "rider", title: item.title, code: item.code, status: item.status, budget: item.budget, link: `/riders?view=promotions&country=${country}`, madeIn: "Riders" })),
      ...bonuses.bonuses.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "driver", title: item.name, status: item.status, budget: item.budget, link: `/drivers?view=bonuses&country=${country}`, madeIn: "Drivers" })),
      ...ops.vouchers.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "voucher", title: item.title, code: item.code, status: item.on ? (item.to && item.to < new Date().toISOString().slice(0, 10) ? "ended" : "active") : "paused", budget: item.budget, link: `/promotions?tab=vouchers&country=${country}`, madeIn: "Promotions" })),
      make({ id: `REF-${country}`, kind: "referral", title: "Invite a friend", status: referral.on ? "active" : "paused", budget: referral.budget, link: `/promotions?tab=referral&country=${country}`, madeIn: "Promotions" }),
    ];
  }, [care.promotions, bonuses.bonuses, ops, country]);

  const shown = items.filter((item) => kind === "all" || item.kind === kind);
  const live = items.filter((item) => item.status === "active");
  const spent = items.reduce((sum, item) => sum + item.cost, 0);
  const revenue = items.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="dx-page gr-page">
      <header className="dx-head">
        <button data-command="admin.promo.view" type="button" className="dash-btn ghost dx-back" onClick={() => (globalThis.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <div className="dx-head-text">
          <h2>Promotions</h2>
          <p>Every rider promotion, driver bonus, voucher code and invite reward in {scope.market.name}, with budget and results. Results are demo numbers until rides are counted per promotion.</p>
        </div>
      </header>
      <div className="dash-tabs dx-views" role="tablist" aria-label="Promotion sections">
        {([["all", "All promotions"], ["vouchers", "Voucher codes"], ["referral", "Invite a friend"], ["rules", "Growth rules"]] as const).map(([id, label]) => <button data-command="admin.promo.view" key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : undefined} onClick={() => selectTab(id)}>{label}</button>)}
      </div>
      <p role="status" className="gr-status">{notice}</p>

      {tab === "vouchers" ? <Vouchers ops={ops} country={country} editable={editable} agentId={agent?.id ?? ""} money={money} onNotice={setNotice} /> : tab === "referral" ? <ReferralView ops={ops} country={country} editable={editable} currency={scope.market.currency} onNotice={setNotice} /> : tab === "rules" ? <GrowthPage part="rules" /> : (
        <>
          <Cards
            compare={false}
            compareLabel=""
            fmt={(value, format) => (format === "money" ? money.format(value) : String(value))}
            cards={[
              { id: "live", label: "Active", value: live.length, previous: null, format: "count", info: "Promotions running now in this country." },
              { id: "budget", label: "Budget", value: items.reduce((sum, item) => sum + (item.budget ?? 0), 0), previous: null, format: "money", info: "The total budget of every promotion with one." },
              { id: "spent", label: "Spent", value: spent, previous: null, format: "money", info: "Discounts and rewards given so far." },
              { id: "rides", label: "Rides", value: items.reduce((sum, item) => sum + item.rides, 0), previous: null, format: "count", info: "Rides where a promotion was used." },
              { id: "new", label: "New riders", value: items.reduce((sum, item) => sum + item.newRiders, 0), previous: null, format: "count", info: "People whose first ride used a promotion." },
              { id: "return", label: "Back per 1 spent", value: spent ? Math.round((revenue / spent) * 10) / 10 : 0, previous: null, format: "count", info: "What the rides brought in for each 1 spent on promotions." },
            ]}
          />
          <Card title="Stop at budget" icon={<Wallet size={15} />} tone="orange" help="When a promotion has spent its whole budget it stops by itself, so it never costs more than planned." aside={<CommandButton command="admin.promo.autoStop" confirmTarget={false} className="dash-btn small ghost" sliceKey={PROMO_OPS_KEY} value={{ ...ops, draftRev: ops.draftRev + 1, autoStop: !ops.autoStop }} expectedSliceRev={ops.draftRev} targetId={country} disabled={!editable || slice.loading} onDone={() => setNotice(ops.autoStop ? "Promotions no longer stop at their budget." : "Promotions now stop at their budget.")}>{ops.autoStop ? "Turn off" : "Turn on"}</CommandButton>}>
            <p className="gr-help">{ops.autoStop ? "On: promotions stop when the budget is used up." : "Off: promotions keep running past their budget."}</p>
          </Card>
          <div className="gr-chips" role="group" aria-label="Promotion kind">
            {KINDS.map((item) => <button data-command="admin.promo.view" key={item.id} type="button" aria-pressed={kind === item.id} className={kind === item.id ? "gr-chip on" : "gr-chip"} onClick={() => setKind(item.id)}>{item.label} <small>{item.id === "all" ? items.length : items.filter((row) => row.kind === item.id).length}</small></button>)}
          </div>
          <ul className="gr-hub" aria-label="Promotions">
            {shown.map((item) => {
              const used = item.budget ? Math.min(100, Math.round((item.cost / item.budget) * 100)) : 0;
              return (
                <li key={item.id} className={`gr-hub-row ${item.kind}`}>
                  <span className="gr-hub-icon" aria-hidden="true">{item.kind === "rider" ? <Gift size={15} /> : item.kind === "driver" ? <Wallet size={15} /> : item.kind === "voucher" ? <Ticket size={15} /> : <Share2 size={15} />}</span>
                  <span className="gr-hub-title"><b>{item.title}</b><small>{KINDS.find((row) => row.id === item.kind)?.label}{item.code ? ` · ${item.code}` : ""} · made in {item.madeIn}</small></span>
                  <span className={`gr-state ${item.status}`}>{STATE_LABEL[item.status]}</span>
                  <span className="gr-budget" title={item.budget ? `${used}% of the budget used` : "No budget limit"}>
                    <span className="gr-budget-bar"><span style={{ width: `${used}%` }} /></span>
                    <small>{money.format(item.cost)} of {item.budget ? money.format(item.budget) : "no limit"}</small>
                  </span>
                  <span className="gr-hub-numbers">{item.rides} rides · {item.newRiders} new · {returnPer(item)}× back</span>
                  <Link className="dash-btn small ghost" to={item.link}>Open</Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function blankVoucher(country: PromoOps["vouchers"][number]["country"], by: string): Voucher {
  const today = new Date().toISOString().slice(0, 10);
  return { id: `V-${crypto.randomUUID().slice(0, 8)}`, code: "", title: "", kind: "percent", value: 10, budget: 5000, perPerson: 1, maxUses: 200, from: today, to: "", on: true, country, createdBy: by, createdAt: new Date().toISOString() };
}

function Vouchers({ ops, country, editable, agentId, money, onNotice }: { ops: PromoOps; country: Voucher["country"]; editable: boolean; agentId: string; money: Intl.NumberFormat; onNotice: (text: string) => void }) {
  const [draft, setDraft] = useState<Voucher | null>(null);
  useDirtyWarning(Boolean(draft));
  const list = ops.vouchers.filter((item) => item.country === country);
  const error = draft ? voucherError(draft, ops.vouchers) : null;
  const patch = (value: Partial<Voucher>) => draft && setDraft({ ...draft, ...value });
  return (
    <div className="gr-two">
      <Card title="Voucher codes" icon={<Ticket size={15} />} tone="pink" help="A code riders type in the app for a discount." aside={<button data-command="admin.promo.view" type="button" className="dash-btn small" disabled={!editable} onClick={() => setDraft(blankVoucher(country, agentId))}><Plus size={13} aria-hidden="true" /> New voucher</button>}>
        {list.length ? (
          <ul className="gr-list" aria-label="Voucher codes">
            {list.map((item) => {
              const result = results(item.id, item.budget, AVG_FARE[country]);
              return (
                <li key={item.id}>
                  <button data-command="admin.promo.view" type="button" onClick={() => setDraft(item)}>
                    <b className="gr-code">{item.code}</b>
                    <span>{item.title} · {item.kind === "percent" ? `${item.value}% off` : `${money.format(item.value)} off`}</span>
                    <small>{item.on ? "On" : "Off"} · {money.format(result.cost)} of {money.format(item.budget)} · {item.from}{item.to ? ` to ${item.to}` : ""}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="dx-calm">No voucher codes in this country yet.</p>}
      </Card>
      {draft ? (
        <Card title={ops.vouchers.some((item) => item.id === draft.id) ? `Edit ${draft.code || "voucher"}` : "New voucher"} icon={<Ticket size={15} />} tone="purple">
          <Row label="Voucher on" help="Off: the code stops working in the app."><Switch label="Voucher" on={draft.on} disabled={!editable} onChange={(on) => patch({ on })} /></Row>
          <label className="gr-field"><span>Code</span><input aria-label="Voucher code" value={draft.code} disabled={!editable} onChange={(e) => patch({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} /></label>
          <label className="gr-field"><span>Title</span><input aria-label="Voucher title" value={draft.title} disabled={!editable} onChange={(e) => patch({ title: e.target.value })} /></label>
          <Row label="Discount">
            <span className="gr-inline">
              <select aria-label="Discount kind" value={draft.kind} disabled={!editable} onChange={(e) => patch({ kind: e.target.value as Voucher["kind"] })}><option value="percent">Percent</option><option value="amount">Amount</option></select>
              <Num label="Discount" value={draft.value} unit={draft.kind === "percent" ? "%" : ""} min={1} max={draft.kind === "percent" ? 100 : undefined} disabled={!editable} onChange={(value) => patch({ value })} />
            </span>
          </Row>
          <Row label="Budget"><Num label="Budget" value={draft.budget} min={1} disabled={!editable} onChange={(budget) => patch({ budget })} /></Row>
          <Row label="Uses per person"><Num label="Uses per person" value={draft.perPerson} min={1} disabled={!editable} onChange={(perPerson) => patch({ perPerson })} /></Row>
          <Row label="Uses in total"><Num label="Uses in total" value={draft.maxUses} min={1} disabled={!editable} onChange={(maxUses) => patch({ maxUses })} /></Row>
          <Row label="Dates">
            <span className="gr-inline">
              <input type="date" aria-label="Starts" value={draft.from} disabled={!editable} onChange={(e) => patch({ from: e.target.value })} />
              <input type="date" aria-label="Ends" value={draft.to} disabled={!editable} onChange={(e) => patch({ to: e.target.value })} />
            </span>
          </Row>
          {error ? <p role="alert" className="gr-warn">{error}</p> : null}
          <div className="actions">
            <CommandButton command="admin.promo.voucher" confirmTarget={false} className="dash-btn small" sliceKey={PROMO_OPS_KEY} value={saveVoucher(ops, draft).ops} expectedSliceRev={ops.draftRev} targetId={draft.id} disabled={!editable || Boolean(error)} onDone={() => { onNotice(`Voucher ${draft.code} saved.`); setDraft(null); }}>Save voucher</CommandButton>
            <button data-command="admin.promo.view" type="button" className="dash-btn small ghost" onClick={() => setDraft(null)}>Close</button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ReferralView({ ops, country, editable, currency, onNotice }: { ops: PromoOps; country: Voucher["country"]; editable: boolean; currency: string; onNotice: (text: string) => void }) {
  const [draft, setDraft] = useState<Referral | null>(null);
  useDirtyWarning(Boolean(draft));
  const value = draft ?? ops.referral[country];
  const error = referralError(value);
  const patch = (next: Partial<Referral>) => setDraft({ ...value, ...next });
  return (
    <Card title="Invite a friend" icon={<Share2 size={15} />} tone="green" help="A rider shares a link. When the friend has ridden, both get a reward." off={!value.on}>
      <Row label="Invite a friend on"><Switch label="Invite a friend" on={value.on} disabled={!editable} onChange={(on) => patch({ on })} /></Row>
      <Row label="The one who invites gets"><Num label="Inviter reward" value={value.inviterReward} unit={currency} disabled={!editable} onChange={(inviterReward) => patch({ inviterReward })} /></Row>
      <Row label="The friend gets"><Num label="Friend reward" value={value.friendReward} unit={currency} disabled={!editable} onChange={(friendReward) => patch({ friendReward })} /></Row>
      <Row label="Rides before the reward" help="The friend must finish this many rides first."><Num label="Rides before the reward" value={value.afterRides} min={1} disabled={!editable} onChange={(afterRides) => patch({ afterRides })} /></Row>
      <Row label="Friends per person" help="The most friends one rider can be rewarded for."><Num label="Friends per person" value={value.perPerson} min={1} disabled={!editable} onChange={(perPerson) => patch({ perPerson })} /></Row>
      <Row label="Budget"><Num label="Referral budget" value={value.budget} unit={currency} min={1} disabled={!editable} onChange={(budget) => patch({ budget })} /></Row>
      {error ? <p role="alert" className="gr-warn">{error}</p> : null}
      <div className="actions">
        <CommandButton command="admin.promo.referral" confirmTarget={false} className="dash-btn small" sliceKey={PROMO_OPS_KEY} value={{ ...ops, draftRev: ops.draftRev + 1, referral: { ...ops.referral, [country]: value } }} expectedSliceRev={ops.draftRev} targetId={country} disabled={!editable || !draft || Boolean(error)} onDone={() => { setDraft(null); onNotice("Invite rewards saved."); }}>Save invite rewards</CommandButton>
        {draft ? <button data-command="admin.promo.view" type="button" className="dash-btn small ghost" onClick={() => setDraft(null)}>Undo changes</button> : null}
      </div>
    </Card>
  );
}
