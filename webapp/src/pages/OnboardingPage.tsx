import { useEffect, useMemo, useState } from "react";
import { useSession } from "../auth/SessionContext";
import { useRecords, useSlice } from "../api/hooks";
import {
  DRIVER_DOCUMENTS,
  vehicleBlock,
  type DocId,
  type DocStatus,
} from "../drivers/gate";
import {
  approveRequiredDocuments,
  driverActivationIssue,
  driverOps,
  emptyDriverOpsBook,
  requestDriverInfo,
  reviewDriverDocument,
  setAccountReason,
  setBankReview,
  vehicleOps,
  type DriverOpsBook,
} from "../drivers/ops";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

const REVIEW_STATES: DocStatus[] = ["in_review", "approved", "rejected"];

export function OnboardingPage() {
  const { agent } = useSession();
  const drivers = useRecords("drivers", null);
  const vehicles = useRecords("vehicles", null);
  const store = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const [selectedId, setSelectedId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [notice, setNotice] = useState("Application is pending. Review the required documents, bank details and linked vehicle before activation.");

  const queue = useMemo(
    () => (drivers.data ?? [])
      .filter((driver) => driver.status === "pending" || driver.status === "on_hold")
      .sort((left, right) => Number(Boolean(left.fleetId)) - Number(Boolean(right.fleetId)) || left.id.localeCompare(right.id)),
    [drivers.data],
  );

  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId("");
      return;
    }
    if (!queue.some((driver) => driver.id === selectedId)) setSelectedId(queue[0]?.id ?? "");
  }, [queue, selectedId]);

  if (drivers.isLoading || vehicles.isLoading || store.loading) return <p className="state-line">Loading onboarding queue.</p>;
  if (drivers.isError || vehicles.isError) {
    return (
      <>
        <h2>Onboarding queue</h2>
        <p className="state-line">The onboarding records could not be loaded.</p>
      </>
    );
  }

  const driver = queue.find((item) => item.id === selectedId) ?? queue[0];
  if (!driver) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h2>Onboarding queue</h2>
            <p>No pending or on-hold applications are in your active scope.</p>
          </div>
        </div>
      </>
    );
  }

  const driverSeed = { id: driver.id, name: driver.name, fleetId: driver.fleetId };
  const ops = driverOps(store.value, driverSeed);
  const carRecord = (vehicles.data ?? []).find((vehicle) => vehicle.driverId === driver.id) ?? null;
  const car = carRecord ? vehicleOps(store.value, carRecord) : null;
  const activationIssue = driverActivationIssue(store.value, driverSeed, car);
  const required = DRIVER_DOCUMENTS.filter((id) => !(driver.fleetId && id === "company_registration"));

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Onboarding queue</h2>
          <p>
            {queue.length} applications in this scope. Eleven document types are supported. Fleet partners are exempt from company registration.
            Activation also checks bank review and vehicle eligibility.
          </p>
        </div>
      </div>

      <p className="state-line">
        {notice} {store.message}
      </p>

      <article className="panel">
        <DataTable
          head={["Driver", "Name", "Fleet", "Status", "Zone", "Vehicle"]}
          rows={queue.map((item) => {
            const linked = (vehicles.data ?? []).find((vehicle) => vehicle.driverId === item.id);
            return [
              item.id,
              item.name,
              item.fleetId ?? "Independent",
              item.status,
              item.zoneId,
              linked?.plate ?? "No linked vehicle",
            ];
          })}
          onRow={(index) => {
            const id = queue[index]?.id;
            if (id) setSelectedId(id);
          }}
        />
      </article>

      <article className="panel">
        <h3>{driver.name}</h3>
        <p className="state-line">
          {driver.id} · {driver.status} · {driver.zoneId} · {driver.fleetId ? `Fleet ${driver.fleetId}` : "Independent"}.
          {activationIssue ? ` Activation blocked: ${activationIssue}` : " Ready for activation."}
        </p>

        <label>
          Review note / request details
          <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Reason or information requested" />
        </label>

        <DataTable
          head={["Document", "Required", "File", "Expiry", "Status", "Actions"]}
          rows={DRIVER_DOCUMENTS.map((id) => {
            const review = ops.documents[id];
            const needed = required.includes(id);
            return [
              id.replaceAll("_", " "),
              needed ? "Required" : "Fleet exempt",
              `${review.fileType} · ${review.fileName}`,
              review.expiresAt || "No expiry",
              review.status,
              needed ? (
                <span key={id}>
                  {REVIEW_STATES.map((status) => {
                    const next = reviewDriverDocument(store.value, driverSeed, id, status, agent?.id ?? "", reviewNote);
                    return (
                      <CommandButton
                        command="admin.driver.review"
                        key={status}
                        className="link-action"
                        type="button"
                        targetId={driver.id}
                        confirmTarget={false}
                        scope={driver.zoneId}
                        before={review.status}
                        after={status}
                        expectedSliceRev={store.value.draftRev}
                        sliceKey="driverOps"
                        value={next}
                        onDone={() => {
                          setNotice(`${id.replaceAll("_", " ")} marked ${status}.`);
                          setReviewNote("");
                        }}
                      >
                        {status}
                      </CommandButton>
                    );
                  })}
                  <CommandButton
                    command="admin.driver.requestInfo"
                    className="link-action"
                    type="button"
                    targetId={driver.id}
                    confirmTarget={false}
                    scope={driver.zoneId}
                    before={review.status}
                    after="needed"
                    expectedSliceRev={store.value.draftRev}
                    sliceKey="driverOps"
                    value={requestDriverInfo(store.value, driverSeed, id as DocId, agent?.id ?? "", reviewNote)}
                    onDone={() => {
                      setNotice(`More information requested for ${id.replaceAll("_", " ")}.`);
                      setReviewNote("");
                    }}
                  >
                    request info
                  </CommandButton>
                </span>
              ) : "Not required",
            ];
          })}
        />

        <div className="actions">
          <CommandButton
            command="admin.driver.approveAll"
            className="secondary-btn"
            type="button"
            targetId={driver.id}
            confirmTarget={false}
            scope={driver.zoneId}
            before="required documents"
            after="approved"
            expectedSliceRev={store.value.draftRev}
            sliceKey="driverOps"
            value={approveRequiredDocuments(store.value, driverSeed, agent?.id ?? "")}
            onDone={() => setNotice("Documents approved.")}
          >
            Approve remaining
          </CommandButton>
        </div>
      </article>

      <article className="panel">
        <h3>Bank verification</h3>
        <p>
          Holder {ops.bank.holder}. Account •••• {ops.bank.last4}. Status {ops.bank.status}.
          {ops.bank.note ? ` Note: ${ops.bank.note}` : ""}
        </p>
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
              Bank {status}
            </CommandButton>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>Linked vehicle</h3>
        {carRecord && car ? (
          <>
            <p>
              {carRecord.plate} · {carRecord.make ?? "Vehicle"} {carRecord.model ?? ""} · {car.year} · {car.category} · {car.fuel} · {car.seats} seats · {car.status}.
            </p>
            <p className="state-line">
              Inspection expires {car.inspectionExpiresAt}. Insurance expires {car.insuranceExpiresAt}. Registration {car.registrationStatus}.
              {vehicleBlock({ year: car.year, seats: car.seats, fuel: car.fuel, category: car.category }) ?? " Vehicle rule check passed."}
            </p>
          </>
        ) : (
          <p className="state-line">No vehicle linked. Activation is blocked.</p>
        )}
      </article>

      <article className="panel">
        <h3>Account decision</h3>
        <div className="actions">
          <CommandButton
            command="admin.driver.activate"
            className="primary-btn"
            type="button"
            targetId={driver.id}
            entityState={driver.status}
            scope={driver.zoneId}
            before={driver.status}
            after="active"
            collection="drivers"
            patch={{ status: "active" }}
            expectedSliceRev={store.value.draftRev}
            sliceKey="driverOps"
            value={setAccountReason(store.value, driverSeed, "active", "Onboarding approved", agent?.id ?? "")}
            disabled={Boolean(activationIssue)}
            title={activationIssue ?? undefined}
            onDone={() => setNotice("Driver is active. New offers can be sent.")}
          >
            Activate
          </CommandButton>
          <CommandButton
            command="admin.driver.onHold"
            className="secondary-btn"
            type="button"
            targetId={driver.id}
            entityState={driver.status}
            scope={driver.zoneId}
            before={driver.status}
            after="on_hold"
            collection="drivers"
            patch={{ status: "on_hold" }}
            expectedSliceRev={store.value.draftRev}
            sliceKey="driverOps"
            value={setAccountReason(store.value, driverSeed, "on_hold", reviewNote || "Onboarding review hold", agent?.id ?? "")}
            onDone={() => setNotice("Driver placed on hold.")}
          >
            Put on hold
          </CommandButton>
        </div>
      </article>
    </>
  );
}
