import { useState } from "react";
import { useNavigate } from "react-router";
import { PAYMENT_METHODS, useRecords } from "../api/hooks";
import { CATEGORIES, formatOre } from "../domain/contract";
import { accountOk, bicOk, clearingBank, ibanOk } from "../payments/ledger";
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
  const payments = useRecords("payments", null);
  const refunds = useRecords("refunds", null);
  const wallet = useRecords("wallet", null);
  const payouts = useRecords("payouts", null);
  const rows = payments.data ?? [];
  const [zone, setZone] = useState("Z001");
  const [category, setCategory] = useState("economy");
  const [platform, setPlatform] = useState("ios");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(PAYMENT_METHODS.map((id) => [id, true])));
  const [notice, setNotice] = useState("Turning a method off stops new checkouts only. Existing authorisations continue.");
  const [clearing, setClearing] = useState("5000");
  const [account, setAccount] = useState("1234567");
  const [iban, setIban] = useState("SE4550000000058398257466");
  const [bic, setBic] = useState("ESSESESS");
  const captured = rows.filter((row) => row.status === "captured").reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const failed = rows.filter((row) => row.status === "failed").length;
  const refundedOre = (refunds.data ?? []).reduce((sum, row) => sum + (row.fareOre ?? 0), 0) + rows.filter((row) => row.status === "refunded").reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const payoutOre = (payouts.data ?? []).reduce((sum, row) => sum + (row.fareOre ?? 0), 0);
  const bankName = clearingBank(clearing);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Payments</h2>
          <p data-testid="payment-count">{rows.length} payments in the demo ledger. Amounts are SEK. Wallet top-ups are 100, 200 and 500 kr. Nobody types a balance.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>
      <article className="panel">
        <h3>Payment methods</h3>
        <div className="field-grid">
          <label>
            Zone
            <select aria-label="Method zone" value={zone} onChange={(event) => setZone(event.target.value)}>
              {ZONES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            Category
            <select aria-label="Method category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Platform
            <select aria-label="Method platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
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
                checked={enabled[method] ?? false}
                onChange={(event) => {
                  setEnabled({ ...enabled, [method]: event.target.checked });
                  setNotice(`${method} is ${event.target.checked ? "on" : "off"} for new checkouts in ${zone}, ${category}, ${platform}. Existing authorisations continue.`);
                }}
              />
              {method}
            </label>
          ))}
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
          <h3>Wallet ledger</h3>
          <p>Read only. Top-up amounts 100, 200 and 500 kr. Vouchers are posted entries, not a balance you can type.</p>
          <ul aria-label="Wallet ledger">
            {(wallet.data ?? []).map((row) => (
              <li key={row.id}>{row.name} · {formatOre(row.fareOre ?? 0)} · {row.status}</li>
            ))}
          </ul>
        </article>
        <article className="panel" data-testid="reconciliation">
          <h3>Reconciliation</h3>
          <p>Captured {formatOre(captured)}. Failed count {failed}. Refunded {formatOre(refundedOre)}. Payouts {formatOre(payoutOre)}.</p>
        </article>
      </div>
      <article className="panel">
        <h3>Bank details</h3>
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
