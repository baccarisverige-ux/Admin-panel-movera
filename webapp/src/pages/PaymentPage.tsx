import { Link, useParams } from "react-router";
import { useCommands, useRecords } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import { paymentTimeline, refundRows } from "../payments/ledger";

const REFUND_LIMIT_ORE = 20_000;

export function PaymentPage() {
  const { id = "" } = useParams();
  const payments = useRecords("payments", null);
  const commands = useCommands();
  const row = payments.data?.find((item) => item.id === id);
  if (payments.isLoading) return <p className="state-line">Loading payment.</p>;
  if (!row) {
    return (
      <div className="page-heading">
        <div>
          <h2>Payment {id}</h2>
          <p>That payment is not in the demo ledger.</p>
          <Link to="/payments">Back to payments</Link>
        </div>
      </div>
    );
  }
  const amount = row.fareOre ?? 0;
  const needsSecond = amount >= REFUND_LIMIT_ORE && row.status === "captured";
  const blocked = row.status === "refunded"
    ? "Already refunded."
    : row.status !== "captured"
      ? "Refund is only available after capture."
      : needsSecond
        ? "200 kr or more needs a second agent."
        : null;
  const matches = refundRows(payments.data ?? [], row.id);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payment {row.id}</h2>
          <p>{statusLabel(row.status)} · {formatOre(amount)} · {row.zoneId}</p>
        </div>
        <Link to="/payments">Back to payments</Link>
      </div>
      <article className="panel" data-testid="payment-timeline">
        <h3>Timeline</h3>
        <ol className="version-list">
          {paymentTimeline(row.status).map((step) => <li key={step}>{step}</li>)}
        </ol>
      </article>
      <article className="panel">
        <h3>Refund</h3>
        <p data-testid="refund-block">{blocked ?? "Refund is allowed. A double click still writes one ledger row."}</p>
        <p data-testid="refund-count">{matches.length}</p>
        <button
          data-command="admin.payment.refund"
          className="primary-btn"
          type="button"
          disabled={!!blocked || commands.phase === "submitting"}
          title={blocked ?? "Refund this payment"}
          onClick={() => {
            if (blocked) return;
            void commands.run("admin.payment.refund", {
              reason: "Safety review",
              targetId: row.id,
              collection: "payments",
              before: row.status,
              after: "refunded",
              patch: { status: "refunded" },
            });
          }}
        >
          Refund payment
        </button>
        <button
          data-command="admin.payment.refund"
          className="secondary-btn"
          type="button"
          disabled={commands.phase === "submitting"}
          onClick={() => {
            if (row.status === "refunded" || row.status !== "captured" || needsSecond) return;
            void commands.run("admin.payment.refund", {
              reason: "Safety review",
              targetId: row.id,
              collection: "payments",
              before: row.status,
              after: "refunded",
              patch: { status: "refunded" },
            });
          }}
        >
          Retry refund
        </button>
        {commands.message ? <p className="state-line">{commands.message}</p> : null}
      </article>
    </>
  );
}
