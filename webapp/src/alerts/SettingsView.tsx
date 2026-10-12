import { useState } from "react";
import { Link } from "react-router";
import { AlertOctagon, BellRing, History, Layers, Moon, MousePointerClick, Users } from "lucide-react";
import { can, ROLE_LABELS, type Role } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { CommandButton } from "../ui/CommandButton";
import { Card, Check, Choice, Num, Row, Switch } from "../dispatch/fields";
import { useAlertsData } from "./AlertsContext";
import { ALERTS_KEY, GROUPS, KINDS, LEVELS, settingsIssues, type AlertSettings, type KindDef, type KindSettings, type Level, type Limits } from "./engine";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

const LEGACY: { id: keyof AlertSettings["legacy"]; label: string; help: string }[] = [
  { id: "dashboardCounts", label: "Dashboard counts alerts on its own", help: "Off: the Dashboard strip shows the same numbers as Alerts." },
  { id: "dashboardSound", label: "Dashboard plays its own alert sound", help: "Off: only the bell plays a sound, so nothing sounds twice." },
  { id: "inbox", label: "Inbox button in the top bar", help: "Off: the bell replaces it. Its items (documents, rides without a driver) are alerts now." },
  { id: "dispatchAlerts", label: "Dispatch → Live counts alerts on its own", help: "Off: Dispatch shows the dispatch alerts from Alerts, so taking one there takes it here too." },
];

function LimitField({ label, value, unit, onChange, disabled }: { label: string; value: number | null; unit: string; onChange: (next: number | null) => void; disabled: boolean }) {
  return (
    <span className="al-limit">
      <Check label={label} on={value !== null} disabled={disabled} onChange={(on) => onChange(on ? 0 : null)} />
      {value !== null ? <Num label={`${label} limit`} value={value} unit={unit} min={-365} max={100000} step={unit === "stars" ? 0.1 : 1} disabled={disabled} onChange={onChange} /> : null}
    </span>
  );
}

