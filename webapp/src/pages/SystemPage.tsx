const INTEGRATIONS = [
  ["Maps", "OpenStreetMap", "Connected"],
  ["Google Maps key", "empty", "Not connected"],
  ["SMS", "6-digit demo code", "Simulated"],
  ["Payouts", "Demo ledger", "Simulated"],
  ["Admin API", "Fixture adapter", "Demo data"],
] as const;

export function SystemPage() {
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
      <p className="state-line">Production build refuses the fixture adapter. This screen cannot run a query.</p>
    </>
  );
}
