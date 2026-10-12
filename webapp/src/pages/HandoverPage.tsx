import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, ArrowLeft, BellRing, CheckCheck, ClipboardList, History, ListTodo, Plus, Siren, Trash2, UserCheck, Wrench } from "lucide-react";
import { useAudit, useRecords, useSlice } from "../api/hooks";
import { useAlertsMaybe } from "../alerts/AlertsContext";
import { AGENTS, can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { commandById } from "../commands/registry";
import { healthAlerts, roleMatrix, runDrills, type DrillResult } from "../handover/drills";
import { HANDOVER_KEY, emptyHandoverOps, handOver, markRead, normalizeHandoverOps, shiftStart, unread, type Handover, type HandoverOps, type Snapshot } from "../handover/shift";
import { allowedCountries } from "../markets/scope";
import { useMarketScope } from "../markets/useMarketScope";
import { agentName } from "../trips/TripParts";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

const NAMES: Record<string, string> = {
  "payment-failure": "Payment failure",
  sos: "SOS",
  suspension: "Driver suspension",
  reservation: "Reservation without a driver",
  "bad-publish": "Bad config publish",
};

type Tab = "shift" | "past" | "runbooks";
const TABS: { id: Tab; label: string }[] = [
  { id: "shift", label: "Shift handover" },
  { id: "past", label: "Past handovers" },
  { id: "runbooks", label: "Runbooks and drills" },
];

export function HandoverPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((item) => item.id === params.get("tab"))?.id ?? "shift") as Tab;
  const scope = useMarketScope();
  const { agent } = useSession();
  const slice = useSlice<HandoverOps>(HANDOVER_KEY, emptyHandoverOps());
  const ops = normalizeHandoverOps(slice.value);
  const select = (id: Tab) => setParams(() => {
    const next = new URLSearchParams(globalThis.location.search);
    if (id === "shift") next.delete("tab");
    else next.set("tab", id);
    return next;
  }, { replace: true });
  const waiting = unread(ops, scope.market.id, agent?.id ?? "");

  return (
    <div className="dx-page op-page">
      <header className="dx-head">
        <button data-command="admin.shift.view" type="button" className="dash-btn ghost dx-back" onClick={() => (globalThis.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <div className="dx-head-text">
          <h2>Handover</h2>
          <p>What the next shift in {scope.market.name} needs to know. Open work and changes fill in by themselves; you add the rest.</p>
        </div>
      </header>
      <div className="dash-tabs dx-views" role="tablist" aria-label="Handover sections">
        {TABS.map((item) => <button data-command="admin.shift.view" key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : undefined} onClick={() => select(item.id)}>{item.label}{item.id === "shift" && waiting.length ? <span className="dx-count">{waiting.length}</span> : null}</button>)}
      </div>
      {tab === "shift" ? <ShiftTab ops={ops} waiting={waiting} /> : tab === "past" ? <PastTab ops={ops} /> : <RunbooksTab />}
    </div>
  );
}

