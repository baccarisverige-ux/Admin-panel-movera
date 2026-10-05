import { useState } from "react";
import { activate, blankDocuments, reviewDocument, type DocStatus, type Driver } from "../drivers/gate";
import { DataTable } from "../ui/DataTable";
import { CommandButton } from "../ui/CommandButton";

const starter: Driver = {
  id: "D2847",
  name: "Erik Lind",
  fleet: false,
  status: "pending",
  documents: blankDocuments(),
  vehicle: { year: 2022, seats: 4, fuel: "electric", category: "economy" },
};

export function DriversPage() {
  const [driver, setDriver] = useState<Driver>(starter);
  const [notice, setNotice] = useState("Application is pending. Approve every document, then activate.");

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{driver.name}</h2>
          <p>
            {driver.id} · {driver.status} · {driver.vehicle.category} · {driver.vehicle.fuel}
          </p>
        </div>
        <CommandButton command="admin.driver.activate" className="primary-btn"
          type="button" onDone={() => {
            const result = activate(driver);
            if (result.error) setNotice(result.error);
            else {
              setDriver(result.driver);
              setNotice("Driver is active. New offers can be sent.");
            }
          }}>
          Activate
        </CommandButton>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <DataTable
          head={["Document", "Status", "Actions"]}
          rows={Object.entries(driver.documents).map(([id, status]) => [
            id,
            status,
            <span key={id}>
              {(["approved", "rejected", "in_review"] as DocStatus[]).map((next) => (
                <CommandButton command="admin.driver.review" key={next}
                  className="link-action"
                  type="button" onDone={() => {
                    setDriver(reviewDocument(driver, id as keyof Driver["documents"], next));
                    setNotice(next === "rejected" ? "Rejected. The driver will see the reason on the app." : "Document updated.");
                  }}>
                  {next}
                </CommandButton>
              ))}
            </span>,
          ])}
        />
      </article>
    </>
  );
}
