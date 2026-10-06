import { Link, useParams } from "react-router";
import { useApprovals, useCommands, useRecords } from "../api/hooks";
import { formatOre } from "../domain/contract";
import { statusLabel } from "../domain/labels";
import { paymentTimeline, refundRows } from "../payments/ledger";

const REFUND_LIMIT_ORE = 20_000;

export function PaymentPage() {
  const { id = "" } = useParams();
  const payments = useRecords("payments", null);
  const approvals = useApprovals();
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

  const payment = row;
  const amount = payment.fareOre ?? 0;
  const needsSecond = amount >= REFUND_LIMIT_ORE && payment.status === "captured";
  const pendingApproval = (approvals.data ?? []).find((item) => item.targetId === payment.id && item.action === "admin.payment.refund" && item.status === "pending");
  const blocked = payment.status === "refunded"
    ? "Already refunded."
    : payment.status !== "captured"
      ? "Refund is only available after capture."
      : pendingApproval
        ? `Pending second-agent approval ${pendingApproval.id}.`
        : null;
  const matches = refundRows(payments.data ?? [], payment.id);
  const operationKey = `refund-${payment.id}`;

  function refund() {
    if (blocked) return;
    void commands.run("admin.payment.refund", {
      reason: "Safety review",
      targetId: payment.id,
      collection: "payments",
      before: payment.status,
      after: needsSecond ? "pending approval" : "refunded",
      patch: { status: "refunded" },
      amountOre: amount,
      idempotencyKey: operationKey,
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payment {payment.id}</h2>
          <p>{statusLabel(payment.status)} · {formatOre(amount)} · {payment.zoneId}</p>
        </div>
        <Link to="/payments">Back to payments</Link>
      </div>

      <article className="panel" data-testid="payment-timeline">
        <h3>Timeline</h3>
        <ol className="version-list">
          {paymentTimeline(payment.status).map((step) => <li key={step}>{step}</li>)}
        </ol>
      </article>

      <article className="panel">
        <h3>Refund</h3>
        <p data-testid="refund-block">
          {blocked ?? (needsSecond
            ? "Refund request is allowed. Because it is 200 kr or more, the payment stays captured until a second authorised agent approves it."
            : "Refund is allowed. A double click still writes one ledger row.")}
        </p>
        <p data-testid="refund-count">{matches.length}</p>

        <button
          data-command="admin.payment.refund"
          className="primary-btn"
          type="button"
          disabled={Boolean(blocked) || commands.phase === "submitting"}
          title={blocked ?? (needsSecond ? "Request second-agent approval" : "Refund this payment")}
          onClick={refund}
        >
          {needsSecond ? "Request refund approval" : "Refund payment"}
        </button>

        <button
          data-command="admin.payment.refund"
          className="secondary-btn"
          type="button"
          disabled={commands.phase === "submitting" || Boolean(pendingApproval)}
          onClick={refund}
        >
          Retry refund
        </button>

        {pendingApproval ? <p><Link to="/audit">Open approval queue</Link></p> : null}
        {commands.message ? <p className="state-line">{commands.message}</p> : null}
      </article>
    </>
  );
}
