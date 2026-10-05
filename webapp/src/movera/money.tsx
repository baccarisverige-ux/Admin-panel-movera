import { useMemo, useState } from "react";
import { decideRefund, reviewBank, savePrice, togglePayment } from "./actions";
import { CATEGORIES, PAYMENTS, quoteOre, ZONES, type CategoryId, type ZoneId } from "./domain";
import { formatSek } from "./format";
import { scopedDrivers, useAdmin } from "./store";
import { A, Button, DataTable, Field, Guard, PageHead, Panel, Select, StatusBadge, TextInput } from "./ui";

export function PricingScreen() {
  const { db, run } = useAdmin();
  const [zone, setZone] = useState<ZoneId>("norrmalm");
  const [category, setCategory] = useState<CategoryId>("economy");
  const [km, setKm] = useState(8);
  const [minutes, setMinutes] = useState(18);
  const [increase, setIncrease] = useState(0);
  if (!db) return null;
  const price = db.prices.find((row) => row.zoneId === zone && row.category === category)!;
  const quote = quoteOre(price, km, minutes, increase * 100);
  return (
    <Guard need="pricing.edit">
      <PageHead title="Pricing" subtitle="Seven categories, in kronor, per zone. Amounts are stored in öre." />
      <Panel className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Zone"><Select value={zone} onChange={(event) => setZone(event.target.value as ZoneId)}>{ZONES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)}>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Distance km"><TextInput type="number" value={km} onChange={(event) => setKm(Number(event.target.value))} /></Field>
          <Field label="Duration min"><TextInput type="number" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></Field>
        </div>
        <p className="mt-3 text-sm">Quote <span className="font-semibold tabular-nums">{formatSek(quote.total)}</span> · rule v{db.rev} {quote.hitMin ? "(minimum fare)" : ""}{quote.hitMax ? "(maximum fare)" : ""}</p>
        <p className="text-xs text-muted">Same formula as the rider quote: pickup + km + minutes + increase, then min and max. Turning a payment method off affects the next checkout only.</p>
        <p className="text-xs text-muted">Pickup {formatSek(price.pickup)} · {formatSek(price.perKm)}/km · {formatSek(price.perMin)}/min</p>
      </Panel>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-muted"><tr>{["Category", "Pickup", "Per km", "Per min", "Min", "Max", "Increase max", "Cancel"].map((head) => <th key={head} className="border-b border-line px-3 py-3 font-medium">{head}</th>)}</tr></thead>
          <tbody>
            {CATEGORIES.map((item) => {
              const row = db.prices.find((priceRow) => priceRow.zoneId === zone && priceRow.category === item.id)!;
              return (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{item.name}<span className="block text-xs text-muted">{item.line}</span></td>
                  {(["pickup", "perKm", "perMin", "minFare", "maxFare", "increaseMax", "cancelFee"] as const).map((field) => (
                    <td key={field} className="px-3 py-3">
                      <input
                        className="h-10 w-24 rounded-lg border border-line px-2 text-sm tabular-nums"
                        defaultValue={(row[field] / 100).toFixed(2)}
                        onBlur={(event) => {
                          const ore = Math.round(Number(event.target.value.replace(",", ".")) * 100);
                          if (Number.isFinite(ore)) void run((data, who) => savePrice(data, who, { zoneId: zone, category: item.id, field, ore }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Panel>
          <h3 className="font-semibold">Ride options</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {db.options.map((option) => <li key={option.id} className="flex justify-between"><span className="capitalize">{option.id}</span><span className="tabular-nums">{formatSek(option.extraOre)}</span></li>)}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Tips and payment methods</h3>
          <p className="mt-1 text-sm text-muted">Tips {db.settings.tipsEnabled ? db.settings.tips.map((tip) => formatSek(tip)).join(" · ") : "off"}</p>
          <ul className="mt-3 space-y-2">
            {PAYMENTS.map((method) => (
              <li key={method.id} className="flex items-center justify-between text-sm">
                <span>{method.name}</span>
                <Button variant="ghost" onClick={() => void run((data, who) => togglePayment(data, who, method.id))}>{db.settings.paymentMethods[method.id] ? "On" : "Off"}</Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Guard>
  );
}

export function PaymentsScreen() {
  const { db, agent, run, can } = useAdmin();
  const [tab, setTab] = useState(can("payouts.manage") ? "payouts" : can("refunds.approve") ? "refunds" : "bank");
  const banks = useMemo(() => {
    if (!db || !agent) return [];
    return scopedDrivers(db, agent).filter((driver) => driver.bank.status === "in_review");
  }, [db, agent]);
  if (!db || !agent) return null;
  return (
    <Guard need={["payouts.manage", "refunds.approve", "bank.review"]}>
      <PageHead title="Payments" subtitle="Payouts, receipt issues and bank details. All figures are kronor." />
      <div className="mb-4 flex gap-2">
        {[["payouts", "Payouts"], ["refunds", "Refunds"], ["bank", "Bank details"]].map(([id, label]) => (
          <button key={id} className={`h-11 rounded-full px-3 text-sm ${tab === id ? "bg-ink text-paper" : "border border-line bg-paper"}`} onClick={() => setTab(id!)}>{label}</button>
        ))}
      </div>
      {tab === "payouts" ? (
        <DataTable
          rows={db.payouts.filter((row) => scopedDrivers(db, agent).some((driver) => driver.id === row.driverId))}
          rowKey={(row) => row.id}
          empty="No payouts."
          columns={[
            { key: "driver", header: "Driver", render: (row) => { const driver = db.drivers.find((item) => item.id === row.driverId); return driver ? <A href={`/drivers/${driver.id}`} className="underline-offset-2 hover:underline">{driver.firstName} {driver.lastName}</A> : row.driverId; } },
            { key: "period", header: "Period", render: (row) => row.period },
            { key: "net", header: "Net", render: (row) => formatSek(row.net) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      ) : null}
      {tab === "refunds" ? (
        <div className="space-y-2">
          {db.refunds.map((item) => (
            <Panel key={item.id}>
              <p className="font-medium">{item.report}</p>
              <p className="text-sm text-muted"><A href={`/trips/${item.tripId}`} className="underline-offset-2 hover:underline">{item.tripId}</A> · {formatSek(item.amount)}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={item.status === "open" ? "pending" : item.status} label={item.status} />
                {item.status === "open" && can("refunds.approve") ? (
                  <>
                    <Button onClick={() => void run((data, who) => decideRefund(data, who, { refundId: item.id, decision: "approved" }))}>Approve refund</Button>
                    <Button variant="danger" onClick={() => { const why = window.prompt("Reject reason"); if (why) void run((data, who) => decideRefund(data, who, { refundId: item.id, decision: "rejected", reason: why })); }}>Reject</Button>
                  </>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
      {tab === "bank" ? (
        <div className="space-y-2">
          {banks.map((driver) => (
            <Panel key={driver.id}>
              <A href={`/drivers/${driver.id}`} className="font-medium underline-offset-2 hover:underline">{driver.firstName} {driver.lastName}</A>
              <p className="text-sm text-muted">{driver.bank.bankName} · {driver.bank.kind === "se" ? `clearing ${driver.bank.clearing}` : "IBAN"}</p>
              {can("bank.review") ? <Button className="mt-2" onClick={() => void run((data, who) => reviewBank(data, who, { driverId: driver.id, decision: "approved" }))}>Approve</Button> : null}
            </Panel>
          ))}
          {banks.length === 0 ? <Panel>No bank details waiting.</Panel> : null}
        </div>
      ) : null}
    </Guard>
  );
}
