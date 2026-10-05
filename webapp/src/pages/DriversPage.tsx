import { useState } from "react";
import { activate, blankDocuments, reviewDocument, type DocStatus, type Driver } from "../drivers/gate";

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
        <button
          className="primary-btn"
          type="button"
          onClick={() => {
            const result = activate(driver);
            if (result.error) setNotice(result.error);
            else {
              setDriver(result.driver);
              setNotice("Driver is active. New offers can be sent.");
            }
          }}
        >
          Activate
        </button>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(driver.documents).map(([id, status]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{status}</td>
                <td>
                  {(["approved", "rejected", "in_review"] as DocStatus[]).map((next) => (
                    <button
                      key={next}
                      className="link-action"
                      type="button"
                      onClick={() => {
                        setDriver(reviewDocument(driver, id as keyof Driver["documents"], next));
                        setNotice(next === "rejected" ? "Rejected. The driver will see the reason on the app." : "Document updated.");
                      }}
                    >
                      {next}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </>
  );
}