function ShiftTab({ ops, waiting }: { ops: HandoverOps; waiting: Handover[] }) {
  const { agent } = useSession();
  const scope = useMarketScope();
  const country = scope.market.id;
  const alerts = useAlertsMaybe();
  const audit = useAudit(30_000);
  const incidents = useRecords("incidents");
  const [text, setText] = useState("");
  const [todo, setTodo] = useState<string[]>([]);
  const [line, setLine] = useState("");
  const [to, setTo] = useState("");
  const [notice, setNotice] = useState("");
  const now = alerts?.now ?? Date.now();
  const start = shiftStart(ops, country, now);
  const zoneIds = new Set(scope.market.zones.map((zone) => zone.id));
  const snapshot: Snapshot = useMemo(() => ({
    openAlerts: alerts?.active.length ?? 0,
    critical: alerts?.counts.critical ?? 0,
    openIncidents: (incidents.data ?? []).filter((row) => row.status === "queued" || row.status === "taken").length,
    working: (alerts?.open ?? []).filter((alert) => alert.owner).slice(0, 12).map((alert) => ({ title: alert.title, by: agentName(alert.owner ?? "") })),
    notTaken: (alerts?.active ?? []).filter((alert) => alert.status === "new").slice(0, 12).map((alert) => ({ title: alert.title, level: alert.level })),
    changes: (audit.data ?? [])
      .filter((row) => Date.parse(row.at) >= start && row.result === "committed" && (row.scope === "all" || zoneIds.has(row.scope) || !row.scope))
      .slice(0, 20)
      .map((row) => ({ at: row.at, by: agentName(row.actorId), text: `${commandById(row.action)?.label ?? row.action}${row.targetId ? ` · ${row.targetId}` : ""}` })),
  }), [alerts, incidents.data, audit.data, start, zoneIds.size]);
  const next = AGENTS.filter((item) => item.id !== agent?.id && item.active && allowedCountries(item.scope).includes(country));
  const result = handOver(ops, { country, zones: scope.zones.length ? scope.zones.join(",") : "all", by: agent?.id ?? "", at: new Date().toISOString(), to: to || null, text, todo, snapshot });
  const time = (iso: string) => new Intl.DateTimeFormat(scope.market.locale, { timeZone: scope.market.timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const short = (iso: string) => new Intl.DateTimeFormat(scope.market.locale, { timeZone: scope.market.timeZone, timeStyle: "short" }).format(new Date(iso));

  return (
    <div className="op-settings">
      {waiting.map((item) => {
        const read = markRead(ops, item.id, agent?.id ?? "", new Date().toISOString());
        return (
          <article key={item.id} className="op-handover unread" aria-label={`Handover from ${agentName(item.by)}`}>
            <header>
              <BellRing size={18} aria-hidden="true" />
              <span><b>{agentName(item.by)} handed over to {item.to ? (item.to === agent?.id ? "you" : agentName(item.to)) : "the next shift"}</b><small>{time(item.at)} · {item.snapshot.openAlerts} open alerts · {item.snapshot.openIncidents} open incidents</small></span>
              <CommandButton command="admin.shift.read" className="dash-btn small" sliceKey={HANDOVER_KEY} value={read.ops} expectedSliceRev={ops.draftRev} targetId={item.id} confirmTarget={false} before="not read" after="read" disabled={Boolean(read.error)} title={read.error} onDone={() => setNotice(`You confirmed you read ${agentName(item.by)}'s handover.`)}><CheckCheck size={13} aria-hidden="true" /> I read it</CommandButton>
            </header>
            <HandoverBody item={item} short={short} />
          </article>
        );
      })}
      {notice ? <p className="dx-note" role="status">{notice}</p> : null}

      <section className="op-section" aria-label="Your shift so far">
        <header className="op-section-head"><h3><span aria-hidden="true"><ClipboardList size={16} /></span> Your shift so far</h3><small className="op-help">Since {time(new Date(start).toISOString())}</small></header>
        <div className="op-shift-cards">
          <div className="op-shift-card red"><Siren size={16} aria-hidden="true" /><b>{snapshot.openIncidents}</b><small>Open incidents</small></div>
          <div className="op-shift-card orange"><AlertTriangle size={16} aria-hidden="true" /><b>{snapshot.critical}</b><small>Critical alerts</small></div>
          <div className="op-shift-card blue"><BellRing size={16} aria-hidden="true" /><b>{snapshot.openAlerts}</b><small>Open alerts</small></div>
          <div className="op-shift-card violet"><UserCheck size={16} aria-hidden="true" /><b>{snapshot.working.length}</b><small>Being worked on</small></div>
          <div className="op-shift-card green"><Wrench size={16} aria-hidden="true" /><b>{snapshot.changes.length}</b><small>Changes saved</small></div>
        </div>
        <div className="op-shift-lists">
          <div>
            <h4 className="op-sub">Nobody has taken these yet</h4>
            {snapshot.notTaken.length ? <ul className="op-mini">{snapshot.notTaken.map((item, index) => <li key={index} className={item.level}>{item.title}</li>)}</ul> : <p className="op-help">Every alert has someone.</p>}
            <Link className="op-help" to="/alerts">Open Alerts</Link>
          </div>
          <div>
            <h4 className="op-sub">Being worked on</h4>
            {snapshot.working.length ? <ul className="op-mini">{snapshot.working.map((item, index) => <li key={index}><b>{item.by}</b> · {item.title}</li>)}</ul> : <p className="op-help">Nobody is working on an alert.</p>}
          </div>
          <div>
            <h4 className="op-sub">Changes this shift</h4>
            {snapshot.changes.length ? <ul className="op-mini">{snapshot.changes.map((item, index) => <li key={index}><time>{short(item.at)}</time> <b>{item.by}</b> · {item.text}</li>)}</ul> : <p className="op-help">No changes saved yet.</p>}
          </div>
        </div>
      </section>

      <section className="op-section" aria-label="Hand over">
        <header className="op-section-head"><h3><span aria-hidden="true"><ListTodo size={16} /></span> Hand over</h3></header>
        <div className="op-form">
          <label className="op-field"><span>What the next shift should know</span><textarea aria-label="Handover note" rows={4} value={text} placeholder="For example: Arlanda is busy until 22:00, two drivers have a late document, the card payment issue is with the bank." onChange={(event) => setText(event.target.value)} /></label>
          <div className="op-field"><span>To-do for the next shift</span>
            <div className="op-inline">
              <input aria-label="New to-do" value={line} placeholder="Add a to-do and press Add" onChange={(event) => setLine(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && line.trim()) { setTodo([...todo, line.trim()]); setLine(""); } }} />
              <button data-command="admin.shift.view" type="button" className="dash-btn small ghost" disabled={!line.trim()} onClick={() => { setTodo([...todo, line.trim()]); setLine(""); }}><Plus size={13} aria-hidden="true" /> Add</button>
            </div>
            {todo.length ? <ul className="op-todo">{todo.map((item, index) => <li key={index}>{item}<button data-command="admin.shift.view" type="button" className="dash-btn small ghost icon" aria-label={`Remove ${item}`} onClick={() => setTodo(todo.filter((_, at) => at !== index))}><Trash2 size={12} aria-hidden="true" /></button></li>)}</ul> : null}
          </div>
          <label className="op-field"><span>Next admin</span>
            <select aria-label="Next admin" value={to} onChange={(event) => setTo(event.target.value)}>
              <option value="">Anyone on the next shift</option>
              {next.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="op-form-actions">
            <CommandButton command="admin.shift.handover" className="dash-btn" sliceKey={HANDOVER_KEY} value={result.ops} expectedSliceRev={ops.draftRev} targetId={`handover ${country}`} confirmTarget={false} before="" after={text.slice(0, 80)} disabled={Boolean(result.error)} title={result.error} onDone={() => { setText(""); setTodo([]); setTo(""); setNotice("Handed over. The next admin sees it when they open Handover."); }}>Hand over</CommandButton>
          </div>
        </div>
      </section>
    </div>
  );
}

function HandoverBody({ item, short }: { item: Handover; short: (iso: string) => string }) {
  return (
    <div className="op-handover-body">
      {item.text ? <p className="op-handover-text">{item.text}</p> : null}
      {item.todo.length ? <ul className="op-todo done">{item.todo.map((line, index) => <li key={index}>{line}</li>)}</ul> : null}
      {item.snapshot.notTaken.length ? <p className="op-help">Not taken when handed over: {item.snapshot.notTaken.map((row) => row.title).join(" · ")}</p> : null}
      {item.snapshot.changes.length ? <p className="op-help">Changes: {item.snapshot.changes.slice(0, 5).map((row) => `${short(row.at)} ${row.by} ${row.text}`).join(" · ")}</p> : null}
    </div>
  );
}

function PastTab({ ops }: { ops: HandoverOps }) {
  const { agent } = useSession();
  const scope = useMarketScope();
  const [zone, setZone] = useState("all");
  const time = (iso: string) => new Intl.DateTimeFormat(scope.market.locale, { timeZone: scope.market.timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const short = (iso: string) => new Intl.DateTimeFormat(scope.market.locale, { timeZone: scope.market.timeZone, timeStyle: "short" }).format(new Date(iso));
  const items = ops.items.filter((item) => item.country === scope.market.id && (zone === "all" || item.zones === "all" || item.zones.split(",").includes(zone))).sort((a, b) => b.at.localeCompare(a.at));
  const isSuper = Boolean(agent && can(agent.role, "team.read"));
  return (
    <div className="op-settings">
      <div className="op-inline wrap">
        <label className="op-field"><span>Zone</span>
          <select aria-label="Handover zone" value={zone} onChange={(event) => setZone(event.target.value)}>
            <option value="all">All zones</option>
            {scope.market.zones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {isSuper ? (
          <span className="op-must-read">
            <span className={ops.mustRead ? "dx-tag on" : "dx-tag"}>Next admin must press I read it: {ops.mustRead ? "on" : "off"}</span>
            <CommandButton command="admin.shift.settings" className="dash-btn small ghost" sliceKey={HANDOVER_KEY} value={{ ...ops, draftRev: ops.draftRev + 1, mustRead: !ops.mustRead }} expectedSliceRev={ops.draftRev} targetId="handover settings" confirmTarget={false} before={ops.mustRead ? "on" : "off"} after={ops.mustRead ? "off" : "on"}>{ops.mustRead ? "Turn off I read it" : "Turn on I read it"}</CommandButton>
          </span>
        ) : null}
      </div>
      {items.length ? (
        <ul className="op-past-handovers" aria-label="Past handovers">
          {items.map((item) => (
            <li key={item.id} className="op-handover">
              <header>
                <History size={16} aria-hidden="true" />
                <span><b>{agentName(item.by)} → {item.to ? agentName(item.to) : "next shift"}</b><small>{time(item.at)} · {item.zones === "all" ? "All zones" : item.zones.split(",").map((id) => scope.market.zones.find((zoneItem) => zoneItem.id === id)?.name ?? id).join(", ")}</small></span>
                <span className="dx-tag">{item.readBy.length ? `Read by ${item.readBy.map((read) => agentName(read.id)).join(", ")}` : "Not read yet"}</span>
              </header>
              <HandoverBody item={item} short={short} />
            </li>
          ))}
        </ul>
      ) : <p className="dx-calm">No handovers yet in {scope.market.name}.</p>}
    </div>
  );
}

function RunbooksTab() {
  const [drills, setDrills] = useState<DrillResult[] | null>(null);
  return (
    <>
      <p className="op-help">The role matrix and the five runbooks. Drills run on the demo, not on staging.</p>
      <article className="panel">
        <h3>Health</h3>
        <ul>
          {healthAlerts().map((alert) => (
            <li key={alert.id}>{alert.text}</li>
          ))}
        </ul>
      </article>
      <article className="panel">
        <h3>Role matrix</h3>
        <DataTable head={["Role", "Permissions"]} rows={roleMatrix().map((row) => [row.role, row.permissions.join(", ")])} />
      </article>
      <article className="panel">
        <h3>Drills</h3>
        <CommandButton command="admin.handover.drills" className="primary-btn" type="button" onDone={() => setDrills(runDrills())}>
          Run drills
        </CommandButton>
        {drills?.map((drill) => (
          <section key={drill.id}>
            <h3>
              {NAMES[drill.id] ?? drill.id} · {drill.pass ? "pass" : "not passed"}
            </h3>
            <ul>
              {drill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </>
  );
}
