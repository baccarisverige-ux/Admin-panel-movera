import { useState } from "react";
import { Link, useParams } from "react-router";
import { useRecords } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import { CommandButton } from "../ui/CommandButton";
import { TabPanel, Tabs } from "../ui/Tabs";
import { SensitiveValue } from "../ui/SensitiveValue";

const TABS = ["Trips", "Reservations", "Payments", "Promotions", "Support", "Safety", "Saved places", "Notes", "Activity"];

export function RiderDetailPage() {
  const { riderId = "" } = useParams();
  const riders = useRecords("riders", null);
  const trips = useRecords("trips", null);
  const reservations = useRecords("reservations", null);
  const tickets = useRecords("tickets", null);
  const incidents = useRecords("incidents", null);
  const wallet = useRecords("wallet", null);
  const [tab, setTab] = useState("trips");
  const [notice, setNotice] = useState("Wallet credit cannot exceed 500 kr. Saved places are read-only.");
  const rider = riders.data?.find((item) => item.id === riderId);

  if (riders.isLoading) return <p className="state-line">Loading rider.</p>;
  if (!rider) {
    return (
      <div className="page-heading">
        <div>
          <h2>Rider not found</h2>
          <Link to="/riders">Back to riders</Link>
        </div>
      </div>
    );
  }

  const jobs = (trips.data ?? []).filter((item) => item.id === rider.tripId || item.phone === rider.phone);
  const upcoming = (reservations.data ?? []).filter((item) => item.phone === rider.phone);
  const credits = (wallet.data ?? []).filter((item) => item.driverId === rider.id || item.name === rider.name);
  const support = (tickets.data ?? []).filter((item) => item.phone === rider.phone);
  const safety = (incidents.data ?? []).filter((item) => item.name === rider.name);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{rider.name}</h2>
          <p>{rider.id} · {statusLabel(rider.status)} · <SensitiveValue value={rider.phone} permission="riders.viewSensitive" command="admin.rider.revealSensitive" targetId={rider.id} label="Phone" /> · {rider.zoneId}</p>
        </div>
        <Link to="/riders">Back to riders</Link>
      </div>
      <p className="state-line">{notice} Wallet on record {formatOre(rider.fareOre ?? 0)}.</p>
      <div className="actions">
        <CommandButton command="admin.rider.block" className="secondary-btn" targetId={rider.id} collection="riders" before={rider.status} after={rider.status === "blocked" ? "active" : "blocked"} patch={{ status: rider.status === "blocked" ? "active" : "blocked" }} onDone={() => setNotice(rider.status === "blocked" ? "Rider unblocked." : "Rider blocked.")}>{rider.status === "blocked" ? "Unblock" : "Block"}</CommandButton>
        <CommandButton command="admin.rider.signOut" className="secondary-btn" targetId={rider.id} collection="riders" before="signed in" after="signed out" patch={{ status: "signed_out" }} onDone={() => setNotice("Signed out of every device.")}>Sign out</CommandButton>
        <CommandButton command="admin.rider.credit" className="secondary-btn" targetId={rider.id} collection="riders" before={formatOre(rider.fareOre ?? 0)} after={formatOre((rider.fareOre ?? 0) + 10000)} patch={{ fareOre: (rider.fareOre ?? 0) + 10000 }} onDone={() => setNotice("Credited 100 kr. The ceiling is 500 kr.")}>Credit 100 kr</CommandButton>
        <CommandButton command="admin.rider.privacy" className="primary-btn" targetId={rider.id} collection="riders" before={rider.status} after="privacy" patch={{ status: "privacy" }} onDone={() => setNotice("Privacy request advanced.")}>Privacy step</CommandButton>
      </div>
      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />
      <article className="panel">
        <TabPanel id="trips" activeId={tab}>
          <p>{jobs.length} trips. {jobs.slice(0, 8).map((item) => `${item.id} ${statusLabel(item.status)}`).join(", ") || "None linked."}</p>
        </TabPanel>
        <TabPanel id="reservations" activeId={tab}>
          <p>{upcoming.length === 0 ? "No reservation for this phone." : upcoming.map((item) => `${item.id} ${statusLabel(item.status)}`).join(", ")}</p>
        </TabPanel>
        <TabPanel id="payments" activeId={tab}>
          <p>{credits.length === 0 ? "No wallet ledger row for this rider." : credits.map((item) => `${item.id} ${formatOre(item.fareOre ?? 0)} ${item.status}`).join(". ")}</p>
        </TabPanel>
        <TabPanel id="promotions" activeId={tab}>
          <p>No promotion is stored on this rider.</p>
        </TabPanel>
        <TabPanel id="support" activeId={tab}>
          <p>{support.length === 0 ? "No support ticket for this phone." : support.map((item) => `${item.id} ${statusLabel(item.status)}`).join(", ")}</p>
        </TabPanel>
        <TabPanel id="safety" activeId={tab}>
          <p>Safety stays masked. {safety.length === 0 ? "No incident is tied to this name." : safety.map((item) => `${item.id} ${statusLabel(item.status)}`).join(", ")}</p>
        </TabPanel>
        <TabPanel id="saved-places" activeId={tab}>
          <p>Saved places are read-only. None are stored for this rider.</p>
        </TabPanel>
        <TabPanel id="notes" activeId={tab}>
          <p>No private note is stored.</p>
        </TabPanel>
        <TabPanel id="activity" activeId={tab}>
          <p>{statusLabel(rider.status)} in {rider.zoneId}. Trip link {rider.tripId ?? "none"}.</p>
        </TabPanel>
      </article>
    </>
  );
}
