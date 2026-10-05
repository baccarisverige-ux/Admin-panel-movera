import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { claimTicket, logIncident, patchSettings, replyTicket, saveContentToggle, saveEvent, sendMessage, setAgent, setGrant, toggleCancelReason } from "./actions";
import { ACTIVE_TRIP, ISLAND_TEMPLATES, PERMISSIONS, ROLES, zoneName, type Permission, type RoleId } from "./domain";
import { formatSek, formatWhen, csvCell } from "./format";
import { scopedDrivers, scopedTrips, useAdmin } from "./store";
import { A, Button, controlClass, DataTable, Field, Guard, PageHead, Panel, PhonePreview, Select, StatusBadge, TextInput } from "./ui";

export function DashboardScreen() {
  const { db, agent, can } = useAdmin();
  if (!db || !agent) return null;
  const docs = db.documents.filter((doc) => doc.status === "in_review" && scopedDrivers(db, agent).some((driver) => driver.id === doc.driverId)).length;
  const tickets = db.tickets.filter((ticket) => ticket.status === "open").length;
  const sos = db.incidents.filter((item) => item.status === "open").length;
  const soon = db.reservations.filter((item) => item.status === "waiting" && new Date(item.pickupAt).getTime() - Date.parse("2026-10-05T08:30:00+02:00") < 3600_000).length;
  const online = scopedDrivers(db, agent).filter((driver) => driver.onlineStatus === "online" || driver.onlineStatus === "on_trip").length;
  const active = scopedTrips(db, agent).filter((trip) => ACTIVE_TRIP.includes(trip.status)).length;
  const revenue = scopedTrips(db, agent).filter((trip) => trip.status === "completed").reduce((sum, trip) => sum + trip.pickupFee + trip.distanceFee + trip.timeFee, 0);
  const tiles = [
    can("documents.review") ? { href: "/onboarding?stage=docs", label: "Documents waiting", value: String(docs) } : null,
    can("support.handle") ? { href: "/support", label: "Open tickets", value: String(tickets) } : null,
    can("safety.respond") ? { href: "/incidents", label: "SOS active", value: String(sos) } : null,
    can("reservations.manage") ? { href: "/reservations", label: "Reservations without a driver", value: String(soon) } : null,
    can("trips.view") || can("drivers.view") ? { href: "/trips", label: "Online drivers", value: String(online) } : null,
    can("trips.view") ? { href: "/trips", label: "Active trips", value: String(active) } : null,
    { href: "/reports", label: "Completed fare volume", value: formatSek(revenue) },
  ].filter((item): item is { href: string; label: string; value: string } => !!item);
  return (
    <div>
      <PageHead title="Today in Stockholm" subtitle="Queues that need a person, then the live picture. Figures are demo data in kronor." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <A key={tile.label} href={tile.href} className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-xs text-muted">{tile.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{tile.value}</p>
          </A>
        ))}
      </div>
    </div>
  );
}

export function MessagesScreen() {
  const { db, run } = useAdmin();
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const preset = useMemo(() => new URLSearchParams(search).get("to") || "All drivers", [search]);
  const [title, setTitle] = useState<string>(ISLAND_TEMPLATES[0]);
  const [body, setBody] = useState("Open the app to see the details.");
  const [target, setTarget] = useState(preset);
  const [type, setType] = useState<"island" | "push" | "banner" | "sms">("island");
  const [tone, setTone] = useState<"info" | "warning" | "action">("info");
  if (!db) return null;
  return (
    <Guard need="messages.send">
      <PageHead title="Messages" subtitle="Island, push, banner or SMS. Sending stays inside the demo." />
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Panel>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void run((data, who) => sendMessage(data, who, { type, tone, title, body, target, phase: "queued" })); }}>
            <Field label="Type"><Select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="island">Island message</option><option value="push">Push</option><option value="banner">In-app banner</option><option value="sms">SMS</option></Select></Field>
            <Field label="Tone"><Select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}><option value="info">Info</option><option value="warning">Warning</option><option value="action">Action required</option></Select></Field>
            <Field label="Title"><TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
            <Field label="Body"><textarea className={`${controlClass} min-h-20 py-2`} value={body} onChange={(event) => setBody(event.target.value)} /></Field>
            <Field label="Target"><TextInput value={target} onChange={(event) => setTarget(event.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => void run((data, who) => sendMessage(data, who, { type, tone, title, body, target, phase: "test" }))}>Test send</Button>
              <Button type="submit">Publish to audience</Button>
            </div>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {db.messages.map((item) => <li key={item.id} className="rounded-xl border border-line px-3 py-2"><span className="font-medium">{item.title}</span> · {item.type} · {item.phase ?? "sent"} · {item.target}<span className="block text-xs text-muted">accepted {item.accepted ?? item.sent} · sent {item.sent} · delivered {item.delivered} · failed {item.failed ?? 0} · opened {item.opened}</span></li>)}
          </ul>
        </Panel>
        <PhonePreview kicker={tone} title={title} body={body} />
      </div>
    </Guard>
  );
}

