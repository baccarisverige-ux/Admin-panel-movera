import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useAudit, useRecords, useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { DRIVER_DOCUMENTS, type DocStatus, type Vehicle } from "../drivers/gate";
import {
  driverActivationIssue,
  driverOps,
  emptyDriverOpsBook,
  requestDriverInfo,
  reviewDriverDocument,
  setAccountReason,
  setBankReview,
  setDriverCategory,
  setDriverNote,
  vehicleOps,
  type DriverOpsBook,
} from "../drivers/ops";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import { CommandButton } from "../ui/CommandButton";
import { SensitiveValue } from "../ui/SensitiveValue";
import { TabPanel, Tabs } from "../ui/Tabs";

const TABS = ["Overview", "Documents", "Vehicles", "Categories", "Trips", "Earnings", "Bank", "Bonuses", "Driving log", "Ratings", "Support", "Safety", "Notes", "Activity"];
const CATEGORIES: Vehicle["category"][] = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet"];

export function DriverDetailPage() {
  const { driverId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { agent } = useSession();
  const drivers = useRecords("drivers", null);
  const vehicles = useRecords("vehicles", null);
  const trips = useRecords("trips", null);
  const payouts = useRecords("payouts", null);
  const bonuses = useRecords("bonuses", null);
  const tickets = useRecords("tickets", null);
  const incidents = useRecords("incidents", null);
  const audit = useAudit();
  const store = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const tab = params.get("tab") ?? "overview";
  const [reviewNote, setReviewNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [notice, setNotice] = useState("");

  const driver = drivers.data?.find((item) => item.id === driverId);
  const cars = (vehicles.data ?? []).filter((item) => item.driverId === driverId);
  const jobs = (trips.data ?? []).filter((item) => item.driverId === driverId);
  const pay = (payouts.data ?? []).filter((item) => item.driverId === driverId);

  if (drivers.isLoading || vehicles.isLoading || store.loading) return <p className="state-line">Loading driver.</p>;
  if (!driver) {
    return (
      <div className="page-heading">
        <div>
          <h2>Driver not found</h2>
          <p>The driver is outside your active scope or does not exist.</p>
          <Link to="/drivers">Back to drivers</Link>
        </div>
      </div>
    );
  }
  if (agent?.scope.fleetPartnerId && driver.fleetId !== agent.scope.fleetPartnerId) {
    return (
      <div className="page-heading">
        <div>
          <h2>No access</h2>
          <p>This driver belongs to another fleet partner.</p>
          <Link to="/drivers">Back to drivers</Link>
        </div>
      </div>
    );
  }

  const driverSeed = { id: driver.id, name: driver.name, fleetId: driver.fleetId };
  const ops = driverOps(store.value, driverSeed);
  const carRecord = cars[0] ?? null;
  const car = carRecord ? vehicleOps(store.value, carRecord) : null;
  const activationIssue = driverActivationIssue(store.value, driverSeed, car);
  const relatedTickets = (tickets.data ?? []).filter((item) => item.name === driver.name);
  const relatedIncidents = (incidents.data ?? []).filter((item) => item.name === driver.name);
  const driverAudits = (audit.data ?? []).filter((item) => item.targetId === driver.id).slice(0, 20);

  const accountAction = (
    command: "admin.driver.activate" | "admin.driver.onHold" | "admin.driver.suspend" | "admin.driver.reactivate",
    status: "active" | "on_hold" | "suspended",
    label: string,
    disabled = false,
  ) => (
    <CommandButton
      command={command}
      className={status === "active" ? "primary-btn" : "secondary-btn"}
      type="button"
      targetId={driver.id}
      entityState={driver.status}
      scope={driver.zoneId}
      before={driver.status}
      after={status}
      collection="drivers"
      patch={{ status }}
      expectedSliceRev={store.value.draftRev}
      sliceKey="driverOps"
      value={setAccountReason(store.value, driverSeed, status, reviewNote || label, agent?.id ?? "")}
      disabled={disabled}
      title={disabled && status === "active" ? activationIssue ?? undefined : undefined}
      onDone={() => {
        setNotice(`Driver account is now ${status}.`);
        setReviewNote("");
      }}
    >
      {label}
    </CommandButton>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{driver.name}</h2>
          <p>
            {driver.id} · {statusLabel(driver.status)} · <SensitiveValue value={driver.phone} permission="drivers.viewSensitive" command="admin.driver.revealSensitive" targetId={driver.id} label="Phone" /> · {driver.zoneId}
            {driver.fleetId ? ` · Fleet ${driver.fleetId}` : " · Independent"}
          </p>
        </div>
        <Link to="/drivers">Back to drivers</Link>
      </div>

      <p className="state-line">{notice} {store.message}</p>

      <Tabs
        tabs={TABS}
        activeId={tab}
        onChange={(id) => {
          const next = new URLSearchParams(params);
          next.set("tab", id);
          setParams(next);
        }}
      />
      <article className="panel">
        <TabPanel id="overview" activeId={tab}>
          <p>
            Account {statusLabel(driver.status)}. Bank {ops.bank.status}. Documents approved {
              DRIVER_DOCUMENTS.filter((id) => ["approved", "expiring"].includes(ops.documents[id].status)).length
            }/{DRIVER_DOCUMENTS.length}. Linked vehicles {cars.length}.
          </p>
          <p className="state-line">{activationIssue ? `Activation check: ${activationIssue}` : "Activation check passed."}</p>
          <label>
            Account action note
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Reason kept in driver activity" />
          </label>
          <div className="actions">
            {accountAction("admin.driver.activate", "active", "Activate", Boolean(activationIssue) || driver.status === "active")}
            {accountAction("admin.driver.onHold", "on_hold", "Put on hold", driver.status === "on_hold" || driver.status === "suspended")}
            {accountAction("admin.driver.suspend", "suspended", "Suspend", driver.status !== "active" && driver.status !== "on_hold")}
            {accountAction("admin.driver.reactivate", "active", "Reactivate", Boolean(activationIssue) || (driver.status !== "suspended" && driver.status !== "on_hold"))}
          </div>
          {ops.accountReason ? <p className="state-line">Latest account reason: {ops.accountReason}</p> : null}
        </TabPanel>

        <TabPanel id="documents" activeId={tab}>
          <label>
            Review note
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Rejection or request-information note" />
          </label>
          <ul className="version-list" aria-label="Driver documents">
            {DRIVER_DOCUMENTS.map((id) => {
              const doc = ops.documents[id];
              const exempt = Boolean(driver.fleetId && id === "company_registration");
              return (
                <li key={id}>
                  <span>{id} · latest review {doc.status}</span> · <strong>{id.replaceAll("_", " ")}</strong> · {exempt ? "fleet exempt" : doc.status} · {doc.fileType} {doc.fileName}
                  {doc.expiresAt ? ` · expires ${doc.expiresAt}` : ""}
                  {doc.reviewerId ? ` · reviewed by ${doc.reviewerId}` : ""}
                  {doc.note ? ` · ${doc.note}` : ""}
                  {!exempt ? (
                    <span>
                      {(["approved", "rejected", "in_review"] as DocStatus[]).map((status) => (
                        <CommandButton
                          command="admin.driver.review"
                          key={status}
                          className="link-action"
                          type="button"
                          targetId={driver.id}
                          confirmTarget={false}
                          scope={driver.zoneId}
                          before={doc.status}
                          after={status}
                          expectedSliceRev={store.value.draftRev}
                          sliceKey="driverOps"
                          value={reviewDriverDocument(store.value, driverSeed, id, status, agent?.id ?? "", reviewNote)}
                          onDone={() => setNotice(`${id} marked ${status}.`)}
                        >
                          {status}
                        </CommandButton>
                      ))}
                      <CommandButton
                        command="admin.driver.requestInfo"
                        className="link-action"
                        type="button"
                        targetId={driver.id}
                        confirmTarget={false}
                        scope={driver.zoneId}
                        before={doc.status}
                        after="needed"
                        expectedSliceRev={store.value.draftRev}
                        sliceKey="driverOps"
                        value={requestDriverInfo(store.value, driverSeed, id, agent?.id ?? "", reviewNote)}
                        onDone={() => setNotice(`Requested more information for ${id}.`)}
                      >
                        request info
                      </CommandButton>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </TabPanel>

        <TabPanel id="vehicles" activeId={tab}>
          {cars.length === 0 ? (
            <p>No vehicle linked. Activation remains blocked.</p>
          ) : cars.map((record) => {
            const profile = vehicleOps(store.value, record);
            return (
              <p key={record.id}>
                <Link to={`/vehicles/${record.id}`}>{record.plate ?? record.id}</Link> · {record.make ?? "Vehicle"} {record.model ?? ""} · {profile.year} · {profile.category} · {profile.fuel} · {record.status}
              </p>
            );
          })}
        </TabPanel>

        <TabPanel id="categories" activeId={tab}>
          <p>Category eligibility can be enabled or disabled independently from the linked vehicle rule checks.</p>
          <div className="actions">
            {CATEGORIES.map((category) => {
              const enabled = ops.categories[category];
              return (
                <CommandButton
                  command="admin.driver.category"
                  key={category}
                  className={enabled ? "primary-btn" : "secondary-btn"}
                  type="button"
                  targetId={driver.id}
                  confirmTarget={false}
                  scope={driver.zoneId}
                  before={enabled ? "enabled" : "disabled"}
                  after={enabled ? "disabled" : "enabled"}
                  expectedSliceRev={store.value.draftRev}
                  sliceKey="driverOps"
                  value={setDriverCategory(store.value, driverSeed, category, !enabled, agent?.id ?? "")}
                  onDone={() => setNotice(`${category} eligibility ${enabled ? "disabled" : "enabled"}.`)}
                >
                  {category}: {enabled ? "eligible" : "off"}
                </CommandButton>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel id="trips" activeId={tab}>
          <p>{jobs.length} trips on this driver.</p>
          <ul>
            {jobs.slice(0, 12).map((trip) => <li key={trip.id}><Link to={`/trips/${trip.id}`}>{trip.id}</Link> · {statusLabel(trip.status)} · {formatOre(trip.fareOre ?? 0)}</li>)}
          </ul>
        </TabPanel>

        <TabPanel id="earnings" activeId={tab}>
          <p>{pay.length === 0 ? "No payout stored for this driver." : pay.map((item) => `${item.name} ${formatOre(item.fareOre ?? 0)} ${item.status}`).join(". ")}</p>
        </TabPanel>

        <TabPanel id="bank" activeId={tab}>
          <p>Account holder {ops.bank.holder}. Account •••• {ops.bank.last4}. State {ops.bank.status}. Full account numbers are not exposed.</p>
          {ops.bank.note ? <p className="state-line">Review note: {ops.bank.note}</p> : null}
          <label>
            Bank review note
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </label>
          <div className="actions">
            {(["approved", "rejected", "in_review"] as const).map((status) => (
              <CommandButton
                command="admin.driver.bankReview"
                key={status}
                className="secondary-btn"
                type="button"
                targetId={driver.id}
                confirmTarget={false}
                scope={driver.zoneId}
                before={ops.bank.status}
                after={status}
                expectedSliceRev={store.value.draftRev}
                sliceKey="driverOps"
                value={setBankReview(store.value, driverSeed, status, agent?.id ?? "", reviewNote)}
                onDone={() => setNotice(`Bank details marked ${status}.`)}
              >
                {status}
              </CommandButton>
            ))}
          </div>
        </TabPanel>

        <TabPanel id="bonuses" activeId={tab}>
          {(bonuses.data ?? []).length === 0 ? <p>No active bonus definitions.</p> : (
            <ul>{(bonuses.data ?? []).map((bonus) => <li key={bonus.id}>{bonus.id} · {bonus.name} · {bonus.status}</li>)}</ul>
          )}
        </TabPanel>

        <TabPanel id="driving-log" activeId={tab}>
          <p>Today {ops.driving.todayMinutes} min. This week {ops.driving.weekMinutes} min. Last recorded break {ops.driving.lastBreakAt}.</p>
          <p className="state-line">These are simulation values for the frontend workflow; enforcement remains a backend/app responsibility.</p>
        </TabPanel>

        <TabPanel id="ratings" activeId={tab}>
          <p>{ops.ratings.stars.toFixed(2)} stars. Acceptance {ops.ratings.acceptancePct}%. Cancellation {ops.ratings.cancellationPct}% over {ops.ratings.requests} requests.</p>
        </TabPanel>

        <TabPanel id="support" activeId={tab}>
          {relatedTickets.length === 0 ? <p>No support ticket linked by this demo identity.</p> : (
            <ul>{relatedTickets.map((ticket) => <li key={ticket.id}><Link to={`/tickets/${ticket.id}`}>{ticket.id}</Link> · {ticket.status}</li>)}</ul>
          )}
          <Link to="/support">Open support queue</Link>
        </TabPanel>

        <TabPanel id="safety" activeId={tab}>
          <p>PIN and secret safety data are never displayed here.</p>
          {relatedIncidents.length === 0 ? <p>No incident linked by this demo identity.</p> : (
            <ul>{relatedIncidents.map((incident) => <li key={incident.id}><Link to={`/incidents/${incident.id}`}>{incident.id}</Link> · {incident.status}</li>)}</ul>
          )}
          <Link to="/incidents">Open incident center</Link>
        </TabPanel>

        <TabPanel id="notes" activeId={tab}>
          <p>{ops.note || "No private note stored yet."}</p>
          <label>
            Private internal note
            <textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} />
          </label>
          <CommandButton
            command="admin.driver.note"
            className="primary-btn"
            type="button"
            targetId={driver.id}
            confirmTarget={false}
            scope={driver.zoneId}
            before={ops.note || "empty"}
            after={privateNote || "empty"}
            expectedSliceRev={store.value.draftRev}
            sliceKey="driverOps"
            value={setDriverNote(store.value, driverSeed, privateNote, agent?.id ?? "")}
            disabled={!privateNote.trim()}
            onDone={() => {
              setNotice("Private driver note saved.");
              setPrivateNote("");
            }}
          >
            Save private note
          </CommandButton>
        </TabPanel>

        <TabPanel id="activity" activeId={tab}>
          <h4>Driver operations activity</h4>
          <ul>{ops.activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          <h4>Command audit</h4>
          {driverAudits.length === 0 ? <p>No audited command on this driver yet.</p> : (
            <ul>{driverAudits.map((item) => <li key={item.id}>{item.at} · {item.action} · {item.result} · {item.actorId}</li>)}</ul>
          )}
        </TabPanel>
      </article>
    </>
  );
}
