import { useDirtyWarning } from "../ui/useDirtyWarning";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, BellRing, Bot, Megaphone, MoonStar, Plus, Send, Smartphone } from "lucide-react";
import { emptyCampaigns, newCampaign, changeCampaign, campaignAudience, useRecords, useSlice, type Campaign, type CampaignBook } from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { Card, Choice, Num, Row } from "../dispatch/fields";
import { COUNTRY_LANGS, GROUPS, LANG_LABEL, MSG_OPS_KEY, TRIGGERS, autoError, campaignResults, emptyMessageOps, normalizeMessageOps, rulesError, type AutoMessage, type MessageOps, type SendRules, type Extra } from "../messages/extra";
import { useMarketScope } from "../markets/useMarketScope";
import { DriverNoticesView } from "../messages/DriverNotices";
import { Cards } from "../reports/ui";
import { CommandButton } from "../ui/CommandButton";

type Tab = "campaigns" | "auto" | "rules" | "drivers";

export function MessagesPage() {
  const { agent } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (["campaigns", "auto", "rules", "drivers"].includes(params.get("tab") ?? "") ? params.get("tab") : "campaigns") as Tab;
  const scope = useMarketScope();
  const store = useSlice<CampaignBook>("campaignOps", emptyCampaigns());
  const extraSlice = useSlice<MessageOps>(MSG_OPS_KEY, emptyMessageOps());
  const extra = normalizeMessageOps(extraSlice.value);
  const zones = useRecords("zones");
  const riders = useRecords("riders");
  const drivers = useRecords("drivers");
  const [selected, select] = useState("");
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [notice, setNotice] = useState("");
  const [extraDrafts, setExtraDrafts] = useState<Record<string, Extra>>({});
  const saved = store.value.campaigns.find((c) => c.id === selected);
  const c = draft ?? saved;
  const rows = c?.app === "driver" ? drivers.data : riders.data;
  const editable = Boolean(agent && can(agent.role, "settings.edit"));
  const langs = COUNTRY_LANGS[scope.market.id];
  function patch(value: Partial<Campaign>) {
    if (c) setDraft({ ...c, ...value });
  }
  useDirtyWarning(Boolean(draft));
  const selectTab = (id: Tab) => setParams(() => {
    const next = new URLSearchParams(globalThis.location.search);
    if (id === "campaigns") next.delete("tab");
    else next.set("tab", id);
    return next;
  }, { replace: true });
  const results = store.value.campaigns.map((item) => ({ item, result: campaignResults(item.id, item.tested.length, item.status) }));
  const live = store.value.campaigns.filter((item) => item.status === "published" || item.status === "scheduled");
  const campaignExtra = c ? extraDrafts[c.id] ?? extra.extra[c.id] ?? { group: c.app === "driver" ? "all-drivers" : "all", texts: {} } : null;

  return (
    <div className="dx-page gr-page">
      <header className="dx-head">
        <button data-command="admin.campaigns.view" type="button" className="dash-btn ghost dx-back" onClick={() => (globalThis.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <div className="dx-head-text">
          <h2>Messages</h2>
          <p>Campaigns persist with versioned history. Test results are simulation audience counts; no external notification is sent.</p>
        </div>
      </header>
      <div className="dash-tabs dx-views" role="tablist" aria-label="Message sections">
        {([["campaigns", "Campaigns"], ["auto", "Automatic messages"], ["rules", "Limits and quiet hours"], ["drivers", "Driver notifications"]] as const).map(([id, label]) => <button data-command="admin.campaigns.view" key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : undefined} onClick={() => selectTab(id)}>{label}</button>)}
      </div>
      <p role="status" className="gr-status">{notice}</p>

      {tab === "drivers" ? <DriverNoticesView key={scope.market.id} country={scope.market.id} editable={Boolean(agent && can(agent.role, "settings.publish"))} onNotice={setNotice} /> : tab === "auto" ? <AutoMessages ops={extra} country={scope.market.id} editable={Boolean(agent && can(agent.role, "settings.publish"))} onNotice={setNotice} /> : tab === "rules" ? <SendRulesView ops={extra} country={scope.market.id} editable={Boolean(agent && can(agent.role, "settings.publish"))} /> : (
        <>
          <Cards
            compare={false}
            compareLabel=""
            fmt={(value, format) => (format === "pct" ? `${value}%` : String(value))}
            cards={[
              { id: "all", label: "Campaigns", value: store.value.campaigns.length, previous: null, format: "count", info: "Every campaign, drafts included." },
              { id: "live", label: "Live or planned", value: live.length, previous: null, format: "count", info: "Published, or scheduled to go out." },
              { id: "sent", label: "Sent", value: results.reduce((sum, row) => sum + row.result.sent, 0), previous: null, format: "count", info: "Messages delivered. Demo numbers until the providers report." },
              { id: "open", label: "Opened", value: results.length ? Math.round(results.reduce((sum, row) => sum + row.result.openPct, 0) / Math.max(results.filter((row) => row.result.sent).length, 1)) : 0, previous: null, format: "pct", info: "Average share of people who opened the message." },
              { id: "rides", label: "Rides after", value: results.reduce((sum, row) => sum + row.result.rides, 0), previous: null, format: "count", info: "Rides booked within 7 days by people who opened a message." },
            ]}
          />
          {results.length ? (
            <ul className="gr-campaigns" aria-label="Campaign results">
              {results.map(({ item, result }) => (
                <li key={item.id} className={item.status}>
                  <button data-command="admin.campaigns.view" type="button" onClick={() => { select(item.id); setDraft(null); }}>
                    <span className="gr-camp-icon" aria-hidden="true">{item.channel === "push" ? <BellRing size={15} /> : item.channel === "sms" ? <Send size={15} /> : <Megaphone size={15} />}</span>
                    <span className="gr-camp-text"><b>{item.en || item.sv || "Untitled"}</b><small>{item.app === "driver" ? "Drivers" : "Riders"} · {item.channel} · {GROUPS.find((group) => group.id === extra.extra[item.id]?.group)?.label ?? "Everyone in the zone"}</small></span>
                    <span className={`gr-state ${item.status}`}>{item.status}</span>
                    <span className="gr-camp-numbers">{result.sent ? `${result.sent} sent · ${result.openPct}% opened · ${result.rides} rides` : "Not sent yet"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <section className="gr-editor" aria-label="Campaign editor">
            <div className="gr-editor-head">
              <button data-command="admin.message.useText" className="dash-btn small" disabled={!editable || !zones.data?.length || store.loading} onClick={() => { const id = crypto.randomUUID(); select(id); setDraft(newCampaign(id, zones.data![0].id)); }}><Plus size={13} aria-hidden="true" /> New campaign</button>
              <label className="gr-field"><span>Campaign</span><select aria-label="Campaign" value={saved?.id ?? ""} onChange={(e) => { select(e.target.value); setDraft(null); }}><option value="">Choose campaign</option>{store.value.campaigns.map((x) => <option key={x.id} value={x.id}>{x.channel} · {x.id.slice(0, 8)} · {x.status}</option>)}</select></label>
            </div>
            {c && campaignExtra ? (
              <div className="gr-editor-grid">
                <article className="panel gr-panel">
                  <h3>{c.id} · {c.status} · version {c.version}</h3>
                  <fieldset disabled={!editable || c.status !== "draft" || store.loading}>
                    <div className="field-grid">
                      <label>Audience app<select value={c.app} onChange={(e) => patch({ app: e.target.value as Campaign["app"] })}><option value="rider">Rider</option><option value="driver">Driver</option></select></label>
                      <label>Campaign zone<select value={c.zone} onChange={(e) => patch({ zone: e.target.value })}>{zones.data?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
                      <label>Channel<select value={c.channel} onChange={(e) => patch({ channel: e.target.value as Campaign["channel"] })}>{["push", "banner", "sms", "island"].map((x) => <option key={x}>{x}</option>)}</select></label>
                      <label>Category<select value={c.category} onChange={(e) => patch({ category: e.target.value })}>{["all", "economy", "comfort", "premium", "priority", "xl", "electric", "pet"].map((x) => <option key={x}>{x}</option>)}</select></label>
                      <label>Swedish text<textarea value={c.sv} onChange={(e) => patch({ sv: e.target.value })} /></label>
                      <label>English text<textarea value={c.en} onChange={(e) => patch({ en: e.target.value })} /></label>
                      <label>Deep link<input value={c.link} onChange={(e) => patch({ link: e.target.value })} /></label>
                      <label>Publish at<input type="datetime-local" value={c.startAt} onChange={(e) => patch({ startAt: e.target.value })} /></label>
                      <label>Expire at<input type="datetime-local" value={c.expireAt} onChange={(e) => patch({ expireAt: e.target.value })} /></label>
                    </div>
                  </fieldset>
                  <div className="gr-extra">
                    <label className="gr-field"><span>Who gets it</span>
                      <select aria-label="Audience group" value={campaignExtra.group} disabled={!editable} onChange={(e) => setExtra({ ...campaignExtra, group: e.target.value })}>
                        {GROUPS.filter((group) => group.app === c.app).map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                      </select>
                    </label>
                    {langs.filter((lang) => lang !== "sv" && lang !== "en").map((lang) => (
                      <label key={lang} className="gr-field"><span>{LANG_LABEL[lang]} text</span><textarea aria-label={`${LANG_LABEL[lang]} text`} dir={lang === "ar" ? "rtl" : undefined} value={campaignExtra.texts[lang] ?? ""} disabled={!editable} onChange={(e) => setExtra({ ...campaignExtra, texts: { ...campaignExtra.texts, [lang]: e.target.value } })} /></label>
                    ))}
                    <CommandButton command="admin.campaigns.extra" className="dash-btn small ghost" sliceKey={MSG_OPS_KEY} value={{ ...extra, draftRev: extra.draftRev + 1, extra: { ...extra.extra, [c.id]: campaignExtra } }} expectedSliceRev={extra.draftRev} targetId={c.id} confirmTarget={false} disabled={!editable} onDone={() => { setExtraDrafts((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== c.id))); setNotice("Audience and languages saved."); }}>Save audience and languages</CommandButton>
                    <p className="gr-help"><MoonStar size={12} aria-hidden="true" /> {extra.rules[scope.market.id].quiet.on ? `Nothing is sent between ${extra.rules[scope.market.id].quiet.from} and ${extra.rules[scope.market.id].quiet.to}.` : "No quiet hours."} {extra.rules[scope.market.id].weeklyCap.on ? `One person gets at most ${extra.rules[scope.market.id].weeklyCap.max} messages a week.` : ""}</p>
                  </div>
                  <p>Audience preview: {campaignAudience(c, rows ?? []).length} · Last tested: {c.tested.length}</p>
                  <div className="actions">{(["save", "test", "publish", "cancel", "refresh"] as const).map((action) => { const result = changeCampaign(store.value, c, action, agent?.id ?? "", rows ?? []); return <CommandButton key={action} command={`admin.campaign.${action}`} className={action === "publish" ? "dash-btn small" : "dash-btn small ghost"} targetId={c.id} scope={c.zone} sliceKey="campaignOps" value={result.book} expectedSliceRev={store.value.draftRev} confirmTarget={false} disabled={store.loading || Boolean(result.error) || Boolean(draft && action !== "save")} title={result.error ?? (draft && action !== "save" ? "Save changes first." : undefined)} onDone={() => { setDraft(null); setNotice(`${action} recorded in simulation.`); }}>{action === "save" ? "Save campaign" : action === "test" ? "Test send" : action === "publish" ? "Publish campaign" : action === "cancel" ? "Cancel campaign" : "Evaluate schedule"}</CommandButton>; })}</div>
                  <ol className="gr-events">{c.events.map((e, i) => <li key={i}>{e.at} · {e.actor} · {e.action}</li>)}</ol>
                </article>
                <aside className="gr-phone" aria-label="Phone preview">
                  <h3><Smartphone size={15} aria-hidden="true" /> Phone preview</h3>
                  <div className={`gr-phone-frame ${c.channel}`}>
                    <span className="gr-phone-bar" />
                    <div className="gr-phone-card"><b>Movera</b><p>{c.sv}</p><p>{c.en}</p>{langs.filter((lang) => lang !== "sv" && lang !== "en").map((lang) => campaignExtra.texts[lang] ? <p key={lang} dir={lang === "ar" ? "rtl" : undefined}>{campaignExtra.texts[lang]}</p> : null)}</div>
                  </div>
                </aside>
              </div>
            ) : <p className="dx-calm">Create or select a campaign.</p>}
          </section>
        </>
      )}
    </div>
  );

  function setExtra(next: Extra) {
    if (c) setExtraDrafts((all) => ({ ...all, [c.id]: next }));
  }
}

function AutoMessages({ ops, country, editable, onNotice }: { ops: MessageOps; country: "SE" | "FR" | "TN"; editable: boolean; onNotice: (text: string) => void }) {
  const [draft, setDraft] = useState<AutoMessage | null>(null);
  const list = ops.autos.filter((item) => item.country === country);
  const save = (item: AutoMessage) => ({ ...ops, draftRev: ops.draftRev + 1, autos: ops.autos.some((row) => row.id === item.id) ? ops.autos.map((row) => (row.id === item.id ? item : row)) : [...ops.autos, item] });
  const error = draft ? autoError(draft) : null;
  return (
    <div className="gr-tab">
      <p className="dx-note"><Bot size={13} aria-hidden="true" /> Automatic messages go out by themselves when something happens. They follow the weekly limit and quiet hours.</p>
      <ul className="gr-autos" aria-label="Automatic messages">
        {list.map((item) => (
          <li key={item.id} className={item.on ? "on" : "off"}>
            <span><b>{item.name}</b><small>{TRIGGERS.find((trigger) => trigger.id === item.trigger)?.label}{TRIGGERS.find((trigger) => trigger.id === item.trigger)?.days ? ` · ${item.days} days` : ""} · {item.channel} · {item.app === "driver" ? "Drivers" : "Riders"}</small><em>{item.text}</em></span>
            <CommandButton command="admin.campaigns.auto" className="dash-btn small ghost" sliceKey={MSG_OPS_KEY} value={save({ ...item, on: !item.on })} expectedSliceRev={ops.draftRev} targetId={item.id} confirmTarget={false} before={item.on ? "on" : "off"} after={item.on ? "off" : "on"} disabled={!editable} onDone={() => onNotice(`${item.name} turned ${item.on ? "off" : "on"}.`)}>{item.on ? "Turn off" : "Turn on"}</CommandButton>
            <button data-command="admin.campaigns.view" type="button" className="dash-btn small ghost" disabled={!editable} onClick={() => setDraft(item)}>Change</button>
          </li>
        ))}
      </ul>
      <button data-command="admin.campaigns.view" type="button" className="dash-btn small" disabled={!editable} onClick={() => setDraft({ id: `A-${ops.autos.length + 1}-${Date.now() % 10_000}`, name: "", trigger: "inactive", app: "rider", days: 30, channel: "push", text: "", on: true, country })}><Plus size={13} aria-hidden="true" /> New automatic message</button>
      {draft ? (
        <section className="gr-editor gr-auto-edit" aria-label="Automatic message">
          <label className="gr-field"><span>Name</span><input aria-label="Automatic message name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="gr-field"><span>When</span><select aria-label="When it is sent" value={draft.trigger} onChange={(e) => { const trigger = TRIGGERS.find((item) => item.id === e.target.value)!; setDraft({ ...draft, trigger: trigger.id, app: trigger.app }); }}>{TRIGGERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          {TRIGGERS.find((item) => item.id === draft.trigger)?.days ? <label className="gr-field"><span>Days</span><input aria-label="Days" type="number" value={draft.days} onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })} /></label> : null}
          <label className="gr-field"><span>Channel</span><select aria-label="Automatic channel" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as AutoMessage["channel"] })}><option value="push">Push</option><option value="sms">SMS</option></select></label>
          <label className="gr-field wide"><span>Message</span><textarea aria-label="Automatic message text" rows={2} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} /></label>
          {error ? <p className="dx-warn">{error}</p> : null}
          <div className="actions">
            <button data-command="admin.campaigns.view" type="button" className="dash-btn small ghost" onClick={() => setDraft(null)}>Cancel</button>
            <CommandButton command="admin.campaigns.auto" className="dash-btn small" sliceKey={MSG_OPS_KEY} value={save(draft)} expectedSliceRev={ops.draftRev} targetId={draft.id} confirmTarget={false} before="" after={draft.name} disabled={Boolean(error)} onDone={() => { onNotice(`${draft.name} saved.`); setDraft(null); }}>Save automatic message</CommandButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SendRulesView({ ops, country, editable }: { ops: MessageOps; country: "SE" | "FR" | "TN"; editable: boolean }) {
  const [draft, setDraft] = useState<SendRules | null>(null);
  const saved = ops.rules[country];
  const current = draft ?? saved;
  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(saved);
  const error = rulesError(current);
  return (
    <div className="gr-settings">
      <fieldset className="gr-fieldset" disabled={!editable}>
        <Card title="How many messages" icon={<BellRing size={18} />} tone="blue" help="Too many messages make people turn them off.">
          <Row label="Weekly limit per person" help="Campaigns and automatic messages together." on={current.weeklyCap.on} onToggle={(on) => setDraft({ ...current, weeklyCap: { ...current.weeklyCap, on } })}>
            <Num label="Messages per week" value={current.weeklyCap.max} unit="per week" min={1} max={50} onChange={(value) => setDraft({ ...current, weeklyCap: { ...current.weeklyCap, max: value } })} />
          </Row>
        </Card>
        <Card title="Quiet hours" icon={<MoonStar size={18} />} tone="purple" help="Messages that would go out now wait until quiet hours end. Safety messages always go out.">
          <Row label="Quiet hours" on={current.quiet.on} onToggle={(on) => setDraft({ ...current, quiet: { ...current.quiet, on } })}>
            <input aria-label="Quiet from" type="time" value={current.quiet.from} onChange={(e) => setDraft({ ...current, quiet: { ...current.quiet, from: e.target.value } })} />
            <input aria-label="Quiet to" type="time" value={current.quiet.to} onChange={(e) => setDraft({ ...current, quiet: { ...current.quiet, to: e.target.value } })} />
          </Row>
          <Row label="Languages in this country"><Choice label="Languages" value={COUNTRY_LANGS[country][0]} options={COUNTRY_LANGS[country].map((lang) => ({ id: lang, label: LANG_LABEL[lang] }))} onChange={() => undefined} disabled /></Row>
        </Card>
      </fieldset>
      {editable ? (
        <div className="dx-publish">
          <span className="dx-publish-text"><b>{dirty ? "Changes not saved" : "Everything is saved"}</b><small>{error ?? "Applies to every message in the country."}</small></span>
          <button data-command="admin.campaigns.view" type="button" className="dash-btn small ghost" disabled={!dirty} onClick={() => setDraft(null)}>Undo changes</button>
          <CommandButton command="admin.campaigns.rules" className="dash-btn small" targetId={`message rules ${country}`} scope="all" confirmTarget={false} before="saved" after="changed" sliceKey={MSG_OPS_KEY} value={{ ...ops, draftRev: ops.draftRev + 1, rules: { ...ops.rules, [country]: current } }} expectedSliceRev={ops.draftRev} disabled={!dirty || Boolean(error)} onDone={() => setDraft(null)}>Save limits</CommandButton>
        </div>
      ) : null}
    </div>
  );
}
