import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CalendarDays, Flame, MapPin, Pencil, Plus, Radar, Target, Trash2, Users } from "lucide-react";
import { BonusAreaMap } from "../drivers/BonusAreaMap";
import type { Market } from "../markets/markets";
import { CommandButton } from "../ui/CommandButton";
import { Choice, Num, Switch } from "./fields";
import { giveBonusPrefill } from "./prefill";
import { DISPATCH_KEY, modeLabel, type DispatchBook, type DispatchEvent, type DriverGroup } from "./rules";

type Props = {
  book: DispatchBook;
  market: Market;
  drivers: { id: string; name: string; zoneName: string }[];
  canEdit: boolean;
  canBonus: boolean;
  onNotice: (text: string) => void;
};

function eventState(event: DispatchEvent, now: number): "on" | "soon" | "done" | "off" {
  if (!event.on) return "off";
  const from = Date.parse(event.from);
  const until = Date.parse(event.until);
  if (until < now) return "done";
  if (from <= now) return "on";
  return "soon";
}

const STATE_TEXT = { on: "Running now", soon: "Coming", done: "Done", off: "Off" } as const;

function blankEvent(country: Market["id"], id: string): DispatchEvent {
  const day = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return { id, country, name: "", ring: [], from: `${day}T20:00`, until: `${day}T23:30`, on: true, mode: "radar", radarDrivers: 10, pickupNote: "", driverMessage: "" };
}

