export function RiskPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Risk</h2>
          <p>Thresholds the owner has not replaced. Impossible travel is an alert, not a ban by itself.</p>
        </div>
      </div>
      <div className="field-grid">
        <label>
          Impossible travel
          <input readOnly value="55 m/s" />
        </label>
        <label>
          Trusted contacts
          <input readOnly value="5" />
        </label>
        <label>
          PIN
          <input readOnly value="Required only where the zone says so. The PIN is never shown." />
        </label>
        <label>
          Driving hours
          <input readOnly value="none" />
        </label>
        <label>
          Acceptance window
          <input readOnly value="last 100 requests" />
        </label>
        <label>
          RideCheck
          <input readOnly value="Text is not confirmed." />
        </label>
      </div>
      <p className="state-line">Stale GPS and a speed over 55 m/s raise an alert. No second number is invented here.</p>
    </>
  );
}
