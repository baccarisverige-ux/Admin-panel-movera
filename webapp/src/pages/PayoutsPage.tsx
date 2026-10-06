import { useMemo, useState } from "react";
import {
  bankReview,
  bankValidation,
  defaultFinanceBook,
  markPayoutPaid,
  normalizeFinanceBook,
  payoutState,
  reviewBank,
  useRecords,
  useSlice,
  type BankReview,
  type FinanceBook,
} from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { formatOre } from "../domain/contract";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

export function PayoutsPage() {
  const { agent } = useSession();
  const payouts = useRecords("payouts", null);
  const financeStore = useSlice<FinanceBook>("finance", defaultFinanceBook());
  const finance = useMemo(() => normalizeFinanceBook(financeStore.value), [financeStore.value]);
  const rows = payouts.data ?? [];
  const [selectedId, setSelectedId] = useState("PO1");
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const [bankDraft, setBankDraft] = useState<BankReview | null>(null);
  const [bankNote, setBankNote] = useState("Verified account holder");
  const [notice, setNotice] = useState("Payout status is ledger-derived and cannot be typed manually.");

  if (payouts.isLoading || financeStore.loading) return <p className="state-line">Loading payouts.</p>;
  if (!selected) return <p className="state-line">No payouts are available.</p>;

  const driverId = selected.driverId ?? "";
  const persistedBank = bankReview(finance, driverId);
  const bank = bankDraft?.driverId === driverId ? bankDraft : persistedBank;
  const state = payoutState(finance, selected);
  const validation = bankValidation(bank);
  const approved = agent
    ? reviewBank(finance, bank, "approved", agent.id, bankNote, new Date().toISOString())
    : { book: finance, error: "Sign in again." };
  const rejected = agent
    ? reviewBank(finance, bank, "rejected", agent.id, bankNote, new Date().toISOString())
    : { book: finance, error: "Sign in again." };
  const operationKey = `payout-${selected.id}-mark-paid`;
  const paid = agent
    ? markPayoutPaid(finance, selected, agent.id, operationKey, new Date().toISOString())
    : { book: finance, error: "Sign in again." };

  function patchBank(patch: Partial<BankReview>) {
    setBankDraft({ ...bank, ...patch, status: "in_review", reviewedBy: "", reviewedAt: "", note: "" });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payouts</h2>
          <p>
            Weekly payouts. Wallet vouchers are 100, 200 and 500 kr. Refunds of 200 kr or more need a second authorised agent.
            Demo rows {rows.length}. Finance revision {finance.draftRev}.
          </p>
        </div>
      </div>
      <p className="state-line">{notice} {financeStore.message}</p>

      <DataTable
        head={["Payout", "Week", "Driver", "Amount", "Status", "Bank"]}
        rowIds={rows.map((row) => row.id)}
        rows={rows.map((row) => {
          const payout = payoutState(finance, row);
          const review = bankReview(finance, row.driverId ?? "");
          return [row.id, row.name, row.driverId ?? "", formatOre(row.fareOre ?? 0), payout.status, review.status];
        })}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) {
            setSelectedId(id);
            setBankDraft(null);
          }
        }}
        state={payouts.isError ? "error" : "ready"}
        onRetry={() => void payouts.refetch()}
      />

      <article className="panel" data-testid="payout-detail">
        <h3>{selected.id}</h3>
        <p>
          {selected.driverId} · {formatOre(selected.fareOre ?? 0)} · payout {state.status}. Bank {bank.status}.
          {state.paidAt ? ` Paid ${state.paidAt} by ${state.paidBy}.` : ""}
        </p>

        <h4>Bank review</h4>
        <div className="field-grid">
          <label>
            Clearing number
            <input aria-label="Payout clearing number" value={bank.clearing} onChange={(event) => patchBank({ clearing: event.target.value })} />
          </label>
          <label>
            Account
            <input aria-label="Payout account number" value={bank.account} onChange={(event) => patchBank({ account: event.target.value })} />
          </label>
          <label>
            IBAN
            <input aria-label="Payout IBAN" value={bank.iban} onChange={(event) => patchBank({ iban: event.target.value })} />
          </label>
          <label>
            BIC
            <input aria-label="Payout BIC" value={bank.bic} onChange={(event) => patchBank({ bic: event.target.value.toUpperCase() })} />
          </label>
          <label>
            Review note
            <input aria-label="Bank review note" value={bankNote} onChange={(event) => setBankNote(event.target.value)} />
          </label>
        </div>
        <p data-testid="payout-bank-check">{validation ?? "Bank details pass the configured validation checks."}</p>

        <div className="actions">
          <CommandButton
            command="admin.payment.approveBank"
            className="secondary-btn"
            type="button"
            targetId={driverId}
            confirmTarget={false}
            scope={selected.zoneId}
            before={persistedBank.status}
            after="approved"
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={approved.book}
            disabled={Boolean(approved.error)}
            title={approved.error}
            onDone={() => {
              setBankDraft(null);
              setNotice(`Bank details approved for ${driverId}.`);
            }}
          >
            Approve bank
          </CommandButton>
          <CommandButton
            command="admin.payment.rejectBank"
            className="secondary-btn"
            type="button"
            targetId={driverId}
            confirmTarget={false}
            scope={selected.zoneId}
            before={persistedBank.status}
            after="rejected"
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={rejected.book}
            disabled={Boolean(rejected.error)}
            title={rejected.error}
            onDone={() => {
              setBankDraft(null);
              setNotice(`Bank details rejected for ${driverId}.`);
            }}
          >
            Reject bank
          </CommandButton>
          <CommandButton
            command="admin.payment.markPaid"
            className="primary-btn"
            type="button"
            targetId={selected.id}
            confirmTarget={false}
            scope={selected.zoneId}
            idempotencyKey={operationKey}
            before={state.status}
            after="paid"
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={paid.book}
            disabled={state.status === "paid" || Boolean(paid.error)}
            title={state.status === "paid" ? "Already paid." : paid.error}
            onDone={() => setNotice("Payout marked paid once. Reusing the operation key cannot pay it twice.")}
          >
            Mark paid
          </CommandButton>
        </div>
      </article>
    </>
  );
}
