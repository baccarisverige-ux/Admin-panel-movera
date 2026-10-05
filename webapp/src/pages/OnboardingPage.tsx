import { useState } from "react";
import { activate, approveRemaining, blankDocuments, DRIVER_DOCUMENTS, requiredDocuments, reviewDocument, type DocStatus, type Driver } from "../drivers/gate";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

const STORE_KEY = "movera-admin-onboarding-v1";

function starter(): Driver[] {
  return [
    { id: "D2847", name: "Erik Lind", fleet: false, status: "pending", documents: blankDocuments(), vehicle: { year: 2022, seats: 4, fuel: "electric", category: "economy" } },
    { id: "D3001", name: "Sara Berg", fleet: true, status: "pending", documents: blankDocuments(), vehicle: { year: 2021, seats: 6, fuel: "hybrid", category: "xl" } },
  ];
}

function load(): Driver[] {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return starter();
  try {
    const parsed = JSON.parse(raw) as Driver[];
    return parsed.length > 0 ? parsed : starter();
  } catch {
    return starter();
  }
}

export function OnboardingPage() {
  const [queue, setQueue] = useState<Driver[]>(() => load());
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? "");
  const [notice, setNotice] = useState("Application is pending. Approve every required document, then activate.");
  const driver = queue.find((item) => item.id === selectedId) ?? queue[0];

  function save(next: Driver, text: string) {
    const updated = queue.map((item) => (item.id === next.id ? next : item));
    localStorage.setItem(STORE_KEY, JSON.stringify(updated));
    setQueue(updated);
    setNotice(text);
  }

  if (!driver) return <h2>Onboarding queue</h2>;
  const required = requiredDocuments(driver);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Onboarding queue</h2>
          <p>11 documents. PDF or image, max 10 MB. Fleet partners skip company registration. Queue SLA is 1 day. Expiry dates are not confirmed yet.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <DataTable
          head={["Driver", "Name", "Fleet", "Status", "Vehicle"]}
          rows={queue.map((item) => [item.id, item.name, item.fleet ? "Fleet" : "Individual", item.status, `${item.vehicle.year} ${item.vehicle.category} ${item.vehicle.fuel} ${item.vehicle.seats} seats`])}
          onRow={(index) => {
            const id = queue[index]?.id;
            if (id) setSelectedId(id);
          }}
        />
      </article>
      <article className="panel">
        <h3>{driver.name}</h3>
        <p className="state-line">{driver.id} · {driver.status} · {driver.fleet ? "Fleet exemption: company registration is not required." : "Company registration is required."} Vehicle minimum year 2015. Electric must be electric. XL needs 6 seats.</p>
        <DataTable
          head={["Document", "Required", "Status", "Review"]}
          rows={DRIVER_DOCUMENTS.map((id) => {
            const needed = required.includes(id);
            const status = driver.documents[id];
            return [
              id,
              needed ? "Required" : "Exempt",
              status,
              needed ? (
                <span key={id}>
                  {(["approved", "rejected", "in_review"] as DocStatus[]).map((next) => (
                    <CommandButton command="admin.driver.review" key={next} className="link-action" type="button" onDone={() => save(reviewDocument(driver, id, next), next === "rejected" ? "Rejected. The driver will see the reason on the app." : "Document updated.")}>
                      {next}
                    </CommandButton>
                  ))}
                </span>
              ) : "Not required",
            ];
          })}
        />
        <div className="actions">
          <CommandButton command="admin.driver.approveAll" className="secondary-btn" type="button" onDone={() => save(approveRemaining(driver), "Documents approved.")}>
            Approve remaining
          </CommandButton>
          <CommandButton command="admin.driver.activate" className="primary-btn" type="button" onDone={() => {
            const result = activate(driver);
            if (result.error) setNotice(result.error);
            else save(result.driver, "Driver is active. New offers can be sent.");
          }}>
            Activate
          </CommandButton>
        </div>
      </article>
    </>
  );
}
