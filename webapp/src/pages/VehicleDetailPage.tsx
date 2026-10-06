import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useRecords, useSlice } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { vehicleBlock, type Vehicle } from "../drivers/gate";
import {
  emptyDriverOpsBook,
  updateVehicleOps,
  vehicleOps,
  type DriverOpsBook,
  type VehicleOps,
} from "../drivers/ops";
import { CommandButton } from "../ui/CommandButton";

export function VehicleDetailPage() {
  const { id = "" } = useParams();
  const { agent } = useSession();
  const vehicles = useRecords("vehicles", null);
  const drivers = useRecords("drivers", null);
  const fleets = useRecords("fleets", null);
  const store = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const record = vehicles.data?.find((item) => item.id === id);
  const profile = record ? vehicleOps(store.value, record) : null;

  const [year, setYear] = useState("2022");
  const [seats, setSeats] = useState("4");
  const [fuel, setFuel] = useState<Vehicle["fuel"]>("hybrid");
  const [category, setCategory] = useState<Vehicle["category"]>("economy");
  const [fleetId, setFleetId] = useState("");
  const [inspectionExpiresAt, setInspectionExpiresAt] = useState("");
  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [driverId, setDriverId] = useState("");
  const [notice, setNotice] = useState("Vehicle changes are not live until a command is confirmed.");

  useEffect(() => {
    if (!profile || !record) return;
    setYear(String(profile.year));
    setSeats(String(profile.seats));
    setFuel(profile.fuel);
    setCategory(profile.category);
    setFleetId(profile.fleetId);
    setInspectionExpiresAt(profile.inspectionExpiresAt);
    setInsuranceExpiresAt(profile.insuranceExpiresAt);
    setNote(profile.note);
    setDriverId(record.driverId ?? "");
  }, [profile?.vehicleId, profile?.year, profile?.seats, profile?.fuel, profile?.category, profile?.fleetId, profile?.inspectionExpiresAt, profile?.insuranceExpiresAt, profile?.note, record?.driverId]);

  const driverOptions = useMemo(() => {
    const fleetScope = agent?.scope.fleetPartnerId;
    return (drivers.data ?? []).filter((driver) => !fleetScope || driver.fleetId === fleetScope);
  }, [agent?.scope.fleetPartnerId, drivers.data]);

  if (vehicles.isLoading || drivers.isLoading || fleets.isLoading || store.loading) return <p className="state-line">Loading vehicle.</p>;
  if (!record || !profile) {
    return (
      <div className="page-heading">
        <div>
          <h2>Vehicle not found</h2>
          <p>This vehicle is not in your active scope.</p>
          <Link to="/vehicles">Back to vehicles</Link>
        </div>
      </div>
    );
  }
  if (agent?.scope.fleetPartnerId && record.fleetId !== agent.scope.fleetPartnerId) {
    return (
      <div className="page-heading">
        <div>
          <h2>No access</h2>
          <p>This vehicle belongs to another fleet partner.</p>
          <Link to="/vehicles">Back to vehicles</Link>
        </div>
      </div>
    );
  }

  const draftPatch: Partial<Omit<VehicleOps, "vehicleId">> = {
    year: Number(year) || profile.year,
    seats: Number(seats) || profile.seats,
    fuel,
    category,
    fleetId,
    inspectionExpiresAt,
    insuranceExpiresAt,
    note,
  };
  const nextBook = updateVehicleOps(store.value, record, draftPatch);
  const nextProfile = vehicleOps(nextBook, record);
  const ruleIssue = vehicleBlock({
    year: nextProfile.year,
    seats: nextProfile.seats,
    fuel: nextProfile.fuel,
    category: nextProfile.category,
  });
  const savedStatus =
    record.status === "on_hold"
      ? "on_hold"
      : ruleIssue || nextProfile.registrationStatus !== "approved"
        ? "ineligible"
        : "eligible";
  const selectedDriver = driverOptions.find((driver) => driver.id === driverId);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{record.plate ?? record.id}</h2>
          <p>
            {record.id} · {record.make ?? "Vehicle"} {record.model ?? ""} · {record.status} · zone {record.zoneId}.
            {record.driverId ? ` Driver ${record.driverId}.` : " Unassigned."}
          </p>
        </div>
        <Link to="/vehicles">Back to vehicles</Link>
      </div>

      <p className="state-line">{notice} {store.message}</p>

      <article className="panel">
        <h3>Compliance and eligibility</h3>
        <div className="field-grid">
          <label>
            Year
            <input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </label>
          <label>
            Seats
            <input type="number" value={seats} onChange={(event) => setSeats(event.target.value)} />
          </label>
          <label>
            Fuel
            <select value={fuel} onChange={(event) => setFuel(event.target.value as Vehicle["fuel"])}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value as Vehicle["category"])}>
              <option value="economy">Movera</option>
              <option value="comfort">Comfort</option>
              <option value="premium">Premium</option>
              <option value="priority">Priority</option>
              <option value="xl">XL</option>
              <option value="electric">Electric</option>
              <option value="pet">Pet</option>
            </select>
          </label>
          <label>
            Fleet partner
            <select value={fleetId} onChange={(event) => setFleetId(event.target.value)}>
              <option value="">Independent</option>
              {(fleets.data ?? []).map((fleet) => (
                <option key={fleet.id} value={fleet.id}>{fleet.id} · {fleet.name}</option>
              ))}
            </select>
          </label>
          <label>
            Inspection expires
            <input type="date" value={inspectionExpiresAt} onChange={(event) => setInspectionExpiresAt(event.target.value)} />
          </label>
          <label>
            Insurance expires
            <input type="date" value={insuranceExpiresAt} onChange={(event) => setInsuranceExpiresAt(event.target.value)} />
          </label>
          <label>
            Private fleet note
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>
        <p className="state-line">
          Rule check: {ruleIssue ?? "passed"}. Registration: {profile.registrationStatus}. Saving this form will set the simulated vehicle state to {savedStatus}.
        </p>
        <CommandButton
          command="admin.vehicle.update"
          className="primary-btn"
          type="button"
          targetId={record.id}
          confirmTarget={false}
          entityState={record.status}
          scope={record.zoneId}
          before={`${profile.year}/${profile.category}/${record.status}`}
          after={`${nextProfile.year}/${nextProfile.category}/${savedStatus}`}
          collection="vehicles"
          patch={{ status: savedStatus, fleetId: fleetId || null }}
          expectedSliceRev={store.value.draftRev}
          sliceKey="driverOps"
          value={nextBook}
          onDone={() => setNotice("Vehicle compliance profile saved.")}
        >
          Save vehicle compliance
        </CommandButton>
      </article>

      <article className="panel">
        <h3>Registration review</h3>
        <p>Current state: {profile.registrationStatus}.</p>
        <div className="actions">
          {(["approved", "rejected", "in_review"] as const).map((status) => {
            const book = updateVehicleOps(store.value, record, { registrationStatus: status });
            const updated = vehicleOps(book, record);
            const issue = vehicleBlock({ year: updated.year, seats: updated.seats, fuel: updated.fuel, category: updated.category });
            const collectionStatus = status === "approved" && !issue && record.status !== "on_hold" ? "eligible" : record.status === "on_hold" ? "on_hold" : "ineligible";
            return (
              <CommandButton
                command="admin.vehicle.reviewRegistration"
                key={status}
                className="secondary-btn"
                type="button"
                targetId={record.id}
                confirmTarget={false}
                scope={record.zoneId}
                before={profile.registrationStatus}
                after={status}
                collection="vehicles"
                patch={{ status: collectionStatus }}
                expectedSliceRev={store.value.draftRev}
                sliceKey="driverOps"
                value={book}
                onDone={() => setNotice(`Registration marked ${status}.`)}
              >
                {status}
              </CommandButton>
            );
          })}
        </div>
      </article>

      <article className="panel">
        <h3>Driver assignment</h3>
        <label>
          Linked driver
          <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            <option value="">Unassigned</option>
            {driverOptions.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.id} · {driver.name}</option>
            ))}
          </select>
        </label>
        <CommandButton
          command="admin.vehicle.link"
          className="secondary-btn"
          type="button"
          targetId={record.id}
          confirmTarget={false}
          scope={record.zoneId}
          before={record.driverId ?? "unassigned"}
          after={driverId || "unassigned"}
          collection="vehicles"
          patch={{ driverId: driverId || null, name: selectedDriver?.name ?? record.name }}
          onDone={() => setNotice(driverId ? `Vehicle linked to ${driverId}.` : "Vehicle unassigned.")}
        >
          Save driver assignment
        </CommandButton>
      </article>

      <article className="panel">
        <h3>Service state</h3>
        <div className="actions">
          <CommandButton
            command="admin.vehicle.hold"
            className="secondary-btn"
            type="button"
            targetId={record.id}
            entityState={record.status}
            scope={record.zoneId}
            before={record.status}
            after="on_hold"
            collection="vehicles"
            patch={{ status: "on_hold" }}
            disabled={record.status === "on_hold"}
            onDone={() => setNotice("Vehicle placed on hold.")}
          >
            Put on hold
          </CommandButton>
          <CommandButton
            command="admin.vehicle.activate"
            className="primary-btn"
            type="button"
            targetId={record.id}
            entityState={record.status}
            scope={record.zoneId}
            before={record.status}
            after="eligible"
            collection="vehicles"
            patch={{ status: "eligible" }}
            disabled={Boolean(ruleIssue) || profile.registrationStatus !== "approved" || record.status === "eligible"}
            title={ruleIssue ?? (profile.registrationStatus !== "approved" ? "Registration must be approved." : undefined)}
            onDone={() => setNotice("Vehicle returned to service.")}
          >
            Return to service
          </CommandButton>
        </div>
      </article>
    </>
  );
}
