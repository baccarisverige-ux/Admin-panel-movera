import { useState } from "react";
import { Link, useParams } from "react-router";
import { useRecords } from "../api/hooks";
import { DRIVER_DOCUMENTS } from "../drivers/gate";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import { TabPanel, Tabs } from "../ui/Tabs";

const TABS = ["Overview", "Documents", "Vehicles", "Categories", "Trips", "Earnings", "Bank", "Bonuses", "Driving log", "Ratings", "Support", "Safety", "Notes", "Activity"];

export function DriverDetailPage() {
  const { driverId = "" } = useParams();
  const drivers = useRecords("drivers", null);
  const vehicles = useRecords("vehicles", null);
  const trips = useRecords("trips", null);
  const payouts = useRecords("payouts", null);
  const [tab, setTab] = useState("overview");
  const driver = drivers.data?.find((item) => item.id === driverId);
  const cars = (vehicles.data ?? []).filter((item) => item.driverId === driverId);
  const jobs = (trips.data ?? []).filter((item) => item.driverId === driverId);
  const pay = (payouts.data ?? []).filter((item) => item.driverId === driverId);

  if (drivers.isLoading) return <p className="state-line">Loading driver.</p>;
  if (!driver) {
    return (
      <div className="page-heading">
        <div>
          <h2>Driver not found</h2>
          <Link to="/drivers">Back to drivers</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{driver.name}</h2>
          <p>{driver.id} · {statusLabel(driver.status)} · {driver.phone} · {driver.zoneId}</p>
        </div>
        <Link to="/drivers">Back to drivers</Link>
      </div>
      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />
      <article className="panel">
        <TabPanel id="overview" activeId={tab}>
          <p>Status {statusLabel(driver.status)}. Latest document state {driver.kind ?? "needed"}. These numbers come from the driver record.</p>
        </TabPanel>
        <TabPanel id="documents" activeId={tab}>
          <ul>
            {DRIVER_DOCUMENTS.map((id) => <li key={id}>{id} · latest review {driver.kind ?? "needed"}</li>)}
          </ul>
        </TabPanel>
        <TabPanel id="vehicles" activeId={tab}>
          {cars.length === 0 ? <p>No vehicle linked.</p> : cars.map((car) => <p key={car.id}>{car.plate} · {statusLabel(car.status)} · {car.id}</p>)}
        </TabPanel>
        <TabPanel id="categories" activeId={tab}>
          <p>Category eligibility is checked at activation: minimum year 2015, electric fuel for Electric, 6 seats for XL.</p>
        </TabPanel>
        <TabPanel id="trips" activeId={tab}>
          <p>{jobs.length} trips on this driver. {jobs.slice(0, 5).map((trip) => trip.id).join(", ") || "None in the first rows."}</p>
        </TabPanel>
        <TabPanel id="earnings" activeId={tab}>
          <p>{pay.length === 0 ? "No payout stored for this driver." : pay.map((item) => `${item.name} ${formatOre(item.fareOre ?? 0)} ${item.status}`).join(". ")}</p>
        </TabPanel>
        <TabPanel id="bank" activeId={tab}>
          <p>Bank details stay in review until the driver app checks pass. No account number is shown here.</p>
        </TabPanel>
        <TabPanel id="bonuses" activeId={tab}>
          <p>Bonuses ARN120, EVE60 and PEAK80 are tracked on Promotions, not edited here.</p>
        </TabPanel>
        <TabPanel id="driving-log" activeId={tab}>
          <p>Driving hours are not confirmed. No hours are invented for this driver.</p>
        </TabPanel>
        <TabPanel id="ratings" activeId={tab}>
          <p>Acceptance and cancellation use the last 100 requests. The rating aggregate is not stored on this record.</p>
        </TabPanel>
        <TabPanel id="support" activeId={tab}>
          <p>Support tickets for this driver open from the support queue.</p>
        </TabPanel>
        <TabPanel id="safety" activeId={tab}>
          <p>PIN is never shown. Safety incidents open from the incidents list.</p>
        </TabPanel>
        <TabPanel id="notes" activeId={tab}>
          <p>No private note is stored on this driver yet.</p>
        </TabPanel>
        <TabPanel id="activity" activeId={tab}>
          <p>Account {statusLabel(driver.status)} in {driver.zoneId}. Phone {driver.phone}.</p>
        </TabPanel>
      </article>
    </>
  );
}
