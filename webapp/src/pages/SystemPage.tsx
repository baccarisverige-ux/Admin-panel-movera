import { useAdminApi } from "../api/AdminApiContext";
import { useFreshness } from "../api/hooks";
const INTEGRATIONS = [
  ["Maps", "OpenStreetMap", "Configured tile provider; availability not probed"],
  ["Google Maps key", "empty", "Not connected"],
  ["SMS", "6-digit demo code", "Simulated"],
  ["Payouts", "Demo ledger", "Simulated"],
  ["Admin API", "Fixture adapter", "Demo data"],
] as const;

export function SystemPage() {
  const api=useAdminApi(); const freshness=useFreshness();
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>System</h2>
          <p>Read-only. No secrets and no database console.</p>
        </div>
      </div>
      <ul aria-label="Integrations">
        {INTEGRATIONS.map(([name, value, state]) => (
          <li key={name}>{name}: {value} · {state}</li>
        ))}
      </ul>
      <p className="state-line">Transport: {api.kind} · Simulation: {api.demo ? "yes" : "no"} · Data updated {freshness.data ?? "unavailable"}. External SMS, payout and mobile delivery are not verified.</p>
    </>
  );
}
