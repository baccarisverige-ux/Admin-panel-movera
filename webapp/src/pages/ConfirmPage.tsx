import { OPEN_VALUES } from "../config/confirm";

export function ConfirmPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>To confirm</h2>
          <p>Values the product owner has not confirmed. Today’s number is the demo default, not a second policy.</p>
        </div>
      </div>
      <div className="field-grid">
        {OPEN_VALUES.map((item) => (
          <label className="confirm-field" key={item.id}>
            {item.label}
            <input readOnly value={item.today} />
            <span className="badge-amber">To confirm</span>
          </label>
        ))}
      </div>
    </>
  );
}
