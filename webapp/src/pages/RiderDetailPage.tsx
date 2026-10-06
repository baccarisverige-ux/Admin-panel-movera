import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useAudit, useRecords, useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import {
  addRiderPromotion,
  advanceRiderPrivacy,
  creditRiderWallet,
  emptyRiderOpsBook,
  removeRiderPromotion,
  revokeRiderSessions,
  riderOps,
  setRiderAccountReason,
  setRiderNote,
  type RiderOpsBook,
} from "../riders/ops";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";
import { SensitiveValue } from "../ui/SensitiveValue";
import { TabPanel, Tabs } from "../ui/Tabs";

const TABS = ["Trips", "Reservations", "Payments", "Promotions", "Support", "Safety", "Saved places", "Notes", "Activity"];

export function RiderDetailPage() {
  const { riderId = "" } = useParams();
  const { agent } = useSession();
  const riders = useRecords("riders", null);
  const trips = useRecords("trips", null);
  const reservations = useRecords("reservations", null);
  const tickets = useRecords("tickets", null);
  const incidents = useRecords("incidents", null);
  const wallet = useRecords("wallet", null);
  const bonuses = useRecords("bonuses", null);
  const audit = useAudit();
  const store = useSlice<RiderOpsBook>("riderOps", emptyRiderOpsBook());
  const [tab, setTab] = useState("trips");
  const [notice, setNotice] = useState("Wallet credit cannot exceed 500 kr per adjustment. Saved places are read-only.");
  const [accountReason, setAccountReason] = useState("");
  const [walletKr, setWalletKr] = useState("100");
  const [privateNote, setPrivateNote] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLabel, setPromoLabel] = useState("");

  const rider = riders.data?.find((item) => item.id === riderId);

  const jobs = useMemo(
    () => rider ? (trips.data ?? []).filter((item) => item.id === rider.tripId || item.phone === rider.phone) : [],
    [rider, trips.data],
  );
  const upcoming = useMemo(
    () => rider ? (reservations.data ?? []).filter((item) => item.phone === rider.phone) : [],
    [reservations.data, rider],
  );
  const externalWallet = useMemo(
    () => rider ? (wallet.data ?? []).filter((item) => item.driverId === rider.id || item.name === rider.name) : [],
    [rider, wallet.data],
  );
  const support = useMemo(
    () => rider ? (tickets.data ?? []).filter((item) => item.phone === rider.phone || item.name === rider.name) : [],
    [rider, tickets.data],
  );
  const safety = useMemo(
    () => rider ? (incidents.data ?? []).filter((item) => item.name === rider.name || item.phone === rider.phone) : [],
    [incidents.data, rider],
  );

  if (riders.isLoading || store.loading) return <p className="state-line">Loading rider.</p>;
  if (!rider) {
    return (
      <div className="page-heading">
        <div>
          <h2>Rider not found</h2>
          <p>The rider is outside your active scope or does not exist.</p>
          <Link to="/riders">Back to riders</Link>
        </div>
      </div>
    );
  }

  const seed = { id: rider.id, name: rider.name, status: rider.status, tripId: rider.tripId, fareOre: rider.fareOre };
  const ops = riderOps(store.value, seed);
  const activeSessions = ops.sessions.filter((session) => session.active);
  const walletAmountOre = Math.round(Number(walletKr) * 100);
  const credit = creditRiderWallet(store.value, seed, walletAmountOre, agent?.id ?? "", "Manual admin wallet credit");
  const privacyNext = advanceRiderPrivacy(store.value, seed, agent?.id ?? "");
  const sessionsNext = revokeRiderSessions(store.value, seed, agent?.id ?? "");
  const noteNext = setRiderNote(store.value, seed, privateNote, agent?.id ?? "");
  const promotion = addRiderPromotion(store.value, seed, promoCode, promoLabel, agent?.id ?? "");
  const riderAudits = (audit.data ?? []).filter((item) => item.targetId === rider.id).slice(0, 30);

  function settle(text: string, after?: () => void) {
    void store.refetch().then(() => {
      after?.();
      setNotice(text);
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{rider.name}</h2>
          <p>
            <span>{rider.id} · {statusLabel(rider.status)}</span> · <SensitiveValue value={rider.phone} permission="riders.viewSensitive" command="admin.rider.revealSensitive" targetId={rider.id} label="Phone" /> · {rider.zoneId}
          </p>
        </div>
        <Link to="/riders">Back to riders</Link>
      </div>

      <p className="state-line">
        {notice} Wallet {formatOre(ops.walletOre)}. Active sessions {activeSessions.length}. Privacy {ops.privacy}. {store.message}
      </p>

      <article className="panel">
        <h3>Account controls</h3>
        <label>
          Account reason
          <input value={accountReason} onChange={(event) => setAccountReason(event.target.value)} placeholder="Stored in rider activity" />
        </label>
        <div className="actions">
          {rider.status === "blocked" ? (
            <CommandButton
              command="admin.rider.unblock"
              className="primary-btn"
              targetId={rider.id}
              entityState={rider.status}
              scope={rider.zoneId}
              collection="riders"
              before={rider.status}
              after="active"
              patch={{ status: "active" }}
              expectedSliceRev={store.value.draftRev}
              sliceKey="riderOps"
              value={setRiderAccountReason(store.value, seed, "active", accountReason || "Manual unblock", agent?.id ?? "")}
              onDone={() => settle("Rider unblocked.", () => setAccountReason(""))}
            >
              Unblock
            </CommandButton>
          ) : (
            <CommandButton
              command="admin.rider.block"
              className="secondary-btn"
              targetId={rider.id}
              entityState={rider.status}
              scope={rider.zoneId}
              collection="riders"
              before={rider.status}
              after="blocked"
              patch={{ status: "blocked" }}
              expectedSliceRev={store.value.draftRev}
              sliceKey="riderOps"
              value={setRiderAccountReason(store.value, seed, "blocked", accountReason || "Manual block", agent?.id ?? "")}
              onDone={() => settle("Rider blocked.", () => setAccountReason(""))}
            >
              Block
            </CommandButton>
          )}

          <CommandButton
            command="admin.rider.signOut"
            className="secondary-btn"
            targetId={rider.id}
            confirmTarget={false}
            scope={rider.zoneId}
            before={`${activeSessions.length} active sessions`}
            after="0 active sessions"
            expectedSliceRev={store.value.draftRev}
            sliceKey="riderOps"
            value={sessionsNext}
            disabled={activeSessions.length === 0}
            title={activeSessions.length === 0 ? "No active rider session remains." : undefined}
            onDone={() => settle("Signed out of every active rider session.")}
          >
            Sign out all sessions
          </CommandButton>

          <CommandButton
            command="admin.rider.privacy"
            className="secondary-btn"
            targetId={rider.id}
            scope={rider.zoneId}
            before={ops.privacy}
            after={riderOps(privacyNext, seed).privacy}
            expectedSliceRev={store.value.draftRev}
            sliceKey="riderOps"
            value={privacyNext}
            disabled={ops.privacy === "done"}
            title={ops.privacy === "done" ? "Privacy request is already complete." : undefined}
            onDone={() => settle("Privacy request advanced.")}
          >
            Advance privacy
          </CommandButton>
        </div>
        {ops.accountReason ? <p className="state-line">Latest account reason: {ops.accountReason}</p> : null}
      </article>

      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />

      <article className="panel">
        <TabPanel id="trips" activeId={tab}>
          {jobs.length === 0 ? <p>No linked trip.</p> : (
            <DataTable
              head={["Trip", "Status", "Driver", "Fare"]}
              rows={jobs.slice(0, 20).map((item) => [
                <Link key={item.id} to={`/trips/${item.id}`}>{item.id}</Link>,
                statusLabel(item.status),
                item.driverId ?? "none",
                formatOre(item.fareOre ?? 0),
              ])}
            />
          )}
        </TabPanel>

        <TabPanel id="reservations" activeId={tab}>
          {upcoming.length === 0 ? <p>No reservation for this phone.</p> : (
            <ul>
              {upcoming.map((item) => <li key={item.id}><Link to={`/reservations/${item.id}`}>{item.id}</Link> · {statusLabel(item.status)} · driver {item.driverId ?? "none"}</li>)}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="payments" activeId={tab}>
          <h4>Wallet</h4>
          <p>Current admin wallet balance {formatOre(ops.walletOre)}. One adjustment may not exceed 500 kr.</p>
          <label>
            Credit amount (kr)
            <input type="number" min="0.01" max="500" step="0.01" value={walletKr} onChange={(event) => setWalletKr(event.target.value)} />
          </label>
          <CommandButton
            command="admin.rider.credit"
            className="primary-btn"
            targetId={rider.id}
            confirmTarget={false}
            scope={rider.zoneId}
            amountOre={walletAmountOre}
            before={formatOre(ops.walletOre)}
            after={credit.error ? "invalid" : formatOre(riderOps(credit.book, seed).walletOre)}
            expectedSliceRev={store.value.draftRev}
            sliceKey="riderOps"
            value={credit.book}
            disabled={Boolean(credit.error)}
            title={credit.error}
            onDone={() => settle(`Credited ${formatOre(walletAmountOre)}. The ceiling is 500 kr per adjustment.`)}
          >
            Credit wallet
          </CommandButton>

          <h4>Admin wallet ledger</h4>
          {ops.wallet.length === 0 ? <p>No admin wallet adjustment yet.</p> : (
            <ul aria-label="Rider wallet ledger">
              {ops.wallet.map((entry) => (
                <li key={entry.id}>{entry.at} · {entry.kind} · {formatOre(entry.amountOre)} · balance {formatOre(entry.balanceOre)} · {entry.actorId} · {entry.reason}</li>
              ))}
            </ul>
          )}

          <h4>Other wallet records</h4>
          <p>{externalWallet.length === 0 ? "No wallet ledger row for this rider." : externalWallet.map((item) => `${item.id} ${formatOre(item.fareOre ?? 0)} ${item.status}`).join(". ")}</p>
        </TabPanel>

        <TabPanel id="promotions" activeId={tab}>
          <p>Apply a rider-specific promotion without changing the global promotion definition.</p>
          <div className="field-grid">
            <label>
              Promotion code
              <input list="rider-promo-options" value={promoCode} onChange={(event) => {
                setPromoCode(event.target.value);
                const match = (bonuses.data ?? []).find((item) => item.id === event.target.value);
                if (match) setPromoLabel(match.name);
              }} />
              <datalist id="rider-promo-options">
                {(bonuses.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </datalist>
            </label>
            <label>
              Label
              <input value={promoLabel} onChange={(event) => setPromoLabel(event.target.value)} />
            </label>
          </div>
          <CommandButton
            command="admin.rider.promoAdd"
            className="primary-btn"
            targetId={rider.id}
            confirmTarget={false}
            scope={rider.zoneId}
            before={`${ops.promotions.filter((item) => item.status === "active").length} active promotions`}
            after={promoCode.trim().toUpperCase() || "promotion"}
            expectedSliceRev={store.value.draftRev}
            sliceKey="riderOps"
            value={promotion.book}
            disabled={Boolean(promotion.error)}
            title={promotion.error}
            onDone={() => settle(`Promotion ${promoCode.trim().toUpperCase()} added.`, () => {
              setPromoCode("");
              setPromoLabel("");
            })}
          >
            Apply promotion
          </CommandButton>

          {ops.promotions.length === 0 ? <p>No promotion is stored on this rider.</p> : (
            <ul aria-label="Rider promotions">
              {ops.promotions.map((item) => (
                <li key={item.code}>
                  {item.code} · {item.label} · {item.status} · {item.actorId}
                  {item.status === "active" ? (
                    <CommandButton
                      command="admin.rider.promoRemove"
                      className="link-action"
                      targetId={rider.id}
                      confirmTarget={false}
                      scope={rider.zoneId}
                      before="active"
                      after="expired"
                      expectedSliceRev={store.value.draftRev}
                      sliceKey="riderOps"
                      value={removeRiderPromotion(store.value, seed, item.code, agent?.id ?? "")}
                      onDone={() => settle(`Promotion ${item.code} removed.`)}
                    >
                      remove
                    </CommandButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="support" activeId={tab}>
          {support.length === 0 ? <p>No support ticket for this rider.</p> : (
            <ul>{support.map((item) => <li key={item.id}><Link to={`/tickets/${item.id}`}>{item.id}</Link> · {statusLabel(item.status)}</li>)}</ul>
          )}
          <Link to="/support">Open support queue</Link>
        </TabPanel>

        <TabPanel id="safety" activeId={tab}>
          <p>Safety data stays masked on the rider profile.</p>
          {safety.length === 0 ? <p>No incident is tied to this rider.</p> : (
            <ul>{safety.map((item) => <li key={item.id}><Link to={`/incidents/${item.id}`}>{item.id}</Link> · {statusLabel(item.status)}</li>)}</ul>
          )}
          <Link to="/incidents">Open incident center</Link>
        </TabPanel>

        <TabPanel id="saved-places" activeId={tab}>
          {ops.savedPlaces.length === 0 ? (
            <p>Saved places are read-only. None are stored for this rider.</p>
          ) : (
            <ul>{ops.savedPlaces.map((place) => <li key={place.id}>{place.label} · {place.address}</li>)}</ul>
          )}
        </TabPanel>

        <TabPanel id="notes" activeId={tab}>
          <p>{ops.privateNote || "No private note is stored."}</p>
          <label>
            Private internal note
            <textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} />
          </label>
          <CommandButton
            command="admin.rider.note"
            className="primary-btn"
            targetId={rider.id}
            confirmTarget={false}
            scope={rider.zoneId}
            before={ops.privateNote || "empty"}
            after={privateNote || "empty"}
            expectedSliceRev={store.value.draftRev}
            sliceKey="riderOps"
            value={noteNext}
            disabled={!privateNote.trim()}
            onDone={() => settle("Private rider note saved.", () => setPrivateNote(""))}
          >
            Save private note
          </CommandButton>
        </TabPanel>

        <TabPanel id="activity" activeId={tab}>
          <h4>Sessions</h4>
          <ul aria-label="Rider sessions">
            {ops.sessions.map((session) => <li key={session.id}>{session.platform} · {session.device} · {session.active ? "active" : "revoked"} · last seen {session.lastSeenAt}</li>)}
          </ul>

          <h4>Rider operations activity</h4>
          <ul>{ops.activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>

          <h4>Command audit</h4>
          {riderAudits.length === 0 ? <p>No audited command on this rider yet.</p> : (
            <ul>{riderAudits.map((item) => <li key={item.id}>{item.at} · {item.action} · {item.result} · {item.actorId}</li>)}</ul>
          )}
        </TabPanel>
      </article>
    </>
  );
}
