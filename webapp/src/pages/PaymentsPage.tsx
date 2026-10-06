import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  PAYMENT_METHODS,
  defaultFinanceBook,
  issueWalletVoucher,
  normalizeFinanceBook,
  paymentPolicy,
  runReconciliation,
  savePaymentPolicy,
  useRecords,
  useSlice,
  voidWalletVoucher,
  WALLET_TOP_UPS_ORE,
  type FinanceBook,
  type PaymentMethod,
} from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { CATEGORIES, formatOre } from "../domain/contract";
import { accountOk, bicOk, clearingBank, ibanOk } from "../payments/ledger";
import { CommandButton } from "../ui/CommandButton";
import { DataTable } from "../ui/DataTable";

const ZONES = [
  ["Z001", "Norrmalm"],
  ["Z002", "Södermalm"],
  ["Z003", "Östermalm"],
  ["ARN", "Arlanda"],
  ["BMA", "Bromma airport"],
] as const;

export function PaymentsPage() {
  const navigate = useNavigate();
  const { agent } = useSession();
  const payments = useRecords("payments", null);
  const refunds = useRecords("refunds", null);
  const wallet = useRecords("wallet", null);
  const payouts = useRecords("payouts", null);
  const financeStore = useSlice<FinanceBook>("finance", defaultFinanceBook());
  const finance = useMemo(() => normalizeFinanceBook(financeStore.value), [financeStore.value]);
  const rows = payments.data ?? [];

  const [zone, setZone] = useState("Z001");
  const [category, setCategory] = useState("economy");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [policyDraft, setPolicyDraft] = useState<Record<PaymentMethod, boolean> | null>(null);
  const [notice, setNotice] = useState("Turning a method off stops new checkouts only. Existing authorisations continue.");
  const [clearing, setClearing] = useState("5000");
  const [account, setAccount] = useState("1234567");
  const [iban, setIban] = useState("SE4550000000058398257466");
  const [bic, setBic] = useState("ESSESESS");
  const [voucherRider, setVoucherRider] = useState("R0001");
  const [voucherAmountOre, setVoucherAmountOre] = useState(10_000);
  const [voucherReason, setVoucherReason] = useState("Service recovery");
  const [reconciliationNote, setReconciliationNote] = useState("Daily close");

  const context = { zoneId: zone, category, platform };
  const persistedPolicy = paymentPolicy(finance, context);
  const shownPolicy = policyDraft ?? persistedPolicy;
  const policyDirty = JSON.stringify(shownPolicy) !== JSON.stringify(persistedPolicy);
  const policyNext = savePaymentPolicy(finance, context, shownPolicy);

  const captured = rows.filter((row) => row.status === "captured").reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const failed = rows.filter((row) => row.status === "failed").length;
  const refundedOre =
    (refunds.data ?? []).reduce((sum, row) => sum + (row.fareOre ?? 0), 0) +
    rows.filter((row) => row.status === "refunded").reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const payoutOre = (payouts.data ?? []).reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const seededWalletOre = (wallet.data ?? []).reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const voucherWalletOre = finance.vouchers
    .filter((item) => item.status === "posted")
    .reduce((sum, item) => sum + item.amountOre, 0);
  const walletOre = seededWalletOre + voucherWalletOre;
  const bankName = clearingBank(clearing);

  const voucher = agent
    ? issueWalletVoucher(finance, voucherRider, voucherAmountOre, agent.id, voucherReason, new Date().toISOString())
    : { book: finance, error: "Sign in again." };
  const reconciliation = agent
    ? runReconciliation(
        finance,
        { capturedOre: captured, refundedOre, payoutOre, walletOre, failedCount: failed },
        agent.id,
        reconciliationNote,
        new Date().toISOString(),
      )
    : { book: finance, run: null };

  if (financeStore.loading) return <p className="state-line">Loading finance controls.</p>;

  function resetPolicyContext(next: Partial<typeof context>) {
    if (next.zoneId) setZone(next.zoneId);
    if (next.category) setCategory(next.category);
    if (next.platform) setPlatform(next.platform);
    setPolicyDraft(null);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payments</h2>
          <p data-testid="payment-count">
            {rows.length} payments in the demo ledger. Amounts are SEK. Wallet vouchers are constrained to 100, 200 and 500 kr. Finance revision {finance.draftRev}.
          </p>
        </div>
      </div>
      <p className="state-line">{notice} {financeStore.message}</p>

      <article className="panel" data-testid="payment-policy">
        <h3>Payment methods</h3>
        <p>Policy is persisted by zone, category and platform. Existing authorised checkouts continue after a method is switched off.</p>
        <div className="field-grid">
          <label>
            Zone
            <select aria-label="Method zone" value={zone} onChange={(event) => resetPolicyContext({ zoneId: event.target.value })}>
              {ZONES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            Category
            <select aria-label="Method category" value={category} onChange={(event) => resetPolicyContext({ category: event.target.value })}>
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Platform
            <select aria-label="Method platform" value={platform} onChange={(event) => resetPolicyContext({ platform: event.target.value as "ios" | "android" })}>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>
          </label>
        </div>
        <div className="field-grid">
          {PAYMENT_METHODS.map((method) => (
            <label key={method} className="check-row">
              <input
                type="checkbox"
                aria-label={`${method} method`}
                checked={shownPolicy[method] ?? false}
                onChange={(event) => {
                  setPolicyDraft({ ...shownPolicy, [method]: event.target.checked });
                  setNotice(`${method} will be ${event.target.checked ? "on" : "off"} for new checkouts in ${zone}, ${category}, ${platform} after saving.`);
                }}
              />
              {method}
            </label>
          ))}
        </div>
        <div className="actions">
          <CommandButton
            command="admin.payment.savePolicy"
            className="primary-btn"
            type="button"
            targetId={`policy-${zone}-${category}-${platform}`}
            confirmTarget={false}
            scope={zone}
            before={`finance rev ${finance.draftRev}`}
            after={`${zone} ${category} ${platform} payment methods`}
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={policyNext}
            disabled={!policyDirty}
            title={!policyDirty ? "No unsaved payment-method change." : undefined}
            onDone={() => {
              setPolicyDraft(null);
              setNotice("Payment-method policy saved. Existing authorisations continue.");
            }}
          >
            Save payment methods
          </CommandButton>
          <button className="secondary-btn" type="button" disabled={!policyDirty} onClick={() => setPolicyDraft(null)}>Discard unsaved</button>
        </div>
      </article>

      <DataTable
        head={["Payment", "Method", "Status", "Zone", "Amount"]}
        rows={rows.map((row) => [row.id, row.name, row.status, row.zoneId, formatOre(row.fareOre ?? 0)])}
        state={payments.isLoading ? "loading" : payments.isError ? "error" : "ready"}
        onRetry={() => void payments.refetch()}
        onRow={(index) => {
          const id = rows[index]?.id;
          if (id) navigate(`/payments/${id}`);
        }}
      />

      <div className="split">
        <article className="panel">
          <h3>Wallet ledger and vouchers</h3>
          <p>Balances are ledger-derived. No operator can type a balance directly.</p>
          <ul aria-label="Wallet ledger">
            {(wallet.data ?? []).slice(0, 12).map((row) => (
              <li key={row.id}>{row.name} · {formatOre(row.fareOre ?? 0)} · {row.status}</li>
            ))}
            {finance.vouchers.map((item) => (
              <li key={item.id}>
                {item.id} · {item.riderId} · {formatOre(item.amountOre)} · {item.status} · {item.reason}
                {item.status === "posted" ? (
                  <CommandButton
                    command="admin.payment.voidVoucher"
                    className="link-action"
                    type="button"
                    targetId={item.id}
                    confirmTarget={false}
                    before="posted"
                    after="void"
                    expectedSliceRev={finance.draftRev}
                    sliceKey="finance"
                    value={voidWalletVoucher(finance, item.id, agent?.id ?? "", "Manual void").book}
                    onDone={() => setNotice(`${item.id} voided; the ledger entry remains visible.`)}
                  >
                    void
                  </CommandButton>
                ) : null}
              </li>
            ))}
          </ul>

          <h4>Issue wallet voucher</h4>
          <div className="field-grid">
            <label>
              Rider id
              <input aria-label="Voucher rider" value={voucherRider} onChange={(event) => setVoucherRider(event.target.value)} />
            </label>
            <label>
              Amount
              <select aria-label="Voucher amount" value={voucherAmountOre} onChange={(event) => setVoucherAmountOre(Number(event.target.value))}>
                {WALLET_TOP_UPS_ORE.map((amount) => <option key={amount} value={amount}>{formatOre(amount)}</option>)}
              </select>
            </label>
            <label>
              Voucher reason
              <input aria-label="Voucher reason" value={voucherReason} onChange={(event) => setVoucherReason(event.target.value)} />
            </label>
          </div>
          <CommandButton
            command="admin.payment.issueVoucher"
            className="primary-btn"
            type="button"
            targetId={`voucher-${voucherRider}`}
            confirmTarget={false}
            before={`${finance.vouchers.length} vouchers`}
            after={`${voucherRider} +${formatOre(voucherAmountOre)}`}
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={voucher.book}
            disabled={Boolean(voucher.error)}
            title={voucher.error}
            onDone={() => setNotice(`Wallet voucher ${formatOre(voucherAmountOre)} posted for ${voucherRider}.`)}
          >
            Issue wallet voucher
          </CommandButton>
        </article>

        <article className="panel" data-testid="reconciliation">
          <h3>Reconciliation</h3>
          <p>Captured {formatOre(captured)}. Failed count {failed}. Refunded {formatOre(refundedOre)}. Payouts {formatOre(payoutOre)}. Wallet ledger {formatOre(walletOre)}.</p>
          <p>Current settlement difference {formatOre(captured - refundedOre - payoutOre)}.</p>
          <label>
            Reconciliation note
            <input aria-label="Reconciliation note" value={reconciliationNote} onChange={(event) => setReconciliationNote(event.target.value)} />
          </label>
          <CommandButton
            command="admin.payment.reconcile"
            className="secondary-btn"
            type="button"
            targetId={`reconciliation-${finance.reconciliations.length + 1}`}
            confirmTarget={false}
            before={`${finance.reconciliations.length} runs`}
            after={reconciliation.run ? `difference ${formatOre(reconciliation.run.differenceOre)}` : "reconciliation"}
            expectedSliceRev={finance.draftRev}
            sliceKey="finance"
            value={reconciliation.book}
            onDone={() => setNotice("Reconciliation snapshot saved.")}
          >
            Save reconciliation
          </CommandButton>
          {finance.reconciliations.length === 0 ? <p className="state-line">No saved reconciliation run.</p> : (
            <ol aria-label="Reconciliation history" className="version-list">
              {finance.reconciliations.map((item) => (
                <li key={item.id}>{item.id} · {item.at} · {item.actorId} · difference {formatOre(item.differenceOre)} · {item.note}</li>
              ))}
            </ol>
          )}
        </article>
      </div>

      <article className="panel">
        <h3>Bank validation tool</h3>
        <p>Approval itself is performed on the payout workspace for the payout driver.</p>
        <div className="field-grid">
          <label>
            Clearing number
            <input aria-label="Clearing number" value={clearing} onChange={(event) => setClearing(event.target.value)} />
          </label>
          <label>
            Account
            <input aria-label="Account number" value={account} onChange={(event) => setAccount(event.target.value)} />
          </label>
          <label>
            IBAN
            <input aria-label="IBAN" value={iban} onChange={(event) => setIban(event.target.value)} />
          </label>
          <label>
            BIC
            <input aria-label="BIC" value={bic} onChange={(event) => setBic(event.target.value.toUpperCase())} />
          </label>
        </div>
        <p data-testid="bank-check">
          {bankName ? `Bank ${bankName}.` : "Clearing number does not match a bank."}
          {" "}
          {accountOk(account) ? "Account length is valid." : "Account must be 6 to 10 digits."}
          {" "}
          {ibanOk(iban) ? "IBAN checks." : "IBAN failed the mod 97 check."}
          {" "}
          {bicOk(bic) ? "BIC length is valid." : "BIC must be 8 or 11 characters."}
        </p>
      </article>
    </>
  );
}
