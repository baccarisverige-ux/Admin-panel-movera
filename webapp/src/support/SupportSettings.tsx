import { useState } from "react";
import { MessageSquareText, Plus, Timer, ToggleRight, Trash2 } from "lucide-react";
import { Card, Num, Row } from "../dispatch/fields";
import type { MarketId } from "../markets/markets";
import { CommandButton } from "../ui/CommandButton";
import { LANGS, SUPPORT_DESK_KEY, TOPICS, settingsError, type Desk, type DeskSettings, type Lang, type Template, type TopicId } from "./desk";

/** Time limits per topic, sorting, ratings and the ready-made replies, per country. */
export function SupportSettings({ desk, country, editable }: { desk: Desk; country: MarketId; editable: boolean }) {
  const [draft, setDraft] = useState<DeskSettings | null>(null);
  const saved = desk.settings[country];
  const current = draft ?? saved;
  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(saved);
  const error = settingsError(current);
  const patch = (next: Partial<DeskSettings>) => setDraft({ ...current, ...next });
  const setTemplate = (index: number, next: Partial<Template>) => patch({ templates: current.templates.map((item, at) => (at === index ? { ...item, ...next } : item)) });
  return (
    <div className="sp-settings">
      {!editable ? <p className="dx-readonly">Only admins who can edit settings can change these.</p> : null}
      <fieldset className="sp-fieldset" disabled={!editable}>
        <Card title="Time limits per topic" icon={<Timer size={18} />} tone="red" help="First answer and solve time. Late tickets turn red in the inbox.">
          {TOPICS.map((topic) => (
            <Row key={topic.id} label={topic.label}>
              <Num label={`${topic.label} first answer`} before="Answer within" value={current.limits[topic.id].firstReplyMin} unit="min" min={1} onChange={(value) => patch({ limits: { ...current.limits, [topic.id]: { ...current.limits[topic.id], firstReplyMin: value } } })} />
              <Num label={`${topic.label} solve`} before="Solve within" value={current.limits[topic.id].solveHours} unit="h" min={1} onChange={(value) => patch({ limits: { ...current.limits, [topic.id]: { ...current.limits[topic.id], solveHours: value } } })} />
            </Row>
          ))}
        </Card>
        <Card title="Sorting and ratings" icon={<ToggleRight size={18} />} tone="purple">
          <Row label="Sort by topic and language by themselves" help="New tickets get a topic from their words and a language from the country." on={current.autoSort} onToggle={(on) => patch({ autoSort: on })} />
          <Row label="Ask for a rating after solving" help="The person gets 1 to 5 stars in the app. The average shows per admin." on={current.rating} onToggle={(on) => patch({ rating: on })} />
          <Row label="Alert when a ticket is late" help="Late tickets show in Alerts and the bell." on={current.lateAlerts} onToggle={(on) => patch({ lateAlerts: on })} />
        </Card>
        <Card title="Ready-made replies" icon={<MessageSquareText size={18} />} tone="blue" help="Admins pick one and change it before sending. The ticket's language comes first.">
          <ul className="sp-templates">
            {current.templates.map((item, index) => (
              <li key={item.id}>
                <span className="sp-template-head">
                  <input aria-label={`Reply ${index + 1} title`} value={item.title} onChange={(event) => setTemplate(index, { title: event.target.value })} />
                  <select aria-label={`Reply ${index + 1} topic`} value={item.topic} onChange={(event) => setTemplate(index, { topic: event.target.value as TopicId | "any" })}><option value="any">Any topic</option>{TOPICS.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}</select>
                  <select aria-label={`Reply ${index + 1} language`} value={item.lang} onChange={(event) => setTemplate(index, { lang: event.target.value as Lang })}>{Object.entries(LANGS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
                  <button data-command="admin.ticket.view" type="button" className="dash-btn small ghost icon" aria-label={`Remove ${item.title}`} onClick={() => patch({ templates: current.templates.filter((_, at) => at !== index) })}><Trash2 size={13} aria-hidden="true" /></button>
                </span>
                <textarea aria-label={`Reply ${index + 1} text`} rows={2} value={item.text} onChange={(event) => setTemplate(index, { text: event.target.value })} />
              </li>
            ))}
          </ul>
          <div className="sp-add"><button data-command="admin.ticket.view" type="button" className="dash-btn small ghost" onClick={() => patch({ templates: [...current.templates, { id: `t-${current.templates.length + 1}-${Date.now() % 10_000}`, topic: "any", lang: country === "SE" ? "sv" : country === "FR" ? "fr" : "ar", title: "", text: "" }] })}><Plus size={13} aria-hidden="true" /> Add a reply</button></div>
        </Card>
      </fieldset>
      {editable ? (
        <div className="dx-publish">
          <span className="dx-publish-text"><b>{dirty ? "Changes not saved" : "Everything is saved"}</b><small>{error ?? "Applies to every ticket in the country."}</small></span>
          <button data-command="admin.ticket.view" type="button" className="dash-btn small ghost" disabled={!dirty} onClick={() => setDraft(null)}>Undo changes</button>
          <CommandButton command="admin.ticket.settings" className="dash-btn small" targetId={`support settings ${country}`} scope="all" confirmTarget={false} before="saved" after="changed" sliceKey={SUPPORT_DESK_KEY} value={{ ...desk, draftRev: desk.draftRev + 1, settings: { ...desk.settings, [country]: current } }} expectedSliceRev={desk.draftRev} disabled={!dirty || Boolean(error)} onDone={() => setDraft(null)}>Save settings</CommandButton>
        </div>
      ) : null}
    </div>
  );
}