export function SettingsView() {
  const data = useAlertsData();
  const { agent } = useSession();
  const canManage = Boolean(agent && can(agent.role, "alerts.manage"));
  const [draft, setDraft] = useState<AlertSettings | null>(null);
  const [notice, setNotice] = useState("");
  const settings = draft ?? data.book.settings;
  const issues = settingsIssues(settings);
  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(data.book.settings);
  const mine = data.book.personal[agent?.id ?? ""]?.quiet ?? { on: false, from: "22:00", to: "07:00" };
  const [quiet, setQuiet] = useState(mine);
  const setKind = (id: string, patch: Partial<KindSettings>) => setDraft({ ...settings, kinds: { ...settings.kinds, [id]: { ...settings.kinds[id], ...patch } } });
  const disabled = !canManage;
  const unit = (def: KindDef) => (def.unit === "money" ? ({ SE: "kr", FR: "€", TN: "DT" } as const)[data.market.id] : def.unit ?? "");

  return (
    <div className="al-settings">
      {!canManage ? <p className="dx-readonly" role="status">You can look at the settings. Only Super admin and Operations can change them. Your own quiet hours are at the bottom.</p> : null}
      {dirty || issues.length ? (
        <section className={issues.length ? "dx-publish" : "dx-publish has-changes"} aria-label="Save settings">
          <div className="dx-publish-text"><b>{issues.length ? "Fix the settings first" : "Settings changed, not saved"}</b><small>{issues[0] ?? "Save to use them for everyone."}</small></div>
          <div className="dx-publish-actions">
            <button data-command="admin.alerts.view" type="button" className="dash-btn small ghost" onClick={() => setDraft(null)}>Discard</button>
            <CommandButton command="admin.alerts.settings" className="dash-btn small publish" targetId="alert settings" confirmTarget={false} scope="all" before={`rev ${data.book.draftRev}`} after={`rev ${data.book.draftRev + 1}`} expectedSliceRev={data.book.draftRev} sliceKey={ALERTS_KEY} value={{ ...data.book, draftRev: data.book.draftRev + 1, settings }} disabled={disabled || Boolean(issues.length)} onDone={() => { setDraft(null); setNotice("Alert settings saved."); }}>
              Save settings
            </CommandButton>
          </div>
        </section>
      ) : null}
      {notice ? <p className="pricing-notice" role="status">{notice}</p> : null}

      {GROUPS.map((group) => (
        <Card key={group.id} title={`${group.label} alerts`} tone={group.id === "safety" ? "red" : group.id === "dispatch" ? "purple" : group.id === "drivers" ? "blue" : group.id === "money" ? "green" : group.id === "riders" ? "pink" : "orange"} icon={<Layers size={18} />} help="Switch each one on or off, set its level and who gets it.">
          {KINDS.filter((def) => def.group === group.id).map((def) => {
            const item = settings.kinds[def.id];
            const limits = item.limits;
            const setLimit = (key: keyof Limits, value: number | null) => setKind(def.id, { limits: { ...limits, [key]: value } });
            return (
              <div key={def.id} className={item.on ? "al-kind" : "al-kind off"}>
                <Row label={def.label} help={def.help} on={item.on} disabled={disabled} onToggle={(on) => setKind(def.id, { on })}>
                  {def.mode === "fixed" ? <Choice label={`${def.label} level`} value={item.level} disabled={disabled} onChange={(level: Level) => setKind(def.id, { level })} options={LEVELS} /> : null}
                </Row>
                {item.on && def.mode === "limits" ? (
                  <div className="al-limits" role="group" aria-label={`${def.label} limits`}>
                    <small>{def.direction === "up" ? "From" : "At or below"}:</small>
                    {def.fromDispatch ? <span className="al-from-dispatch">Important: per zone in <Link to="/dispatch?tab=alerts">Dispatch → Alerts</Link></span> : <LimitField label="Info" value={limits.info} unit={unit(def)} disabled={disabled} onChange={(value) => setLimit("info", value)} />}
                    {!def.fromDispatch ? <LimitField label="Important" value={limits.important} unit={unit(def)} disabled={disabled} onChange={(value) => setLimit("important", value)} /> : null}
                    <LimitField label="Critical" value={limits.critical} unit={unit(def)} disabled={disabled} onChange={(value) => setLimit("critical", value)} />
                  </div>
                ) : null}
                {item.on && def.fromDispatch && def.mode === "fixed" ? <p className="al-from-dispatch">The limit is set per zone in <Link to="/dispatch?tab=alerts">Dispatch → Alerts</Link>.</p> : null}
                {item.on ? (
                  <details className="al-who">
                    <summary><Users size={12} aria-hidden="true" /> Who gets it: {item.who === "all" ? "every admin" : item.who.map((role) => ROLE_LABELS[role]).join(", ")}{item.escalate.on ? ` · then ${ROLE_LABELS[item.escalate.to]} after ${item.escalate.afterMin} min` : ""}</summary>
                    <div className="al-who-body">
                      <Choice label={`${def.label} who`} value={item.who === "all" ? "all" : "some"} disabled={disabled} onChange={(value) => setKind(def.id, { who: value === "all" ? "all" : ["ops"] })} options={[{ id: "all", label: "Every admin" }, { id: "some", label: "Only some roles" }]} />
                      {item.who !== "all" ? (
                        <span className="zn-chips">
                          {ROLES.filter((role) => role !== "super").map((role) => {
                            const list = item.who === "all" ? [] : item.who;
                            return <Check key={role} label={ROLE_LABELS[role]} on={list.includes(role)} disabled={disabled} onChange={(on) => setKind(def.id, { who: on ? [...list, role] : list.filter((entry) => entry !== role) })} />;
                          })}
                        </span>
                      ) : null}
                      <span className="al-escalate">
                        <Switch label={`${def.label} pass on`} on={item.escalate.on} disabled={disabled} onChange={(on) => setKind(def.id, { escalate: { ...item.escalate, on } })} />
                        <span>If nobody takes it within</span>
                        <Num label={`${def.label} pass on after`} value={item.escalate.afterMin} unit="min" min={1} max={240} disabled={disabled || !item.escalate.on} onChange={(afterMin) => setKind(def.id, { escalate: { ...item.escalate, afterMin } })} />
                        <span>also show it to</span>
                        <select aria-label={`${def.label} pass on to`} value={item.escalate.to} disabled={disabled || !item.escalate.on} onChange={(event) => setKind(def.id, { escalate: { ...item.escalate, to: event.target.value as Role } })}>
                          {ROLES.filter((role) => role !== "super").map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </select>
                      </span>
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
        </Card>
      ))}

      <Card title="How admins are told" tone="orange" icon={<BellRing size={18} />} help="Every alert shows in the panel and the bell. Pick what else each level does.">
        {LEVELS.map((level) => {
          const channel = settings.channels[level.id];
          const set = (patch: Partial<typeof channel>) => setDraft({ ...settings, channels: { ...settings.channels, [level.id]: { ...channel, ...patch } } });
          return (
            <Row key={level.id} label={level.label}>
              <span className="dx-channels" role="group" aria-label={`${level.label} channels`}>
                <Check label="Panel" on disabled onChange={() => undefined} />
                <Check label="Sound" on={channel.sound} disabled={disabled} onChange={(sound) => set({ sound })} />
                <Check label="Browser notification" on={channel.browser} disabled={disabled} onChange={(browser) => set({ browser })} />
                <Check label="Email" on={channel.email} disabled={disabled} onChange={(email) => set({ email })} />
                <Check label="SMS" on={channel.sms} disabled={disabled} onChange={(sms) => set({ sms })} />
              </span>
            </Row>
          );
        })}
        <p className="dx-note">Email and SMS are sent by the backend to the admins who get that alert.</p>
      </Card>

      <Card title="Extra buttons on alerts" tone="blue" icon={<MousePointerClick size={18} />} help="Take it and Solved are always there. Switch on more if your team needs them.">
        <Row label="Snooze" help="Remind me again in 10 min to 4 hours." on={settings.extras.snooze} disabled={disabled} onToggle={(snooze) => setDraft({ ...settings, extras: { ...settings.extras, snooze } })} />
        <Row label="Pass to another admin" help="The other admin becomes the one working on it." on={settings.extras.pass} disabled={disabled} onToggle={(pass) => setDraft({ ...settings, extras: { ...settings.extras, pass } })} />
        <Row label="Mute this kind for 1 hour" help="For example during planned work." on={settings.extras.mute} disabled={disabled} onToggle={(mute) => setDraft({ ...settings, extras: { ...settings.extras, mute } })} />
        <Row label="Open the page to fix it" help="A button that goes straight to the driver, ride, payment or zone." on={settings.extras.fixLink} disabled={disabled} onToggle={(fixLink) => setDraft({ ...settings, extras: { ...settings.extras, fixLink } })} />
      </Card>

      <Card title="Older alert parts" tone="pink" icon={<History size={18} />} help="Parts of the panel that showed alerts before this section. Off by default, so every number and sound comes from Alerts.">
        {LEGACY.map((item) => (
          <Row key={item.id} label={item.label} help={item.help} on={settings.legacy[item.id]} disabled={disabled} onToggle={(on) => setDraft({ ...settings, legacy: { ...settings.legacy, [item.id]: on } })} />
        ))}
        <p className="dx-note"><AlertOctagon size={13} aria-hidden="true" /> An SOS always has one owner. Taking it here, in the bell or in Incidents is the same action, so two admins can never take the same SOS.</p>
      </Card>

      <Card title="My quiet hours" tone="green" icon={<Moon size={18} />} help="Only for you: no sound and no browser notification in these hours. Alerts still show in the panel.">
        <Row label="Quiet hours" on={quiet.on} onToggle={(on) => setQuiet({ ...quiet, on })}>
          <input type="time" aria-label="Quiet from" value={quiet.from} onChange={(event) => setQuiet({ ...quiet, from: event.target.value })} />
          <span>to</span>
          <input type="time" aria-label="Quiet to" value={quiet.to} onChange={(event) => setQuiet({ ...quiet, to: event.target.value })} />
        </Row>
        <div className="dx-modal-actions">
          <CommandButton command="admin.alerts.quiet" className="dash-btn small" targetId={agent?.id ?? "me"} confirmTarget={false} scope="all" before={mine.on ? `${mine.from}-${mine.to}` : "off"} after={quiet.on ? `${quiet.from}-${quiet.to}` : "off"} expectedSliceRev={data.book.draftRev} sliceKey={ALERTS_KEY} value={{ ...data.book, draftRev: data.book.draftRev + 1, personal: { ...data.book.personal, [agent?.id ?? "me"]: { quiet } } }} disabled={JSON.stringify(quiet) === JSON.stringify(mine) || quiet.from === quiet.to} onDone={() => setNotice("Your quiet hours are saved.")}>
            Save my quiet hours
          </CommandButton>
        </div>
      </Card>
    </div>
  );
}
