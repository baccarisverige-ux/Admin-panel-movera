import { useState } from "react";
import { useSearchParams } from "react-router";
import { useTrips } from "../api/hooks";
import { statusLabel } from "../domain/labels";
import { DataTable } from "../ui/DataTable";
import { StatusDot } from "../ui/kit";
import {
  DEFAULT_DISPATCH,
  adjustFare,
  cancelTrip,
  eligibleDrivers,
  reassign,
  saveDispatch,
  type DispatchRules,
  type OfferDriver,
  type Trip,
} from "../trips/rules";

const DRIVERS: OfferDriver[] = [
  { id: "D1", name: "Erik Lind", status: "active", category: "economy" },
  { id: "D2", name: "Sara Berg", status: "suspended", category: "economy" },
  { id: "D3", name: "Noah Ek", status: "active", category: "economy" },
];

const SEED: Trip[] = [
  { id: "T1001", status: "searching", category: "economy", fareOre: 14900, ruleVersion: "price-3", driverId: null },
  { id: "T1002", status: "in_trip", category: "economy", fareOre: 18900, ruleVersion: "price-3", driverId: "D1" },
  { id: "T1003", status: "completed", category: "economy", fareOre: 22100, ruleVersion: "price-3", driverId: "D1" },
];

function kr(ore: number): string {
  return `${(ore / 100).toFixed(2).replace(".", ",")} kr`;
}

export function TripsPage() {
  const [params, setParams] = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>(SEED);
  const [rules, setRules] = useState<DispatchRules>(DEFAULT_DISPATCH);
  const [notice, setNotice] = useState("Pick a trip. A finished trip cannot be cancelled.");
  const selected = trips.find((trip) => trip.id === params.get("trip")) ?? null;
  const seeded = useTrips(null);

  function replace(next: Trip) {
    setTrips(trips.map((trip) => (trip.id === next.id ? next : trip)));
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Trips</h2>
          <p>Offer window {rules.offerSeconds} s. Search radius {rules.radiusKm} km. {seeded.data?.length ?? "…"} trips in the demo.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <DataTable
          head={["Trip", "Status", "Fare", "Driver"]}
          rows={trips.map((trip) => [
            trip.id,
            <StatusDot key={trip.id} tone={trip.status === "completed" ? "green" : trip.status.includes("cancel") || trip.status === "failed" ? "red" : "amber"}>{statusLabel(trip.status)}</StatusDot>,
            kr(trip.fareOre),
            trip.driverId ?? "none",
          ])}
          onRow={(index) => setParams({ trip: trips[index]?.id ?? "" })}
        />
      </article>
      {selected ? (
        <article className="panel">
          <h3>{selected.id}</h3>
          <p>Status {selected.status}. Rule {selected.ruleVersion}. Fare {kr(selected.fareOre)}.</p>
          <div className="actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const result = cancelTrip(selected, "Admin cancel");
                if (result.error) setNotice(result.error);
                else {
                  replace(result.trip);
                  setNotice("Cancelled. The rider and driver would see this reason.");
                }
              }}
            >
              Cancel
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const result = adjustFare(selected, 10);
                if (result.error) setNotice(result.error);
                else {
                  replace(result.trip);
                  setNotice("Fare adjusted 10%. Rule version unchanged.");
                }
              }}
            >
              Adjust +10%
            </button>
            {eligibleDrivers(selected, DRIVERS).map((driver) => (
              <button
                key={driver.id}
                className="secondary-btn"
                type="button"
                onClick={() => {
                  const result = reassign(selected, driver, DRIVERS);
                  if (result.error) setNotice(result.error);
                  else {
                    replace(result.trip);
                    setNotice(`Reassigned to ${driver.name}.`);
                  }
                }}
              >
                Offer {driver.name}
              </button>
            ))}
          </div>
        </article>
      ) : null}
      <article className="panel">
        <h3>Dispatch for Norrmalm</h3>
        <label>
          Offer seconds
          <input
            type="number"
            step="0.5"
            value={rules.offerSeconds}
            onChange={(event) => {
              const result = saveDispatch(rules, { ...rules, offerSeconds: Number(event.target.value) });
              if (result.error) setNotice(result.error);
              else setRules(result.rules);
            }}
          />
        </label>
        <label>
          Radius km
          <input
            type="number"
            value={rules.radiusKm}
            onChange={(event) => {
              const result = saveDispatch(rules, { ...rules, radiusKm: Number(event.target.value) });
              if (result.error) setNotice(result.error);
              else setRules(result.rules);
            }}
          />
        </label>
      </article>
    </>
  );
}
