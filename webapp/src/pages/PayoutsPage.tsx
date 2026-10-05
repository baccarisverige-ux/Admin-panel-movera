import { useState } from "react";
import { markPaid, useRecords, type BankAccount, type Payout } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { CommandButton } from "../ui/CommandButton";

export function PayoutsPage() {
  const payouts = useRecords("payouts", null);
  const [payout, setPayout] = useState<Payout>({ id: "PO1", driverId: "D0001", amountOre: 125000, status: "pending" });
  const [bank, setBank] = useState<BankAccount>({ driverId: "D0001", status: "in_review" });
  const [notice, setNotice] = useState("No one can type a balance. Turning a method off affects new checkouts only.");

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payouts</h2>
          <p>Weekly payouts. Wallet top-up amounts today are 100, 200 and 500 kr. Refunds of 200 kr or more need a second person. Demo rows {payouts.data?.length ?? "…"}.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <h3>{payout.id}</h3>
        <p>{payout.driverId} · {formatOre(payout.amountOre)} · {payout.status}. Bank {bank.status}.</p>
        <div className="actions">
          <CommandButton command="admin.payment.approveBank" className="secondary-btn" type="button" onDone={() => { setBank({ ...bank, status: "approved" }); setNotice("Bank details approved."); }}>
            Approve bank
          </CommandButton>
          <CommandButton command="admin.payment.markPaid" className="primary-btn" type="button" onDone={() => {
            const result = markPaid(payout, bank);
            if (result.error) setNotice(result.error);
            else {
              setPayout(result.payout);
              setNotice("Payout marked paid once.");
            }
          }}>
            Mark paid
          </CommandButton>
        </div>
      </article>
      <article className="panel">
        <h3>Other weeks</h3>
        <ul>
          {(payouts.data ?? []).map((row) => <li key={row.id}>{row.id} · {row.name} · {formatOre(row.fareOre ?? 0)} · {row.status}</li>)}
        </ul>
      </article>
    </>
  );
}