export function EventsView({ book, market, drivers, canEdit, canBonus, onNotice }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<DispatchEvent | null>(null);
  const [group, setGroup] = useState<DriverGroup | null>(null);
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now());
  const events = book.events.filter((event) => event.country === market.id);
  const groups = book.groups.filter((item) => item.country === market.id);

  if (editing) {
    const exists = book.events.some((event) => event.id === editing.id);
    const error = !editing.name.trim() ? "Give the event a name." : editing.ring.length < 3 ? "Draw the event area on the map." : !(Date.parse(editing.until) > Date.parse(editing.from)) ? "The end must be after the start." : null;
    const next: DispatchBook = { ...book, draftRev: book.draftRev + 1, events: exists ? book.events.map((event) => (event.id === editing.id ? editing : event)) : [...book.events, editing] };
    return (
      <section className="dash-card dx-event-edit" aria-label="Event">
        <div className="card-head">
          <button data-command="admin.dispatch.view" type="button" className="dash-btn small ghost" onClick={() => setEditing(null)}><ArrowLeft size={14} aria-hidden="true" /> Back to events</button>
          <h3>{exists ? `Change ${editing.name}` : "New event"}</h3>
        </div>
        <div className="dx-event-grid">
          <div className="dx-event-fields">
            <label className="field">Event name<input aria-label="Event name" maxLength={60} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="For example Football final" /></label>
            <div className="dx-modal-row">
              <label className="field">Starts<input type="datetime-local" aria-label="Event starts" value={editing.from} onChange={(event) => setEditing({ ...editing, from: event.target.value })} /></label>
              <label className="field">Ends<input type="datetime-local" aria-label="Event ends" value={editing.until} onChange={(event) => setEditing({ ...editing, until: event.target.value })} /></label>
            </div>
            <div className="field">Dispatch in the area<Choice label="Event mode" value={editing.mode} onChange={(mode) => setEditing({ ...editing, mode })} options={[{ id: "radar", label: "Radar" }, { id: "exclusive", label: "Exclusive" }]} /></div>
            {editing.mode === "radar" ? <label className="field">Drivers who see each request<Num label="Event radar drivers" value={editing.radarDrivers} unit="drivers" min={1} max={30} onChange={(radarDrivers) => setEditing({ ...editing, radarDrivers })} /></label> : null}
            <label className="field">Pickup point for riders<input aria-label="Event pickup note" maxLength={100} value={editing.pickupNote} onChange={(event) => setEditing({ ...editing, pickupNote: event.target.value })} placeholder="For example North gate, lane P2" /></label>
            <label className="field">Message to drivers before the event<textarea aria-label="Event driver message" rows={2} maxLength={140} value={editing.driverMessage} onChange={(event) => setEditing({ ...editing, driverMessage: event.target.value })} placeholder="For example Concert ends at 22:30. Wait at the north gate." /></label>
            <div className="dx-row"><span className="dx-row-text"><b>Event is on</b></span><Switch label="Event" on={editing.on} onChange={(on) => setEditing({ ...editing, on })} /></div>
            {error ? <p className="dx-issues" role="alert">{error}</p> : null}
            <div className="dx-modal-actions">
              <CommandButton command="admin.dispatch.event" className="dash-btn" targetId={editing.name.trim() || "event"} confirmTarget={false} scope="all" before={exists ? "event" : "none"} after={editing.on ? "on" : "off"} expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={next} disabled={!canEdit || Boolean(error)} onDone={() => { onNotice(`Event ${editing.name} saved.`); setEditing(null); }}>
                Save event
              </CommandButton>
              <button data-command="admin.dispatch.view" type="button" className="dash-btn ghost" disabled={!canBonus || editing.ring.length < 3} title="Opens the driver bonus builder with the same area and time" onClick={() => {
                giveBonusPrefill({ name: editing.name || "Event bonus", ring: editing.ring, from: editing.from, until: editing.until, note: editing.driverMessage });
                navigate(`/drivers?view=bonuses&country=${market.id}&prefill=event`);
              }}><Flame size={14} aria-hidden="true" /> Also make a driver bonus</button>
            </div>
          </div>
          <div className="dx-event-map">
            <BonusAreaMap country={market.id} areas={editing.ring.length ? [{ id: "event", name: editing.name || "Event area", ring: editing.ring }] : []} onChange={(areas) => setEditing({ ...editing, ring: areas[areas.length - 1]?.ring ?? [] })} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="dx-events">
      <section className="dash-card" aria-labelledby="dx-events-title">
        <div className="card-head">
          <h3 id="dx-events-title"><CalendarDays size={16} aria-hidden="true" /> Events in {market.name}</h3>
          <button data-command="admin.dispatch.edit" type="button" className="dash-btn small" disabled={!canEdit} onClick={() => setEditing(blankEvent(market.id, `EV-${Date.now().toString(36)}`))}><Plus size={14} aria-hidden="true" /> New event</button>
        </div>
        <p className="dx-modal-help">A concert or a match: draw the area and set the time. During the event, these dispatch rules apply in that area.</p>
        {events.length === 0 ? <p className="dx-calm">No event yet in {market.name}.</p> : (
          <ul className="dx-event-list" aria-label="Events">
            {events.map((event) => {
              const state = eventState(event, now);
              const toggled: DispatchBook = { ...book, draftRev: book.draftRev + 1, events: book.events.map((item) => (item.id === event.id ? { ...item, on: !item.on } : item)) };
              const removed: DispatchBook = { ...book, draftRev: book.draftRev + 1, events: book.events.filter((item) => item.id !== event.id) };
              return (
                <li key={event.id} className={`dx-event ${state}`}>
                  <span className="dx-event-icon" aria-hidden="true">{event.mode === "radar" ? <Radar size={18} /> : <Target size={18} />}</span>
                  <span className="dx-event-main">
                    <b>{event.name}</b>
                    <small>{event.from.replace("T", " ")} – {event.until.slice(11)} · {modeLabel(event.mode)}{event.mode === "radar" ? `, ${event.radarDrivers} drivers` : ""}</small>
                    {event.pickupNote ? <small><MapPin size={11} aria-hidden="true" /> {event.pickupNote}</small> : null}
                    {event.driverMessage ? <small className="dx-quote">“{event.driverMessage}”</small> : null}
                  </span>
                  <span className={`dx-state ${state}`}>{STATE_TEXT[state]}</span>
                  <span className="dx-event-actions">
                    <CommandButton command="admin.dispatch.event" className={event.on ? "surge-toggle on" : "surge-toggle"} targetId={event.name} confirmTarget={false} scope="all" before={event.on ? "on" : "off"} after={event.on ? "off" : "on"} expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={toggled} disabled={!canEdit} aria-label={`${event.name} ${event.on ? "on" : "off"}`} onDone={() => onNotice(`Event ${event.name} switched ${event.on ? "off" : "on"}.`)}>
                      {event.on ? "On" : "Off"} <span className="switch" aria-hidden="true"><i /></span>
                    </CommandButton>
                    <button data-command="admin.dispatch.edit" type="button" className="dash-btn small ghost" disabled={!canEdit} onClick={() => setEditing(event)}><Pencil size={13} aria-hidden="true" /> Edit</button>
                    <CommandButton command="admin.dispatch.event" className="icon-ghost" targetId={event.name} confirmTarget={false} scope="all" before="event" after="removed" expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={removed} disabled={!canEdit} aria-label={`Remove ${event.name}`} onDone={() => onNotice(`Event ${event.name} removed.`)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </CommandButton>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="dash-card" aria-labelledby="dx-groups-title">
        <div className="card-head">
          <h3 id="dx-groups-title"><Users size={16} aria-hidden="true" /> Driver groups</h3>
          <button data-command="admin.dispatch.edit" type="button" className="dash-btn small" disabled={!canEdit} onClick={() => setGroup({ id: `G-${Date.now().toString(36)}`, country: market.id, name: "", driverIds: [] })}><Plus size={14} aria-hidden="true" /> New group</button>
        </div>
        <p className="dx-modal-help">Save drivers as a group, then send a waiting ride to the group or put it on the group's radar from Live.</p>
        {groups.length === 0 ? <p className="dx-calm">No group yet.</p> : (
          <ul className="dx-group-list" aria-label="Driver groups">
            {groups.map((item) => (
              <li key={item.id}>
                <span className="dx-avatar"><Users size={15} aria-hidden="true" /></span>
                <span><b>{item.name}</b><small>{item.driverIds.length} driver{item.driverIds.length === 1 ? "" : "s"}{item.driverIds.length ? `: ${item.driverIds.slice(0, 3).map((id) => drivers.find((row) => row.id === id)?.name ?? id).join(", ")}${item.driverIds.length > 3 ? "…" : ""}` : ""}</small></span>
                <button data-command="admin.dispatch.edit" type="button" className="dash-btn small ghost" disabled={!canEdit} onClick={() => setGroup(item)}><Pencil size={13} aria-hidden="true" /> Edit</button>
              </li>
            ))}
          </ul>
        )}
        {group ? (
          <div className="dx-group-edit" aria-label="Group">
            <label className="field">Group name<input aria-label="Group name" maxLength={40} value={group.name} onChange={(event) => setGroup({ ...group, name: event.target.value })} placeholder="For example Night drivers" /></label>
            <label className="field">Find drivers<input aria-label="Find drivers for the group" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or zone" /></label>
            <div className="dx-group-pick" role="group" aria-label="Drivers in the group">
              {drivers.filter((row) => !search.trim() || `${row.name} ${row.zoneName}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 40).map((row) => (
                <label key={row.id} className={group.driverIds.includes(row.id) ? "check-chip on" : "check-chip"}>
                  <input type="checkbox" checked={group.driverIds.includes(row.id)} onChange={() => setGroup({ ...group, driverIds: group.driverIds.includes(row.id) ? group.driverIds.filter((id) => id !== row.id) : [...group.driverIds, row.id] })} />{row.name} · {row.zoneName}
                </label>
              ))}
            </div>
            <div className="dx-modal-actions">
              <button data-command="admin.dispatch.view" type="button" className="dash-btn ghost" onClick={() => setGroup(null)}>Cancel</button>
              <CommandButton command="admin.dispatch.group" className="dash-btn" targetId={group.name.trim() || "group"} confirmTarget={false} scope="all" before="group" after={`${group.driverIds.length} drivers`} expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={{ ...book, draftRev: book.draftRev + 1, groups: book.groups.some((item) => item.id === group.id) ? book.groups.map((item) => (item.id === group.id ? { ...group, name: group.name.trim() } : item)) : [...book.groups, { ...group, name: group.name.trim() }] }} disabled={!canEdit || !group.name.trim()} onDone={() => { onNotice(`Group ${group.name.trim()} saved with ${group.driverIds.length} drivers.`); setGroup(null); }}>
                Save group
              </CommandButton>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