export function ContentScreen() {
  const { db, run } = useAdmin();
  const [eventId, setEventId] = useState(db?.events[0]?.id ?? "");
  if (!db) return null;
  const event = db.events.find((item) => item.id === eventId) ?? db.events[0];
  return (
    <Guard need="content.edit">
      <PageHead title="App content" subtitle="What the driver and rider apps show on Home, plus bonuses, promos, help and legal text." />
      <Panel className="mb-4">
        <h3 className="font-semibold">Driver Home</h3>
        {([
          ["showRating", "Show rating"],
          ["showAcceptance", "Show acceptance"],
          ["showCancellation", "Show cancellation"],
        ] as const).map(([key, label]) => (
          <div key={key} className="mt-2 flex items-center justify-between text-sm">
            <span>{label}</span>
            <Button variant="ghost" onClick={() => void run((data, who) => saveContentToggle(data, who, { performance: { ...data.settings.performance, [key]: !data.settings.performance[key] } }))}>{db.settings.performance[key] ? "On" : "Off"}</Button>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span>Reservations row · {db.settings.scheduledRow.title}</span>
          <Button variant="ghost" onClick={() => void run((data, who) => saveContentToggle(data, who, { scheduledRow: { ...data.settings.scheduledRow, enabled: !data.settings.scheduledRow.enabled } }))}>{db.settings.scheduledRow.enabled ? "On" : "Off"}</Button>
        </div>
      </Panel>
      {event ? (
        <Panel className="mb-4">
          <h3 className="font-semibold">Events</h3>
          <Select className="mt-2" value={event.id} onChange={(e) => setEventId(e.target.value)}>{db.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select>
          <form className="mt-3 grid gap-2" onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run((data, who) => saveEvent(data, who, { ...event, title: String(form.get("title")), demandLabel: String(form.get("demand")), driverNote: String(form.get("note")), enabled: form.get("enabled") === "on" }));
          }}>
            <TextInput name="title" defaultValue={event.title} />
            <TextInput name="demand" defaultValue={event.demandLabel} />
            <textarea name="note" className={`${controlClass} min-h-20 py-2`} defaultValue={event.driverNote} />
            <label className="text-sm"><input name="enabled" type="checkbox" defaultChecked={event.enabled} /> Published</label>
            <Button type="submit">Save event</Button>
          </form>
          <div className="mt-4"><PhonePreview title={event.title} body={`${event.dateLabel} · ${event.location} · ${event.demandLabel}`} /></div>
        </Panel>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Driver bonuses</h3>
          <ul className="mt-2 space-y-2 text-sm">{db.bonuses.map((bonus) => <li key={bonus.code}><span className="font-medium">{bonus.code}</span> {bonus.title}<span className="block text-muted">{bonus.rule} · {formatSek(bonus.rewardOre)}</span></li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Rider promos</h3>
          <ul className="mt-2 space-y-2 text-sm">{db.promos.map((promo) => <li key={promo.code}><span className="font-medium">{promo.code}</span> {promo.title} · {formatSek(promo.offOre)} · used {promo.used}</li>)}</ul>
          <p className="mt-3 text-sm text-muted">Refer & earn: inviter {formatSek(db.settings.referral.inviterOre)}, new rider {formatSek(db.settings.referral.inviteeOre)}. {db.settings.referral.condition}.</p>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Help articles</h3>
          <ul className="mt-2 space-y-2 text-sm">{db.articles.map((article) => <li key={article.id}><span className="font-medium">{article.title}</span><span className="block text-muted">{article.audience} · {article.topic}</span></li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Legal</h3>
          <ul className="mt-2 space-y-2 text-sm">{db.legal.map((doc) => <li key={doc.id}>{doc.app} {doc.kind} · v{doc.version}<span className="block text-muted">{doc.body}</span></li>)}</ul>
        </Panel>
      </div>
    </Guard>
  );
}

export function SupportScreen({ ticketId }: { ticketId?: string }) {
  const { db, run } = useAdmin();
  const [text, setText] = useState("");
  if (!db) return null;
  const ticket = db.tickets.find((item) => item.id === ticketId) ?? db.tickets[0];
  return (
    <Guard need="support.handle">
      <PageHead title="Support" subtitle="Claim a case. Replies stay in the demo and are not delivered." />
      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-2">
          {db.tickets.map((item) => (
            <A key={item.id} href={`/support/${item.id}`} className="block rounded-2xl border border-line bg-paper px-3 py-3">
              <span className="font-medium">{item.subject}</span>
              <span className="mt-1 flex gap-2 text-xs text-muted"><StatusBadge status={item.status === "open" ? "pending" : item.status} label={item.status} /> {item.priority}</span>
            </A>
          ))}
        </div>
        {ticket ? (
          <Panel>
            <h3 className="font-semibold">{ticket.subject}</h3>
            <p className="text-xs text-muted">{ticket.id} · {ticket.personType} {ticket.personId}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {ticket.messages.map((message, index) => <li key={index} className="rounded-xl bg-canvas px-3 py-2"><span className="text-xs text-muted">{message.from}</span><span className="block">{message.text}</span></li>)}
            </ul>
            <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void run((data, who) => replyTicket(data, who, { ticketId: ticket.id, text, status: "waiting" })); setText(""); }}>
              <textarea className={`${controlClass} min-h-20 py-2`} value={text} onChange={(event) => setText(event.target.value)} />
              <div className="flex gap-2">
                <Button type="submit">Reply</Button>
                <Button variant="ghost" onClick={() => void run((data, who) => claimTicket(data, who, ticket.id))}>Claim</Button>
                <Button variant="ghost" onClick={() => void run((data, who) => replyTicket(data, who, { ticketId: ticket.id, text: "", status: "solved" }))}>Mark solved</Button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>
    </Guard>
  );
}

export function IncidentScreen({ id }: { id?: string }) {
  const { db, run } = useAdmin();
  const [action, setAction] = useState("Called driver");
  if (!db) return null;
  const incident = db.incidents.find((item) => item.id === id) ?? db.incidents.find((item) => item.status !== "closed") ?? db.incidents[0];
  return (
    <Guard need="safety.respond">
      <PageHead title="Incidents" subtitle="SOS stays at the top of the screen until someone takes it." />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          {db.incidents.map((item) => <A key={item.id} href={`/incidents/${item.id}`} className="block rounded-2xl border border-line bg-paper px-3 py-3 text-sm"><span className="font-medium">{item.id}</span> · {item.kind} · {item.area}<span className="mt-1 block"><StatusBadge status={item.status === "open" ? "rejected" : item.status} label={item.status} /></span></A>)}
        </div>
        {incident ? (
          <Panel>
            <h3 className="font-semibold">{incident.id}</h3>
            <p className="text-sm text-muted">{incident.area} · location 2 min ago · accuracy 40 m · demo, not a live GPS track · <A href={`/trips/${incident.tripId}`} className="underline-offset-2 hover:underline">{incident.tripId}</A></p>
            <ul className="mt-3 space-y-2 text-sm">{incident.actions.map((item, index) => <li key={index}>{formatWhen(item.at)} · {item.action}</li>)}</ul>
            {incident.outcome ? <p className="mt-2 text-sm">{incident.outcome}</p> : null}
            <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void run((data, who) => logIncident(data, who, { incidentId: incident.id, action })); }}>
              <Select value={action} onChange={(event) => setAction(event.target.value)}>
                {["Called driver", "Called rider", "Called 112", "Shared trip with safety"].map((item) => <option key={item}>{item}</option>)}
              </Select>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void run((data, who) => logIncident(data, who, { incidentId: incident.id, action: "Taken" }))}>Take</Button>
                <Button type="submit">Log action</Button>
                <Button variant="danger" onClick={() => void run((data, who) => logIncident(data, who, { incidentId: incident.id, action: "Closed", close: true, outcome: "Handled in the demo log." }))}>Close</Button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>
    </Guard>
  );
}

export function ReportsScreen() {
  const { db, agent } = useAdmin();
  if (!db || !agent) return null;
  const trips = scopedTrips(db, agent);
  const byZone = new Map<string, number>();
  for (const trip of trips.filter((item) => item.status === "completed")) {
    byZone.set(trip.zoneId, (byZone.get(trip.zoneId) ?? 0) + trip.pickupFee + trip.distanceFee + trip.timeFee);
  }
  const reasons = new Map<string, number>();
  for (const trip of trips) if (trip.cancelCode) reasons.set(trip.cancelCode, (reasons.get(trip.cancelCode) ?? 0) + 1);
  return (
    <Guard need={["audit.view", "payouts.manage"]}>
      <PageHead title="Reports" subtitle="Quality and revenue for the demo week.">
        <Button variant="ghost" onClick={() => {
          const lines = ["zone,sek", ...[...byZone.entries()].map(([zone, ore]) => `${csvCell(zone)},${csvCell((ore / 100).toFixed(2))}`)];
          const blob = new Blob([lines.join("\n")], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "movera-revenue.csv";
          link.click();
          URL.revokeObjectURL(url);
        }}>Export CSV</Button>
      </PageHead>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Revenue by zone</h3>
          <ul className="mt-2 space-y-2 text-sm">{[...byZone.entries()].map(([zone, ore]) => <li key={zone} className="flex justify-between"><span>{zoneName(zone as never)}</span><span className="tabular-nums">{formatSek(ore)}</span></li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Cancel reasons</h3>
          <ul className="mt-2 space-y-2 text-sm">{[...reasons.entries()].map(([code, count]) => <li key={code} className="flex justify-between"><span>{code}</span><span>{count}</span></li>)}</ul>
        </Panel>
      </div>
    </Guard>
  );
}

export function TeamScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="team.manage">
      <PageHead title="Team and roles" subtitle="What each demo agent can see. Super admin always keeps every permission." />
      <DataTable
        rows={db.agents}
        rowKey={(row) => row.id}
        empty="No agents."
        columns={[
          { key: "name", header: "Agent", render: (row) => <span className="font-medium">{row.name}<span className="block text-xs text-muted">{row.email}</span></span> },
          { key: "role", header: "Role", render: (row) => (
            <Select value={row.role} onChange={(event) => void run((data, who) => setAgent(data, who, { agentId: row.id, role: event.target.value as RoleId }))}>
              {ROLES.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>
          ) },
          { key: "presence", header: "Presence", render: (row) => <StatusBadge status={row.presence === "online" ? "online" : row.presence === "away" ? "away" : "offline"} label={row.presence} /> },
        ]}
      />
      <Panel className="mt-4 overflow-x-auto">
        <h3 className="font-semibold">Permission matrix</h3>
        <table className="mt-3 w-full min-w-[760px] text-left text-xs">
          <thead><tr><th className="py-2">Permission</th>{ROLES.filter((role) => role.id !== "super").map((role) => <th key={role.id} className="py-2">{role.name}</th>)}</tr></thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-t border-line">
                <td className="py-2 font-mono">{permission}</td>
                {ROLES.filter((role) => role.id !== "super").map((role) => (
                  <td key={role.id}>
                    <input type="checkbox" checked={db.roleGrants[role.id].includes(permission)} onChange={(event) => void run((data, who) => setGrant(data, who, { role: role.id, permission: permission as Permission, on: event.target.checked }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Guard>
  );
}

export function AuditScreen() {
  const { db } = useAdmin();
  const [q, setQ] = useState("");
  if (!db) return null;
  const rows = db.audit.filter((item) => `${item.action} ${item.target} ${item.reason ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Guard need="audit.view">
      <PageHead title="Audit" subtitle="Who did what in this demo. Read only." />
      <TextInput className="mb-3 max-w-xs" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Filter" aria-label="Filter audit" />
      <ul className="space-y-2 text-sm">
        {rows.slice(0, 80).map((item) => <li key={item.id} className="rounded-xl border border-line bg-paper px-3 py-2">{formatWhen(item.at)} · {db.agents.find((agent) => agent.id === item.agentId)?.name ?? item.agentId} · {item.action} · {item.target}{item.reason ? ` · ${item.reason}` : ""}</li>)}
      </ul>
    </Guard>
  );
}

export function SettingsScreen() {
  const { db, run, reset, can } = useAdmin();
  if (!db) return null;
  const dispatch = db.settings.dispatch;
  return (
    <Guard need={["settings.edit", "content.edit"]}>
      <PageHead title="Settings" subtitle="Movera, SEK, Europe/Stockholm. Changes stay in this browser." />
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Dispatch</h3>
          <label className="mt-2 block text-sm">Offer time {dispatch.offerSeconds}s
            <input className="mt-1 w-full" type="range" min={8} max={30} value={dispatch.offerSeconds} disabled={!can("settings.edit")} onChange={(event) => void run((data, who) => patchSettings(data, who, { dispatch: { ...data.settings.dispatch, offerSeconds: Number(event.target.value) } }))} />
          </label>
          <p className="mt-2 text-sm text-muted">Search {dispatch.searchKm} km · radar {dispatch.radarKm} km · quote {dispatch.quoteSeconds}s · no-show {dispatch.noShowMinutes} min · destination mode {dispatch.destinationUses}/day</p>
          <Button className="mt-3" variant="ghost" disabled={!can("settings.edit")} onClick={() => void run((data, who) => patchSettings(data, who, { dispatch: { ...data.settings.dispatch, airportQueue: !data.settings.dispatch.airportQueue } }))}>Airport queue {dispatch.airportQueue ? "on" : "off"}</Button>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Reservations policy</h3>
          <p className="mt-2 text-sm">{db.settings.reservations.termsText}</p>
          <p className="mt-2 text-sm text-muted">{db.settings.reservations.noDriverText}</p>
          <div className="mt-3"><PhonePreview title="Cancellation terms" body={db.settings.reservations.termsText} /></div>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Safety and driving time</h3>
          <p className="mt-2 text-sm">PIN {db.settings.safety.pin ? "on" : "off"} · RideCheck stop {db.settings.safety.rideCheckStopMin} min · deviation {db.settings.safety.deviationM} m</p>
          <p className="text-sm text-muted">Max {db.settings.driving.maxHoursDay} h/day · {db.settings.driving.maxHoursWeek} h/week · break after {db.settings.driving.breakAfterHours} h</p>
        </Panel>
        <Panel>
          <h3 className="font-semibold">App versions</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(db.settings.versions).map(([key, value]) => <li key={key}>{key} · latest {value.latest} · minimum {value.minimum}{value.mandatory ? " · forced" : ""}</li>)}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Cancel reasons</h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
            {db.cancelLists.driverBefore.slice(0, 4).map((reason) => (
              <li key={reason.code} className="flex justify-between gap-2"><span>{reason.title}</span><Button variant="ghost" className="h-9" disabled={!can("settings.edit")} onClick={() => void run((data, who) => toggleCancelReason(data, who, { list: "driverBefore", code: reason.code }))}>{reason.on ? "On" : "Off"}</Button></li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Demo tools</h3>
          <p className="mt-2 text-sm text-muted">Reset clears local changes. Simulate errors fails about 1 in 30 saves.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="danger" onClick={reset}>Reset demo data</Button>
            <Button variant="ghost" disabled={!can("settings.edit")} onClick={() => void run((data, who) => patchSettings(data, who, { simulateErrors: !data.settings.simulateErrors }))}>Simulate errors {db.settings.simulateErrors ? "on" : "off"}</Button>
          </div>
        </Panel>
      </div>
    </Guard>
  );
}
