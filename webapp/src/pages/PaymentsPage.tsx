import { useState } from "react";
import { markPaid, PAYMENT_METHODS, setMethod, useRecords, type PaymentMethod } from "../api/hooks";
import { CommandButton } from "../ui/CommandButton";

const ON = Object.fromEntries(PAYMENT_METHODS.map((id) => [id, true])) as Record<PaymentMethod, boolean>;

export function PaymentsPage() {
  const [enabled, setEnabled] = useState(ON);
  const [notice, setNotice] = useState("Turning a method off affects new checkouts only.");
  const [paid, setPaid] = useState(false);
  const payments = useRecords("payments", null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payments</h2>
          <p>Methods, refunds and payouts. {payments.data?.length ?? "…"} payments. Amounts are SEK.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        {PAYMENT_METHODS.map((method) => (
          <label key={method}>
            <input
              type="checkbox"
              checked={enabled[method]}
              onChange={(event) => {
                setEnabled(setMethod(enabled, method, event.target.checked));
                setNotice(`${method} ${event.target.checked ? "on" : "off"} for new checkouts. Existing authorisations continue.`);
              }}
            />
            {method}
          </label>
        ))}
      </article>
      <article className="panel">
        <h3>Payout D1</h3>
        <CommandButton command="admin.payment.markPaid" className="primary-btn"
          type="button" onDone={() => {
            const result = markPaid(
              { id: "P1", driverId: "D1", amountOre: 125000, status: paid ? "paid" : "pending" },
              { driverId: "D1", status: "approved" },
            );
            if (result.error) setNotice(result.error);
            else {
              setPaid(true);
              setNotice("Marked paid.");
            }
          }}>
          Mark paid
        </CommandButton>
      </article>
    </>
  );
}
