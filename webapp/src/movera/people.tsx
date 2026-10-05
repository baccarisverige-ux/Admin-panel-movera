import { useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { addNote, assignOnboarding, blockRider, creditWallet, requestPrivacy, reviewBank, reviewDocument, saveVehicle, setAccountStatus, setBooster, setCategory, signOutRider } from "./actions";
import {
  canActivate,
  CATEGORIES,
  categoryName,
  DOC_DEFS,
  docDef,
  onboardingStage,
  personName,
  REJECT_REASONS,
  requiredDocs,
  tripFare,
  zoneName,
  type AccountStatus,
  type DocKey,
  type Driver,
} from "./domain";
import { formatSek, formatWhen, hoursAgo, maskAccount, maskPersonnummer, maskPhone, validateBank } from "./format";
import { DEMO_NOW } from "./domain";
import { scopedDrivers, scopedRiders, scopedTrips, useAdmin } from "./store";
import { A, Button, Confirm, controlClass, DataTable, Drawer, Field, Guard, HoldPreview, PageHead, Panel, PhonePreview, Select, StatusBadge, TextInput } from "./ui";

function useSearch() {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  return useMemo(() => new URLSearchParams(search), [search]);
}

function partnerName(id: string | null, partners: { id: string; name: string }[]) {
  return partners.find((item) => item.id === id)?.name ?? "Independent";
}

export function DriversScreen() {
  const { db, agent } = useAdmin();
  const navigate = useNavigate();
  const params = useSearch();
  const view = params.get("view");
  if (!db || !agent) return null;
  let rows = scopedDrivers(db, agent);
  if (view === "review") rows = rows.filter((driver) => db.documents.some((doc) => doc.driverId === driver.id && doc.status === "in_review"));
  if (view === "expiring") rows = rows.filter((driver) => db.documents.some((doc) => doc.driverId === driver.id && (doc.status === "expiring" || doc.status === "expired")));
  if (view === "hold") rows = rows.filter((driver) => driver.accountStatus === "on_hold");
  return (
    <Guard need="drivers.view">
      <PageHead title="Drivers" subtitle="One page per driver. Phone numbers stay masked until a sensitive reveal.">
        <A href="/drivers?view=review" className="rounded-full border border-line px-3 py-2 text-sm">Waiting for review</A>
        <A href="/drivers?view=expiring" className="rounded-full border border-line px-3 py-2 text-sm">Expiring soon</A>
        <A href="/drivers?view=hold" className="rounded-full border border-line px-3 py-2 text-sm">On hold</A>
      </PageHead>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No drivers in this view."
        search={(row) => `${personName(row)} ${row.id} ${row.phone} ${row.zoneId}`}
        onRow={(row) => {
          void navigate({ href: `/drivers/${row.id}` });
        }}
        columns={[
          { key: "name", header: "Driver", sort: (a, b) => personName(a).localeCompare(personName(b)), render: (row) => <span className="font-medium">{personName(row)} <span className="block text-xs text-muted">{row.id}</span></span> },
          { key: "phone", header: "Phone", render: (row) => maskPhone(row.phone) },
          { key: "zone", header: "Zone", render: (row) => zoneName(row.zoneId), sort: (a, b) => a.zoneId.localeCompare(b.zoneId) },
          { key: "status", header: "Account", sort: (a, b) => a.accountStatus.localeCompare(b.accountStatus), render: (row) => <StatusBadge status={row.accountStatus} /> },
          { key: "online", header: "Online", render: (row) => <StatusBadge status={row.onlineStatus} /> },
          { key: "rating", header: "Rating", sort: (a, b) => a.rating - b.rating, render: (row) => row.rating ? row.rating.toFixed(1) : "—" },
          { key: "docs", header: "Documents", render: (row) => `${requiredDocs(row, db.documents).filter((doc) => doc.status === "approved" || doc.status === "expiring").length} of ${requiredDocs(row, db.documents).length}` },
          { key: "fleet", header: "Fleet", render: (row) => partnerName(row.fleetPartnerId, db.partners) },
        ]}
      />
    </Guard>
  );
}

const TABS = ["Overview", "Documents", "Vehicles", "Categories", "Trips", "Earnings", "Bank", "Bonuses", "Ratings", "Support", "Safety", "Driving log", "Notes", "Activity"] as const;

export function DriverScreen({ id }: { id: string }) {
  const admin = useAdmin();
  const { db, agent, revealed, reveal, run, can } = admin;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const navigate = useNavigate();
  const [docId, setDocId] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<(typeof REJECT_REASONS)[number]>(REJECT_REASONS[0]);
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState("2028-06-01");
  const [nextStatus, setNextStatus] = useState<AccountStatus>("on_hold");
  const [holdReason, setHoldReason] = useState("");
  const [holdMessage, setHoldMessage] = useState("Your account is on hold until we review a document.");
  if (!db || !agent) return null;
  const driver = scopedDrivers(db, agent).find((item) => item.id === id);
  if (!driver) return <Panel><h2 className="font-semibold">Driver not in your scope</h2><A href="/drivers" className="text-sm underline">Back to drivers</A></Panel>;
  const docs = DOC_DEFS.map((def) => db.documents.find((doc) => doc.driverId === driver.id && doc.key === def.key)).filter((doc): doc is NonNullable<typeof doc> => !!doc);
  const vehicles = db.vehicles.filter((item) => item.driverId === driver.id);
  const trips = scopedTrips(db, agent).filter((trip) => trip.driverId === driver.id);
  const openDoc = docs.find((doc) => doc.id === docId) ?? null;
  const openDef = openDoc ? docDef(openDoc.key) : null;
  const openNote = openDef && "note" in openDef ? openDef.note : null;
  const ring = driver.accountStatus === "active" ? "border-paper ring-ink" : driver.accountStatus === "suspended" ? "border-bad" : "border-warn";
  const showSensitive = revealed.includes(driver.id);

  return (
    <Guard need="drivers.view">
      <A href="/drivers" className="text-sm text-muted">Drivers</A>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`grid size-14 place-items-center rounded-full border-4 bg-ink text-paper ${ring}`}>{driver.firstName.slice(0, 1)}{driver.lastName.slice(0, 1)}</div>
          <div>
            <h2 className="text-xl font-semibold">{personName(driver)}</h2>
            <p className="text-sm text-muted">{driver.id} · {partnerName(driver.fleetPartnerId, db.partners)}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <StatusBadge status={driver.accountStatus} />
              <StatusBadge status={driver.onlineStatus} />
              <span className="text-xs text-muted">{driver.rating ? `${driver.rating.toFixed(1)} rating` : "No rating yet"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("drivers.setStatus") ? <Button onClick={() => setStatusOpen(true)}>Change status</Button> : null}
          {can("messages.send") ? <A href={`/messages?to=${encodeURIComponent(personName(driver))}`} className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm">Send message</A> : null}
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((item) => (
          <button key={item} className={`h-10 shrink-0 rounded-full px-3 text-sm ${tab === item ? "bg-ink text-paper" : "border border-line bg-paper"}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === "Overview" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Panel><p className="text-xs text-muted">Acceptance</p><p className="text-2xl font-semibold tabular-nums">{driver.acceptance}%</p></Panel>
          <Panel><p className="text-xs text-muted">Cancellation</p><p className="text-2xl font-semibold tabular-nums">{driver.cancellation}%</p></Panel>
          <Panel><p className="text-xs text-muted">Online this week</p><p className="text-2xl font-semibold tabular-nums">{driver.hours.reduce((sum, hours) => sum + hours, 0)} h</p></Panel>
          <Panel className="md:col-span-3">
            <h3 className="font-semibold">Last trips</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {trips.slice(0, 5).map((trip) => (
                <li key={trip.id}><A href={`/trips/${trip.id}`} className="underline-offset-2 hover:underline">{trip.id}</A> · <StatusBadge status={trip.status} /> · {formatSek(tripFare(trip))}</li>
              ))}
              {trips.length === 0 ? <li className="text-muted">No trips yet.</li> : null}
            </ul>
          </Panel>
        </div>
      ) : null}
      {tab === "Documents" ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          {docs.map((doc) => (
            <button key={doc.id} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0" onClick={() => doc.status !== "not_required" && setDocId(doc.id)}>
              <span>
                <span className="block text-sm font-medium">{docDef(doc.key).name}</span>
                <span className="text-xs text-muted">{docDef(doc.key).section}{doc.expiresAt ? ` · expires ${doc.expiresAt}` : ""}</span>
              </span>
              <StatusBadge status={doc.status} />
            </button>
          ))}
        </div>
      ) : null}
      {tab === "Vehicles" ? <Vehicles driver={driver} /> : null}
      {tab === "Categories" ? (
        <Panel>
          <ul className="space-y-3">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-2">
                <span><span className="font-medium">{category.name}</span><span className="block text-xs text-muted">{category.line}{driver.categoryReasons[category.id] ? ` · ${driver.categoryReasons[category.id]}` : ""}</span></span>
                <Button variant="ghost" disabled={!can("drivers.setStatus")} onClick={() => {
                  const on = !driver.categories[category.id];
                  const why = on ? undefined : window.prompt("Reason for turning this off") ?? undefined;
                  if (!on && !why) return;
                  void run((data, who) => setCategory(data, who, { driverId: driver.id, category: category.id, on, reason: why }));
                }}>{driver.categories[category.id] ? "On" : "Off"}</Button>
              </li>
            ))}
            <li className="flex items-center justify-between">
              <span className="font-medium">Booster seat</span>
              <Button variant="ghost" disabled={!can("drivers.setStatus")} onClick={() => {
                const on = !driver.booster;
                const why = on ? undefined : window.prompt("Reason") ?? undefined;
                if (!on && !why) return;
                void run((data, who) => setBooster(data, who, { driverId: driver.id, on, reason: why }));
              }}>{driver.booster ? "On" : "Off"}</Button>
            </li>
          </ul>
        </Panel>
      ) : null}
      {tab === "Trips" ? (
        <DataTable
          rows={trips}
          rowKey={(row) => row.id}
          empty="No trips."
          onRow={(row) => void navigate({ href: `/trips/${row.id}` })}
          columns={[
            { key: "id", header: "Trip", render: (row) => row.id },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "when", header: "When", render: (row) => formatWhen(row.createdAt) },
            { key: "fare", header: "Fare", render: (row) => formatSek(tripFare(row)) },
          ]}
        />
      ) : null}
      {tab === "Earnings" ? (
        <DataTable
          rows={db.payouts.filter((row) => row.driverId === driver.id)}
          rowKey={(row) => row.id}
          empty="No payouts yet."
          columns={[
            { key: "period", header: "Period", render: (row) => row.period },
            { key: "gross", header: "Gross", render: (row) => formatSek(row.gross) },
            { key: "net", header: "Net", render: (row) => formatSek(row.net) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      ) : null}
      {tab === "Bank" ? (
        <Panel>
          <StatusBadge status={driver.bank.status} />
          <p className="mt-3 text-sm">{driver.bank.bankName} · {driver.bank.kind === "se" ? "Sweden" : "IBAN"}</p>
          <p className="mt-1 font-mono text-sm">
            {driver.bank.kind === "se"
              ? showSensitive ? `${driver.bank.clearing} ${driver.bank.account}` : maskAccount(driver.bank.account ?? "")
              : showSensitive ? driver.bank.iban : maskAccount(driver.bank.iban ?? "")}
          </p>
          {validateBank(driver.bank) ? <p className="mt-2 text-sm text-bad">{validateBank(driver.bank)}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {can("drivers.viewSensitive") && !showSensitive ? <Button variant="ghost" onClick={() => void reveal(driver.id)}>Reveal</Button> : null}
            {can("bank.review") ? (
              <>
                <Button onClick={() => void run((data, who) => reviewBank(data, who, { driverId: driver.id, decision: "approved" }))}>Approve</Button>
                <Button variant="danger" onClick={() => {
                  const why = window.prompt("Reason to ask for a correction");
                  if (!why) return;
                  void run((data, who) => reviewBank(data, who, { driverId: driver.id, decision: "rejected", reason: why }));
                }}>Ask to correct</Button>
              </>
            ) : null}
          </div>
        </Panel>
      ) : null}
      {tab === "Bonuses" ? (
        <Panel>
          <ul className="space-y-2 text-sm">
            {db.bonuses.map((bonus) => <li key={bonus.code}><span className="font-medium">{bonus.code}</span> {bonus.title} · {formatSek(bonus.rewardOre)}<span className="block text-muted">{bonus.rule}</span></li>)}
          </ul>
        </Panel>
      ) : null}
      {tab === "Ratings" ? (
        <ul className="space-y-2 text-sm">
          {trips.filter((trip) => typeof trip.rating === "number").slice(0, 12).map((trip) => <li key={trip.id} className="rounded-xl border border-line bg-paper px-3 py-2">{trip.id} · {trip.rating} / 5{trip.reviewHidden ? " · hidden" : ""}</li>)}
        </ul>
      ) : null}
      {tab === "Support" ? (
        <div className="space-y-2 text-sm">
          {db.tickets.filter((ticket) => ticket.personId === driver.id).map((ticket) => <A key={ticket.id} href={`/support/${ticket.id}`} className="block underline-offset-2 hover:underline">{ticket.subject}</A>)}
          {db.tickets.every((ticket) => ticket.personId !== driver.id) ? <Panel>No support thread for this driver.</Panel> : null}
        </div>
      ) : null}
      {tab === "Safety" ? (
        <Panel>
          <p className="text-sm">Emergency contact {driver.emergencyName} · {maskPhone(driver.emergencyPhone)}</p>
        </Panel>
      ) : null}
      {tab === "Driving log" ? (
        <Panel>
          <p className="text-sm text-muted">Hours online, Mon–Sun. Limit {db.settings.driving.maxHoursWeek} h / week.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <li key={day} className="rounded-xl border border-line px-3 py-2">{day}<span className="block text-lg font-semibold tabular-nums">{driver.hours[index]} h</span></li>
            ))}
          </ul>
          {driver.hours.reduce((sum, hours) => sum + hours, 0) > db.settings.driving.maxHoursWeek ? <p className="mt-3 text-sm text-bad">Over the weekly limit.</p> : <p className="mt-3 text-sm text-good">Within the weekly limit.</p>}
        </Panel>
      ) : null}
      {tab === "Notes" ? (
        <Panel>
          <form onSubmit={(event) => { event.preventDefault(); void run((data, who) => addNote(data, who, { targetType: "driver", targetId: driver.id, text: note })); setNote(""); }}>
            <Field label="Internal note">
              <textarea className={`${controlClass} min-h-20 py-2`} value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
            <Button className="mt-2" type="submit">Save note</Button>
          </form>
          <ul className="mt-4 space-y-3 text-sm">
            {db.notes.filter((item) => item.targetType === "driver" && item.targetId === driver.id).map((item) => (
              <li key={item.id}><span className="font-medium">{db.agents.find((person) => person.id === item.authorId)?.name}</span> · {formatWhen(item.at)}<span className="block text-muted">{item.text}</span></li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {tab === "Activity" ? (
        <ul className="space-y-2 text-sm">
          {db.audit.filter((item) => item.target.includes(driver.id) || docs.some((doc) => item.target === doc.id)).map((item) => (
            <li key={item.id} className="rounded-xl border border-line bg-paper px-3 py-2">{formatWhen(item.at)} · {item.action} {item.reason ? `· ${item.reason}` : ""}</li>
          ))}
        </ul>
      ) : null}
      {openDoc ? (
        <Drawer title={docDef(openDoc.key).name} onClose={() => setDocId(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentSheet driver={driver} docKey={openDoc.key} />
            <div>
              <StatusBadge status={openDoc.status} />
              <p className="mt-2 text-sm text-muted">{personName(driver)} · uploaded {openDoc.uploadedAt ? formatWhen(openDoc.uploadedAt) : "not yet"}</p>
              {openNote ? <p className="mt-2 text-sm">{openNote}</p> : null}
              <Field label="Expiry">
                <TextInput type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
              </Field>
              <div className="mt-3">
                <Field label="Reject reason">
                  <Select value={reason} onChange={(event) => setReason(event.target.value as (typeof REJECT_REASONS)[number])}>
                    {REJECT_REASONS.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Message to the driver">
                  <textarea className={`${controlClass} min-h-20 py-2`} value={message} onChange={(event) => setMessage(event.target.value)} />
                </Field>
              </div>
              <div className="mt-3 flex gap-2">
                <Button disabled={!can("documents.review")} onClick={() => void run((data, who) => reviewDocument(data, who, { docId: openDoc.id, decision: "approved", expiresAt: expiry, message }))}>Approve</Button>
                <Button variant="danger" disabled={!can("documents.review")} onClick={() => void run((data, who) => reviewDocument(data, who, { docId: openDoc.id, decision: "rejected", reason, message }))}>Reject</Button>
              </div>
              <p className="mt-2 text-xs text-muted">Keys: A approve, R reject, J/K next document.</p>
              <div className="mt-4"><PhonePreview kicker="Driver app" title={openDoc.status === "rejected" ? "Document needed" : "Document in review"} body={message || "The driver sees the status, not your internal note."} /></div>
            </div>
          </div>
          <DocKeys docs={docs.map((doc) => doc.id)} current={openDoc.id} onPick={setDocId} onApprove={() => void run((data, who) => reviewDocument(data, who, { docId: openDoc.id, decision: "approved", expiresAt: expiry, message }))} onReject={() => void run((data, who) => reviewDocument(data, who, { docId: openDoc.id, decision: "rejected", reason, message }))} />
        </Drawer>
      ) : null}
      {statusOpen ? (
        <Confirm
          title="Change account status"
          body="The driver sees the message. This stays in the demo log."
          confirmLabel="Save status"
          requireReason
          reasonLabel="Internal reason"
          extra={
            <div className="mt-3 space-y-3">
              <Field label="Status">
                <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as AccountStatus)}>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </Field>
              <Field label="Message the driver will see">
                <textarea className={`${controlClass} min-h-16 py-2`} value={holdMessage} onChange={(event) => setHoldMessage(event.target.value)} />
              </Field>
              <HoldPreview message={holdMessage} />
            </div>
          }
          onClose={() => setStatusOpen(false)}
          onConfirm={(why) => {
            setHoldReason(why);
            void run((data, who) => setAccountStatus(data, who, { driverId: driver.id, status: nextStatus, reason: why, message: holdMessage }));
            setStatusOpen(false);
          }}
        />
      ) : null}
      <span className="sr-only">{holdReason}{showSensitive ? maskPersonnummer(driver.personnummer) : ""}{hoursAgo(DEMO_NOW, driver.joined)}</span>
    </Guard>
  );
}

function DocKeys({ docs, current, onPick, onApprove, onReject }: { docs: string[]; current: string; onPick: (id: string) => void; onApprove: () => void; onReject: () => void }) {
  const index = docs.indexOf(current);
  return (
    <KeyTrap
      onA={onApprove}
      onR={onReject}
      onJ={() => docs[index + 1] && onPick(docs[index + 1]!)}
      onK={() => docs[index - 1] && onPick(docs[index - 1]!)}
    />
  );
}

function KeyTrap({ onA, onR, onJ, onK }: { onA: () => void; onR: () => void; onJ: () => void; onK: () => void }) {
  return (
    <div
      tabIndex={0}
      className="sr-only"
      autoFocus
      onKeyDown={(event) => {
        const key = event.key.toLowerCase();
        if (key === "a") onA();
        if (key === "r") onR();
        if (key === "j") onJ();
        if (key === "k") onK();
      }}
    />
  );
}

function DocumentSheet({ driver, docKey }: { driver: Driver; docKey: DocKey }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-5">
      <p className="text-xs uppercase tracking-wide text-muted">Transportstyrelsen · facsimile</p>
      <h3 className="mt-4 text-lg font-semibold">{docDef(docKey).name}</h3>
      <p className="mt-6 text-sm">{personName(driver)}</p>
      <p className="text-sm text-muted">{driver.personnummer}</p>
      <p className="mt-6 text-xs text-muted">Demo document. No real identity file is stored.</p>
    </div>
  );
}

function Vehicles({ driver }: { driver: Driver }) {
  const { db, run, can } = useAdmin();
  const vehicle = db?.vehicles.find((item) => item.driverId === driver.id);
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [year, setYear] = useState(vehicle?.year ?? 2020);
  const [seats, setSeats] = useState(vehicle?.seats ?? 4);
  const [status, setStatus] = useState(vehicle?.status ?? "active");
  if (!db || !vehicle) return null;
  const papers = db.documents.filter((doc) => doc.vehicleId === vehicle.id);
  return (
    <Panel>
      <h3 className="font-semibold">{vehicle.make} {vehicle.model}</h3>
      <p className="text-sm text-muted">{vehicle.color}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Plate"><TextInput value={plate} onChange={(event) => setPlate(event.target.value)} /></Field>
        <Field label="Year"><TextInput type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} /></Field>
        <Field label="Seats"><TextInput type="number" value={seats} onChange={(event) => setSeats(Number(event.target.value))} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </Select>
        </Field>
      </div>
      <Button className="mt-3" disabled={!can("vehicles.review")} onClick={() => void run((data, who) => saveVehicle(data, who, { vehicleId: vehicle.id, plate, year, seats, status }))}>Save vehicle</Button>
      <ul className="mt-4 space-y-2 text-sm">
        {papers.map((doc) => <li key={doc.id} className="flex justify-between"><span>{docDef(doc.key).name}</span><StatusBadge status={doc.status} /></li>)}
      </ul>
    </Panel>
  );
}

export function OnboardingScreen() {
  const { db, agent, run, can } = useAdmin();
  const params = useSearch();
  const [stage, setStage] = useState(params.get("stage") ?? "docs");
  if (!db || !agent) return null;
  const rows = scopedDrivers(db, agent).filter((driver) => onboardingStage(driver, db.documents) === stage || (stage === "activated" && driver.accountStatus === "active"));
  const counts = ["new", "docs", "vehicle", "ready", "activated"].map((id) => ({
    id,
    n: scopedDrivers(db, agent).filter((driver) => (onboardingStage(driver, db.documents) ?? (driver.accountStatus === "active" ? "activated" : "")) === id).length,
  }));
  return (
    <Guard need="documents.review">
      <PageHead title="Onboarding" subtitle="Claim a driver, review papers, then a manager activates them." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {counts.map((item) => (
          <button key={item.id} className={`h-11 shrink-0 rounded-full px-3 text-sm capitalize ${stage === item.id ? "bg-ink text-paper" : "border border-line bg-paper"}`} onClick={() => setStage(item.id)}>{item.id} · {item.n}</button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.slice(0, 40).map((driver) => {
          const wait = hoursAgo(DEMO_NOW, driver.joined);
          const sla = wait < 12 ? "good" : wait < 24 ? "warn" : "bad";
          return (
            <div key={driver.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-4 py-3">
              <div>
                <A href={`/drivers/${driver.id}`} className="font-medium underline-offset-2 hover:underline">{personName(driver)}</A>
                <p className="text-xs text-muted">{driver.id} · waiting {Math.round(wait)} h · {db.agents.find((item) => item.id === driver.assigneeId)?.name ?? "Unassigned"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sla === "good" ? "approved" : sla === "warn" ? "pending" : "rejected"} label={sla === "good" ? "Under 12 h" : sla === "warn" ? "12–24 h" : "Over 24 h"} />
                <Button variant="ghost" onClick={() => void run((data, who) => assignOnboarding(data, who, driver.id))}>Claim</Button>
                {can("drivers.setStatus") ? <Button disabled={!canActivate(driver, db.documents)} onClick={() => void run((data, who) => setAccountStatus(data, who, { driverId: driver.id, status: "active", reason: "All required documents approved", message: "Your account is active. You can go online." }))}>Activate</Button> : null}
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <Panel>Nothing in this stage.</Panel> : null}
      </div>
    </Guard>
  );
}

export function RidersScreen() {
  const { db, agent } = useAdmin();
  const navigate = useNavigate();
  if (!db || !agent) return null;
  const rows = scopedRiders(db, agent);
  return (
    <Guard need="riders.view">
      <PageHead title="Riders" subtitle="Find someone by name, phone or open their trips." />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No riders in your scope."
        search={(row) => `${personName(row)} ${row.id} ${row.phone}`}
        onRow={(row) => void navigate({ href: `/riders/${row.id}` })}
        columns={[
          { key: "name", header: "Rider", sort: (a, b) => personName(a).localeCompare(personName(b)), render: (row) => <span className="font-medium">{personName(row)}<span className="block text-xs text-muted">{row.id}</span></span> },
          { key: "phone", header: "Phone", render: (row) => maskPhone(row.phone) },
          { key: "sign", header: "Sign-in", render: (row) => row.signIn },
          { key: "trips", header: "Trips", sort: (a, b) => a.trips - b.trips, render: (row) => row.trips },
          { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
    </Guard>
  );
}

export function RiderScreen({ id }: { id: string }) {
  const { db, agent, run, can } = useAdmin();
  if (!db || !agent) return null;
  const rider = scopedRiders(db, agent).find((item) => item.id === id);
  if (!rider) return <Panel>Rider not in your scope.</Panel>;
  const trips = db.trips.filter((trip) => trip.riderId === rider.id);
  const reservations = db.reservations.filter((item) => item.riderId === rider.id);
  return (
    <Guard need="riders.view">
      <A href="/riders" className="text-sm text-muted">Riders</A>
      <PageHead title={personName(rider)} subtitle={`${rider.id} · ${maskPhone(rider.phone)} · ${rider.signIn}`}>
        <StatusBadge status={rider.status} />
        {can("riders.block") ? (
          <Button variant={rider.status === "blocked" ? "primary" : "danger"} onClick={() => {
            const why = window.prompt("Reason");
            if (!why) return;
            void run((data, who) => blockRider(data, who, { riderId: rider.id, blocked: rider.status !== "blocked", reason: why }));
          }}>{rider.status === "blocked" ? "Unblock" : "Block"}</Button>
        ) : null}
        {can("riders.block") ? <Button variant="ghost" onClick={() => void run((data, who) => signOutRider(data, who, rider.id))}>Sign out devices</Button> : null}
        {can("riders.block") ? <Button variant="ghost" onClick={() => void run((data, who) => requestPrivacy(data, who, rider.id))}>{rider.privacy === "requested" ? "Mark privacy done" : "Privacy request"}</Button> : null}
      </PageHead>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Wallet</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatSek(rider.walletOre)}</p>
          <p className="text-sm text-muted">PIN {rider.pinOn ? "on" : "off"} · devices {rider.devicesSignedOut ? "signed out" : "active"} · privacy {rider.privacy ?? "none"}</p>
          {can("payouts.manage") ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {[10000, 20000, 50000].map((ore) => <Button key={ore} variant="ghost" onClick={() => void run((data, who) => creditWallet(data, who, { riderId: rider.id, ore }))}>{formatSek(ore)}</Button>)}
            </div>
          ) : null}
        </Panel>
        <Panel>
          <h3 className="font-semibold">Saved places</h3>
          <ul className="mt-2 text-sm">{rider.places.map((place) => <li key={place.name}>{place.name} · {place.address}</li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Reservations</h3>
          <ul className="mt-2 text-sm">{reservations.map((item) => <li key={item.id}>{item.id} · <StatusBadge status={item.status} /></li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Payments</h3>
          <ul className="mt-2 space-y-1 text-sm">{trips.slice(0, 6).map((trip) => <li key={trip.id}>{trip.id} · {trip.paymentStatus} · {formatSek(tripFare(trip))}</li>)}</ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Support and safety</h3>
          <ul className="mt-2 text-sm">{db.tickets.filter((ticket) => ticket.personId === rider.id).map((ticket) => <li key={ticket.id}><A href={`/support/${ticket.id}`}>{ticket.subject}</A></li>)}</ul>
          <p className="mt-2 text-sm text-muted">Safety notes stay masked. PIN is {rider.pinOn ? "required" : "off"} and is never shown.</p>
        </Panel>
      </div>
    </Guard>
  );
}

export function FleetScreen() {
  const { db, agent } = useAdmin();
  if (!db || !agent) return null;
  const partners = agent.fleetPartnerId ? db.partners.filter((item) => item.id === agent.fleetPartnerId) : db.partners;
  return (
    <Guard need="drivers.view">
      <PageHead title="Fleet partners" subtitle="A partner only sees their own drivers." />
      <div className="grid gap-3 md:grid-cols-2">
        {partners.map((partner) => {
          const drivers = scopedDrivers(db, agent).filter((driver) => driver.fleetPartnerId === partner.id);
          return (
            <Panel key={partner.id}>
              <h3 className="font-semibold">{partner.name}</h3>
              <p className="text-sm text-muted">{partner.orgNo} · {partner.zoneId}</p>
              <p className="mt-2 text-sm">{drivers.length} drivers in your scope</p>
              <ul className="mt-2 text-sm">{drivers.slice(0, 6).map((driver) => <li key={driver.id}><A href={`/drivers/${driver.id}`} className="underline-offset-2 hover:underline">{personName(driver)}</A></li>)}</ul>
            </Panel>
          );
        })}
      </div>
    </Guard>
  );
}
