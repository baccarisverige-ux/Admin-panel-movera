import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { decideRefund, decideRelease, moderateReview, patchSettings, reviewBank, saveContentToggle, saveDraft, toggleCancelReason, togglePayment } from "./actions";
import {
  CATEGORIES,
  DOC_DEFS,
  PAYMENTS,
  RIDE_OPTIONS,
  ZONE_LAYOUT,
  ZONES,
  personName,
  vehicleIssue,
  zoneName,
  type Settings,
  type ZoneId,
} from "./domain";
import { formatSek } from "./format";
import { useAdmin } from "./store";
import { A, Button, Field, Guard, PageHead, Panel, StatusBadge, TextInput } from "./ui";

function metersPerSecond(km: number, minutes: number) {
  if (minutes <= 0) return 0;
  return (km * 1000) / (minutes * 60);
}

function Num({ label, value, onSave }: { label: string; value: number; onSave: (n: number) => void }) {
  return (
    <Field label={label}>
      <TextInput
        key={`${label}-${value}`}
        defaultValue={String(value)}
        onBlur={(event) => {
          const next = Number(event.target.value.replace(",", "."));
          if (Number.isFinite(next)) onSave(next);
        }}
      />
    </Field>
  );
}

function Switch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      <Button variant="ghost" onClick={onClick}>{on ? "On" : "Off"}</Button>
    </div>
  );
}

export function LiveMapScreen() {
  const { db } = useAdmin();
  const [picked, setPicked] = useState<string | null>(null);
  if (!db) return null;
  const markers = db.drivers.filter((driver) => driver.onlineStatus === "online" || driver.onlineStatus === "on_trip" || driver.onlineStatus === "going_online").slice(0, 40);
  return (
    <Guard need="trips.view">
      <PageHead title="Live map" subtitle="Schematic of Greater Stockholm. Pins are zone positions, not a live GPS feed. Stale means the driver is still connecting." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-paper">
          <svg viewBox="0 0 100 100" className="h-[420px] w-full" role="img" aria-label="Stockholm zones">
            <rect width="100" height="100" fill="#f7f8f7" />
            <path d="M8 70 C 20 62, 30 78, 48 74 C 60 70, 70 80, 92 68" fill="none" stroke="#d5dbd8" strokeWidth="6" />
            {ZONES.map((zone) => {
              const point = ZONE_LAYOUT[zone.id];
              const active = db.trips.some((trip) => trip.zoneId === zone.id && ["driver_to_pickup", "arrived", "in_trip", "approaching_dropoff"].includes(trip.status));
              return (
                <g key={zone.id} onClick={() => setPicked(zone.id)} className="cursor-pointer">
                  <circle cx={point.x} cy={point.y} r={zone.airport ? 4.2 : 3.4} fill={active ? "#1FA463" : "#111614"} />
                  <text x={point.x + 4} y={point.y + 1} fontSize="2.4" fill="#111614">{zone.name}</text>
                </g>
              );
            })}
            {markers.map((driver, index) => {
              const point = ZONE_LAYOUT[driver.zoneId];
              const stale = driver.onlineStatus === "going_online";
              const dx = ((index % 5) - 2) * 1.6;
              const dy = (Math.floor(index / 5) % 3 - 1) * 1.6;
              return <circle key={driver.id} cx={point.x + dx} cy={point.y + 6 + dy} r="0.9" fill={stale ? "#D08A1E" : "#111614"} />;
            })}
          </svg>
          <p className="border-t border-line px-4 py-2 text-xs text-muted">No-pickup example: Drottninggatan 40–50 is blocked in Norrmalm. Airport queues: Arlanda and Bromma. Amber dots are stale.</p>
        </div>
        <div className="space-y-2">
          {(picked ? ZONES.filter((zone) => zone.id === picked) : ZONES).slice(0, 6).map((zone) => {
            const drivers = db.drivers.filter((driver) => driver.zoneId === zone.id && (driver.onlineStatus === "online" || driver.onlineStatus === "on_trip"));
            const trips = db.trips.filter((trip) => trip.zoneId === zone.id && ["searching", "driver_to_pickup", "arrived", "in_trip"].includes(trip.status));
            return (
              <Panel key={zone.id}>
                <h3 className="font-semibold">{zone.name}</h3>
                <p className="text-sm text-muted">{drivers.length} online · {trips.length} live · {zone.airport ? "airport queue" : "city"}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {trips.slice(0, 3).map((trip) => <li key={trip.id}><A href={`/trips/${trip.id}`} className="underline-offset-2 hover:underline">{trip.id}</A> · {trip.status.replaceAll("_", " ")}</li>)}
                </ul>
              </Panel>
            );
          })}
        </div>
      </div>
    </Guard>
  );
}

export function SearchScreen() {
  const { db } = useAdmin();
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const q = useMemo(() => (new URLSearchParams(search).get("q") || "").trim().toLowerCase(), [search]);
  if (!db) return null;
  const drivers = db.drivers.filter((item) => `${item.id} ${item.firstName} ${item.lastName} ${item.phone}`.toLowerCase().includes(q)).slice(0, 8);
  const riders = db.riders.filter((item) => `${item.id} ${item.firstName} ${item.lastName} ${item.phone}`.toLowerCase().includes(q)).slice(0, 8);
  const trips = db.trips.filter((item) => item.id.toLowerCase().includes(q)).slice(0, 8);
  const plates = db.vehicles.filter((item) => item.plate.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)).slice(0, 8);
  const tickets = db.tickets.filter((item) => `${item.id} ${item.subject}`.toLowerCase().includes(q)).slice(0, 8);
  const reservations = db.reservations.filter((item) => item.id.toLowerCase().includes(q)).slice(0, 8);
  const empty = q.length > 0 && !drivers.length && !riders.length && !trips.length && !plates.length && !tickets.length && !reservations.length;
  return (
    <div>
      <PageHead title="Search" subtitle="Driver, rider, trip, reservation, ticket or plate. Demo records only." />
      {!q ? <Panel><p className="text-sm text-muted">Type in the search box in the top bar.</p></Panel> : null}
      {empty ? <Panel><p className="text-sm">No match for “{q}”.</p></Panel> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {drivers.length ? <Panel><h3 className="font-semibold">Drivers</h3><ul className="mt-2 space-y-1 text-sm">{drivers.map((item) => <li key={item.id}><A className="underline-offset-2 hover:underline" href={`/drivers/${item.id}`}>{personName(item)}</A> · {item.id}</li>)}</ul></Panel> : null}
        {riders.length ? <Panel><h3 className="font-semibold">Riders</h3><ul className="mt-2 space-y-1 text-sm">{riders.map((item) => <li key={item.id}><A className="underline-offset-2 hover:underline" href={`/riders/${item.id}`}>{personName(item)}</A> · {item.id}</li>)}</ul></Panel> : null}
        {trips.length ? <Panel><h3 className="font-semibold">Trips</h3><ul className="mt-2 space-y-1 text-sm">{trips.map((item) => <li key={item.id}><A className="underline-offset-2 hover:underline" href={`/trips/${item.id}`}>{item.id}</A> · {item.status.replaceAll("_", " ")}</li>)}</ul></Panel> : null}
        {reservations.length ? <Panel><h3 className="font-semibold">Reservations</h3><ul className="mt-2 space-y-1 text-sm">{reservations.map((item) => <li key={item.id}>{item.id} · {item.status}</li>)}</ul></Panel> : null}
        {plates.length ? <Panel><h3 className="font-semibold">Plates</h3><ul className="mt-2 space-y-1 text-sm">{plates.map((item) => <li key={item.id}><A className="underline-offset-2 hover:underline" href={`/drivers/${item.driverId}`}>{item.plate}</A> · {item.make} {item.model}</li>)}</ul></Panel> : null}
        {tickets.length ? <Panel><h3 className="font-semibold">Tickets</h3><ul className="mt-2 space-y-1 text-sm">{tickets.map((item) => <li key={item.id}><A className="underline-offset-2 hover:underline" href={`/support/${item.id}`}>{item.id}</A> · {item.subject}</li>)}</ul></Panel> : null}
      </div>
    </div>
  );
}

export function DispatchScreen() {
  const { db, run } = useAdmin();
  const [zone, setZone] = useState<ZoneId | "market">("market");
  if (!db) return null;
  const base = db.settings.dispatch;
  const over = zone === "market" ? {} : db.settings.dispatchByZone?.[zone] ?? {};
  const d = { ...base, ...over };
  const save = (patch: Partial<Settings["dispatch"]>) => {
    if (zone === "market") {
      void run((data, who) => patchSettings(data, who, { dispatch: { ...data.settings.dispatch, ...patch } }));
      return;
    }
    void run((data, who) => patchSettings(data, who, { dispatchByZone: { ...data.settings.dispatchByZone, [zone]: { ...data.settings.dispatchByZone?.[zone], ...patch } } }));
  };
  return (
    <Guard need="settings.edit">
      <PageHead title="Dispatch rules" subtitle="Market values, with a zone override when you pick one area. Offer time today is 8.5 seconds." />
      <Panel>
        <Field label="Applies to">
          <select className="h-11 rounded-xl border border-line px-3 text-sm" value={zone} onChange={(event) => setZone(event.target.value as ZoneId | "market")}>
            <option value="market">Whole market</option>
            {ZONES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Num label="Offer time, home (seconds)" value={d.offerSeconds} onSave={(n) => save({ offerSeconds: n })} />
          <Num label="Offer time, on trip (seconds)" value={d.onTripOfferSeconds} onSave={(n) => save({ onTripOfferSeconds: n })} />
          <Num label="Radar pick window (seconds)" value={d.radarPickSeconds} onSave={(n) => save({ radarPickSeconds: n })} />
          <Num label="Max Radar offers" value={d.maxRadarOffers} onSave={(n) => save({ maxRadarOffers: n })} />
          <Num label="Search radius (km)" value={d.searchKm} onSave={(n) => save({ searchKm: n })} />
          <Num label="Next-trip radar (km)" value={d.radarKm} onSave={(n) => save({ radarKm: n })} />
          <Num label="Approaching pickup (m)" value={d.approachMeters} onSave={(n) => save({ approachMeters: n })} />
          <Num label="I’ve arrived distance (m)" value={d.arrivedMeters} onSave={(n) => save({ arrivedMeters: n })} />
          <Num label="Free waiting (seconds)" value={d.freeWaitSeconds} onSave={(n) => save({ freeWaitSeconds: n })} />
          <Num label="No-show wait (minutes)" value={d.noShowMinutes} onSave={(n) => save({ noShowMinutes: n })} />
          <Num label="Quote valid (seconds)" value={d.quoteSeconds} onSave={(n) => save({ quoteSeconds: n })} />
          <Num label="Destination mode uses" value={d.destinationUses} onSave={(n) => save({ destinationUses: n })} />
        </div>
        <Switch label="Airport queue" on={d.airportQueue} onClick={() => save({ airportQueue: !d.airportQueue })} />
      </Panel>
    </Guard>
  );
}

export function RiskScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const limit = db.settings.driving.impossibleMps;
  const flagged = db.trips.filter((trip) => metersPerSecond(trip.km, trip.minutes) > limit);
  return (
    <Guard need="safety.respond">
      <PageHead title="Risk" subtitle="Impossible-travel check. The rider app uses 55 m/s today. Ratings stay read-only." />
      <Panel className="mb-4 max-w-sm">
        <Num label="Impossible travel (m/s)" value={limit} onSave={(n) => void run((data, who) => patchSettings(data, who, { driving: { ...data.settings.driving, impossibleMps: n } }))} />
      </Panel>
      <Panel>
        <p className="text-sm text-muted">{flagged.length} trips in the demo are faster than this limit.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {flagged.slice(0, 12).map((trip) => (
            <li key={trip.id}><A href={`/trips/${trip.id}`} className="underline-offset-2 hover:underline">{trip.id}</A> · {metersPerSecond(trip.km, trip.minutes).toFixed(1)} m/s · {trip.km} km</li>
          ))}
          {flagged.length === 0 ? <li>None in the current seed.</li> : null}
        </ul>
      </Panel>
    </Guard>
  );
}

export function VehiclesScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="vehicles.review">
      <PageHead title="Vehicles" subtitle="Papers, plates and category rules. Electric needs an electric car. XL needs 6 seats. Minimum year 2016." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-muted"><tr>{["Plate", "Vehicle", "Seats", "Fuel", "XL", "Electric", "Driver"].map((head) => <th key={head} className="border-b border-line px-3 py-3 font-medium">{head}</th>)}</tr></thead>
          <tbody>
            {db.vehicles.slice(0, 40).map((vehicle) => {
              const driver = db.drivers.find((item) => item.id === vehicle.driverId);
              return (
                <tr key={vehicle.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{vehicle.plate}</td>
                  <td className="px-3 py-3">{vehicle.make} {vehicle.model} · {vehicle.year}</td>
                  <td className="px-3 py-3 tabular-nums">{vehicle.seats}</td>
                  <td className="px-3 py-3">{vehicle.fuel ?? "—"}</td>
                  <td className="px-3 py-3">{vehicleIssue(vehicle, "xl") ?? "OK"}</td>
                  <td className="px-3 py-3">{vehicleIssue(vehicle, "electric") ?? "OK"}</td>
                  <td className="px-3 py-3">{driver ? <A href={`/drivers/${driver.id}`} className="underline-offset-2 hover:underline">{personName(driver)}</A> : vehicle.driverId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Guard>
  );
}

export function ReviewsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const rated = db.trips.filter((trip) => typeof trip.rating === "number" && !trip.reviewHidden);
  const avg = rated.length ? rated.reduce((sum, trip) => sum + (trip.rating ?? 0), 0) / rated.length : 0;
  return (
    <Guard need="drivers.view">
      <PageHead title="Reviews" subtitle="Rider rates driver, and driver rates rider when that rating exists. Window: last 100 completed requests. Cancel reasons that count as driver fault are marked on Reasons." />
      <Panel className="mb-4"><p className="text-sm">Average shown <span className="font-semibold tabular-nums">{avg.toFixed(2)}</span> from {rated.length} visible ratings. Hiding a rating keeps the original.</p></Panel>
      <ul className="space-y-2">
        {db.trips.filter((trip) => typeof trip.rating === "number").slice(0, 20).map((trip) => (
          <li key={trip.id} className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
            <A href={`/trips/${trip.id}`} className="font-medium underline-offset-2 hover:underline">{trip.id}</A>
            <span className="text-muted"> · rider gave {trip.rating} / 5{trip.driverRating ? ` · driver gave ${trip.driverRating}` : ""}{trip.reviewHidden ? " · hidden" : ""}</span>
            {trip.reviewNote ? <span className="block text-xs text-muted">{trip.reviewNote}</span> : null}
            <Button className="mt-2" variant="ghost" onClick={() => {
              const why = window.prompt("Reason");
              if (why) void run((data, who) => moderateReview(data, who, { tripId: trip.id, hide: !trip.reviewHidden, reason: why }));
            }}>{trip.reviewHidden ? "Restore" : "Hide"}</Button>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function RefundsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="refunds.approve">
      <PageHead title="Refunds" subtitle="One decision per case. A retry does not create a second refund." />
      <ul className="space-y-2">
        {db.refunds.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><span className="font-medium">{item.id}</span> · {formatSek(item.amount)} · {item.report}</span>
              <StatusBadge status={item.status} />
            </div>
            {item.status === "open" || item.status === "pending_approval" ? (
              <div className="mt-2 flex gap-2">
                <Button onClick={() => void run((data, who) => decideRefund(data, who, { refundId: item.id, decision: "approved" }))}>Approve</Button>
                <Button variant="danger" onClick={() => void run((data, who) => decideRefund(data, who, { refundId: item.id, decision: "rejected", reason: "Not a receipt error" }))}>Reject</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function PayoutsScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="payouts.manage">
      <PageHead title="Payouts" subtitle="Weekly driver payouts. Balances are not typed here." />
      <ul className="space-y-2 text-sm">
        {db.payouts.slice(0, 30).map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3">
            <span>{item.period} · <A href={`/drivers/${item.driverId}`} className="underline-offset-2 hover:underline">{item.driverId}</A></span>
            <span className="tabular-nums">{formatSek(item.net)} · {item.status}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function WalletScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const total = db.riders.reduce((sum, rider) => sum + rider.walletOre, 0);
  return (
    <Guard need="payouts.manage">
      <PageHead title="Wallet" subtitle="Top-up choices in the rider app are 100, 200 and 500 kr. Balances are shown, not edited." />
      <Panel className="mb-4"><p className="text-sm">Demo wallet total {formatSek(total)}. Presets stay 100 · 200 · 500 kr.</p></Panel>
      <ul className="space-y-2 text-sm">
        {db.riders.filter((rider) => rider.walletOre > 0).slice(0, 20).map((rider) => (
          <li key={rider.id} className="flex justify-between rounded-2xl border border-line bg-paper px-4 py-3">
            <A href={`/riders/${rider.id}`} className="underline-offset-2 hover:underline">{personName(rider)}</A>
            <span className="tabular-nums">{formatSek(rider.walletOre)}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function BankScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const queue = db.drivers.filter((driver) => driver.bank.status === "in_review");
  return (
    <Guard need="bank.review">
      <PageHead title="Bank details" subtitle="Swedish clearing plus account, or IBAN. Approval uses the same checks as the driver app." />
      <ul className="space-y-2 text-sm">
        {queue.map((driver) => (
          <li key={driver.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <A href={`/drivers/${driver.id}`} className="font-medium underline-offset-2 hover:underline">{personName(driver)}</A>
              <span className="text-muted">{driver.bank.bankName} · {driver.bank.kind === "se" ? driver.bank.clearing : "IBAN"}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => void run((data, who) => reviewBank(data, who, { driverId: driver.id, decision: "approved" }))}>Approve</Button>
              <Button variant="ghost" onClick={() => void run((data, who) => reviewBank(data, who, { driverId: driver.id, decision: "rejected", reason: "Number does not match the name" }))}>Reject</Button>
            </div>
          </li>
        ))}
        {queue.length === 0 ? <li className="text-muted">No bank details waiting.</li> : null}
      </ul>
    </Guard>
  );
}

export function MethodsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="pricing.edit">
      <PageHead title="Payment methods" subtitle="Eight methods. Turning one off affects new checkouts only." />
      <Panel>
        {PAYMENTS.map((method) => (
          <Switch key={method.id} label={method.name} on={db.settings.paymentMethods[method.id]} onClick={() => void run((data, who) => togglePayment(data, who, method.id))} />
        ))}
      </Panel>
    </Guard>
  );
}

export function ReconcileScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const captured = db.trips.filter((trip) => trip.paymentStatus === "captured").reduce((sum, trip) => sum + trip.pickupFee + trip.distanceFee + trip.timeFee + trip.tip, 0);
  const refunded = db.refunds.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);
  const paidOut = db.payouts.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.net, 0);
  return (
    <Guard need="payouts.manage">
      <PageHead title="Reconciliation" subtitle="Demo totals. Nobody can type a balance on this screen." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel><p className="text-xs text-muted">Captured fares</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatSek(captured)}</p></Panel>
        <Panel><p className="text-xs text-muted">Approved refunds</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatSek(refunded)}</p></Panel>
        <Panel><p className="text-xs text-muted">Paid payouts</p><p className="mt-2 text-2xl font-semibold tabular-nums">{formatSek(paidOut)}</p></Panel>
      </div>
    </Guard>
  );
}

export function AirportsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="settings.edit">
      <PageHead title="Airports" subtitle="Arlanda and Bromma queues. Queue position in the driver app follows this switch." />
      <Panel>
        <Switch label="Airport queue open" on={db.settings.dispatch.airportQueue} onClick={() => void run((data, who) => patchSettings(data, who, { dispatch: { ...data.settings.dispatch, airportQueue: !data.settings.dispatch.airportQueue } }))} />
        <ul className="mt-3 space-y-2 text-sm">
          {ZONES.filter((zone) => zone.airport).map((zone) => {
            const waiting = db.drivers.filter((driver) => driver.zoneId === zone.id && driver.onlineStatus === "online").length;
            return <li key={zone.id}>{zone.name} · {waiting} drivers online in this zone</li>;
          })}
        </ul>
      </Panel>
    </Guard>
  );
}

export function PickupsScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const points = new Map<string, number>();
  for (const trip of db.trips) points.set(trip.pickup.label, (points.get(trip.pickup.label) ?? 0) + 1);
  return (
    <Guard need="drivers.view">
      <PageHead title="Pickup points" subtitle="Places riders actually start from in the demo, including airports." />
      <ul className="space-y-2 text-sm">
        {[...points.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => (
          <li key={label} className="flex justify-between rounded-2xl border border-line bg-paper px-4 py-3"><span>{label}</span><span className="tabular-nums text-muted">{count}</span></li>
        ))}
      </ul>
    </Guard>
  );
}

export function CategoriesScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="pricing.edit">
      <PageHead title="Categories and options" subtitle="Seven categories. Booster seat is an option, not an eighth category. No luxury category." />
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          {CATEGORIES.map((item) => <p key={item.id} className="py-1 text-sm"><span className="font-medium">{item.name}</span> · {item.seats} seats · <span className="text-muted">{item.id}</span></p>)}
        </Panel>
        <Panel>
          {RIDE_OPTIONS.map((option) => {
            const row = db.options.find((item) => item.id === option.id);
            return <p key={option.id} className="py-1 text-sm">{option.name} · {formatSek(row?.extraOre ?? 0)}</p>;
          })}
        </Panel>
      </div>
    </Guard>
  );
}

export function BoostScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const total = db.trips.reduce((sum, trip) => sum + trip.boost, 0);
  return (
    <Guard need="pricing.edit">
      <PageHead title="Boost" subtitle="Extra kronor already attached to demo trips. Booked trips keep the boost they were quoted with." />
      <Panel><p className="text-sm">Boost on current trips {formatSek(total)}. A new boost does not rewrite an active quote.</p></Panel>
    </Guard>
  );
}

export function ChatScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="support.handle">
      <PageHead title="Chat" subtitle="Each ticket is its own thread. Opening one never shows another person’s messages." />
      <ul className="space-y-2 text-sm">
        {db.tickets.map((ticket) => (
          <li key={ticket.id}>
            <A href={`/support/${ticket.id}`} className="block rounded-2xl border border-line bg-paper px-4 py-3 hover:bg-canvas">
              <span className="font-medium">{ticket.subject}</span>
              <span className="block text-xs text-muted">{ticket.messages.length} messages · {ticket.personType} · {ticket.status}</span>
            </A>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function HelpScreen() {
  const { db } = useAdmin();
  const [id, setId] = useState(db?.articles[0]?.id ?? "");
  if (!db) return null;
  const article = db.articles.find((item) => item.id === id) ?? db.articles[0];
  return (
    <Guard need="content.edit">
      <PageHead title="Help center" subtitle="Articles the rider and driver apps can show. English only in the apps today." />
      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <ul className="space-y-1">
          {db.articles.map((item) => (
            <li key={item.id}><button type="button" className="h-11 w-full rounded-xl px-3 text-left text-sm hover:bg-paper" onClick={() => setId(item.id)}>{item.title}</button></li>
          ))}
        </ul>
        {article ? <Panel><p className="text-xs text-muted">{article.audience} · {article.topic}</p><h3 className="mt-1 font-semibold">{article.title}</h3><p className="mt-2 text-sm">{article.body}</p></Panel> : null}
      </div>
    </Guard>
  );
}

export function DriverHomeScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const perf = db.settings.performance;
  const save = (patch: Partial<Settings>) => void run((data, who) => saveContentToggle(data, who, patch));
  return (
    <Guard need="content.edit">
      <PageHead title="Driver Home" subtitle="Show or hide the numbers. The numbers themselves are computed." />
      <Panel>
        <Switch label="Show rating" on={perf.showRating} onClick={() => save({ performance: { ...perf, showRating: !perf.showRating } })} />
        <Switch label="Show acceptance" on={perf.showAcceptance} onClick={() => save({ performance: { ...perf, showAcceptance: !perf.showAcceptance } })} />
        <Switch label="Show cancellation" on={perf.showCancellation} onClick={() => save({ performance: { ...perf, showCancellation: !perf.showCancellation } })} />
        <Switch label="Reservations row" on={db.settings.scheduledRow.enabled} onClick={() => save({ scheduledRow: { ...db.settings.scheduledRow, enabled: !db.settings.scheduledRow.enabled } })} />
      </Panel>
    </Guard>
  );
}

export function BannersScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const banners = db.messages.filter((item) => item.type === "banner" || item.type === "island");
  return (
    <Guard need="messages.send">
      <PageHead title="Rider Home banners" subtitle="Banner and island messages already queued. Nothing here is sent to a real phone." />
      <ul className="space-y-2 text-sm">
        {banners.map((item) => <li key={item.id} className="rounded-2xl border border-line bg-paper px-4 py-3"><span className="font-medium">{item.title}</span><span className="block text-muted">{item.body}</span></li>)}
        {banners.length === 0 ? <li className="text-muted">No banner yet. Queue one under Messages.</li> : null}
      </ul>
    </Guard>
  );
}

export function EventsScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="content.edit">
      <PageHead title="Events" subtitle={`${db.settings.eventsTitle}. ${db.settings.eventsSubtitle}`} />
      <ul className="space-y-2 text-sm">
        {db.events.map((event) => (
          <li key={event.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">{event.title}</span> · {event.enabled ? "Published" : "Hidden"}
            <span className="block text-muted">{event.dateLabel} · {event.location} · {event.demandLabel}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function BonusesScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="content.edit">
      <PageHead title="Driver bonuses" subtitle="ARN120, EVE60 and PEAK80 as configured for Stockholm." />
      <ul className="space-y-2 text-sm">
        {db.bonuses.map((bonus) => (
          <li key={bonus.code} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">{bonus.code}</span> · {bonus.title} · {formatSek(bonus.rewardOre)}
            <span className="block text-muted">{bonus.rule} · {bonus.enabled ? "On" : "Off"}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function PromosScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="content.edit">
      <PageHead title="Rider promotions" subtitle="Codes with a per-rider limit and a budget. Usage is counted, not typed." />
      <ul className="space-y-2 text-sm">
        {db.promos.map((promo) => (
          <li key={promo.code} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">{promo.code}</span> · {formatSek(promo.offOre)} off · used {promo.used}
            <span className="block text-muted">Budget {formatSek(promo.budgetOre)} · {promo.enabled ? "On" : "Off"}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function ReferralScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const ref = db.settings.referral;
  return (
    <Guard need="content.edit">
      <PageHead title="Referral" subtitle="Inviter and invitee amounts. The rider app still says this is not available yet." />
      <Panel className="grid max-w-xl gap-3">
        <Num label="Inviter (kronor)" value={ref.inviterOre / 100} onSave={(n) => void run((data, who) => saveContentToggle(data, who, { referral: { ...data.settings.referral, inviterOre: Math.round(n * 100) } }))} />
        <Num label="Invitee (kronor)" value={ref.inviteeOre / 100} onSave={(n) => void run((data, who) => saveContentToggle(data, who, { referral: { ...data.settings.referral, inviteeOre: Math.round(n * 100) } }))} />
        <p className="text-sm text-muted">{ref.condition}</p>
      </Panel>
    </Guard>
  );
}

export function LegalScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  return (
    <Guard need="content.edit">
      <PageHead title="Legal texts" subtitle="Terms and privacy for each app. Publishing a new version is what asks people to accept again." />
      <ul className="space-y-2 text-sm">
        {db.legal.map((doc) => (
          <li key={doc.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium capitalize">{doc.app} {doc.kind}</span> · v{doc.version}
            <span className="mt-1 block text-muted">{doc.body}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function ReasonsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const lists = [
    ["driverBefore", "Driver, before pickup"],
    ["driverDuring", "Driver, during the trip"],
    ["riderFinding", "Rider, while finding a driver"],
  ] as const;
  return (
    <Guard need="settings.edit">
      <PageHead title="Reasons catalog" subtitle="Cancel reasons both apps show. Turning one off hides it. It does not rewrite old trips." />
      <div className="grid gap-3 lg:grid-cols-3">
        {lists.map(([key, title]) => (
          <Panel key={key}>
            <h3 className="font-semibold">{title}</h3>
            {db.cancelLists[key].map((reason) => (
              <Switch key={reason.code} label={reason.title} on={reason.on} onClick={() => void run((data, who) => toggleCancelReason(data, who, { list: key, code: reason.code }))} />
            ))}
          </Panel>
        ))}
      </div>
    </Guard>
  );
}

export function FeaturesScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const s = db.settings;
  return (
    <Guard need="settings.edit">
      <PageHead title="Features" subtitle="Switches both apps read. Luxury is not a feature. Cash, Swish and wallet are payment methods." />
      <Panel>
        <Switch label="Scheduled rides" on={s.scheduledRow.enabled} onClick={() => void run((data, who) => patchSettings(data, who, { scheduledRow: { ...s.scheduledRow, enabled: !s.scheduledRow.enabled } }))} />
        <Switch label="Tips" on={s.tipsEnabled} onClick={() => void run((data, who) => patchSettings(data, who, { tipsEnabled: !s.tipsEnabled }))} />
        <Switch label="PIN at pickup" on={s.safety.pin} onClick={() => void run((data, who) => patchSettings(data, who, { safety: { ...s.safety, pin: !s.safety.pin } }))} />
        <Switch label="Share trip" on={s.safety.shareTrip} onClick={() => void run((data, who) => patchSettings(data, who, { safety: { ...s.safety, shareTrip: !s.safety.shareTrip } }))} />
        <Switch label="Phone sign-in" on={s.signIn.phone} onClick={() => void run((data, who) => patchSettings(data, who, { signIn: { ...s.signIn, phone: !s.signIn.phone } }))} />
        <Switch label="Apple sign-in" on={s.signIn.apple} onClick={() => void run((data, who) => patchSettings(data, who, { signIn: { ...s.signIn, apple: !s.signIn.apple } }))} />
        <Switch label="Google sign-in" on={s.signIn.google} onClick={() => void run((data, who) => patchSettings(data, who, { signIn: { ...s.signIn, google: !s.signIn.google } }))} />
      </Panel>
    </Guard>
  );
}

export function VersionsScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const rows = [
    ["Driver iOS", db.settings.versions.driverIos],
    ["Driver Android", db.settings.versions.driverAndroid],
    ["Rider iOS", db.settings.versions.riderIos],
    ["Rider Android", db.settings.versions.riderAndroid],
  ] as const;
  return (
    <Guard need="settings.edit">
      <PageHead title="App versions" subtitle="Latest and minimum for each app. Forced update is the minimum." />
      <ul className="space-y-2 text-sm">
        {rows.map(([label, version]) => (
          <li key={label} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">{label}</span> · latest {version.latest} · minimum {version.minimum}
            <span className="block text-muted">{version.mandatory ? "Forced" : "Can dismiss"} · {version.title}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function ReservationRulesScreen() {
  const { db, run } = useAdmin();
  const [lang, setLang] = useState<"en" | "sv">("en");
  if (!db) return null;
  const r = db.settings.reservations;
  const save = (patch: Partial<Settings["reservations"]>) => void run((data, who) => patchSettings(data, who, { reservations: { ...data.settings.reservations, ...patch } }));
  return (
    <Guard need="settings.edit">
      <PageHead title="Reservation rules" subtitle="Horizon, lead time, give-up, fees and the nine policy texts. Bookings keep the version they were quoted with." />
      <Panel>
        <div className="grid gap-3 md:grid-cols-2">
          <Num label="Book ahead (days)" value={r.bookAheadDays} onSave={(n) => save({ bookAheadDays: n })} />
          <Num label="Assign before pickup (hours)" value={r.earliestAssignHours} onSave={(n) => save({ earliestAssignHours: n })} />
          <Num label="Give-up time (minutes)" value={r.giveUpMinutes} onSave={(n) => save({ giveUpMinutes: n })} />
          <Num label="Included waiting (minutes)" value={r.waitingMinutes} onSave={(n) => save({ waitingMinutes: n })} />
          <Num label="Free cancel (hours)" value={r.freeCancelHours} onSave={(n) => save({ freeCancelHours: n })} />
          <Num label="Cancel fee (kronor)" value={r.cancelFeeOre / 100} onSave={(n) => save({ cancelFeeOre: Math.round(n * 100) })} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant={lang === "en" ? "primary" : "ghost"} onClick={() => setLang("en")}>English</Button>
          <Button variant={lang === "sv" ? "primary" : "ghost"} onClick={() => setLang("sv")}>Swedish</Button>
        </div>
        <ul className="mt-3 space-y-3">
          {r.policy.map((item, index) => (
            <li key={item.title}>
              <Field label={item.title}>
                <textarea
                  key={`${item.title}-${lang}`}
                  className="min-h-16 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  defaultValue={item[lang]}
                  onBlur={(event) => {
                    const policy = r.policy.map((row, rowIndex) => rowIndex === index ? { ...row, [lang]: event.target.value } : row);
                    save({ policy });
                  }}
                />
              </Field>
              {item.sv.trim() === "" || item.en.trim() === "" ? <p className="text-xs text-bad">Missing translation</p> : null}
            </li>
          ))}
        </ul>
      </Panel>
    </Guard>
  );
}

export function SafetySettingsScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const s = db.settings.safety;
  const save = (patch: Partial<Settings["safety"]>) => void run((data, who) => patchSettings(data, who, { safety: { ...data.settings.safety, ...patch } }));
  return (
    <Guard need="settings.edit">
      <PageHead title="Safety settings" subtitle="PIN, RideCheck, sharing, trusted contacts and audio. SOS handling stays on Incidents." />
      <Panel>
        <Switch label="PIN required" on={s.pin} onClick={() => save({ pin: !s.pin })} />
        <Switch label="Share trip" on={s.shareTrip} onClick={() => save({ shareTrip: !s.shareTrip })} />
        <Switch label="Audio recording" on={s.audio} onClick={() => save({ audio: !s.audio })} />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Num label="RideCheck stop (minutes)" value={s.rideCheckStopMin} onSave={(n) => save({ rideCheckStopMin: n })} />
          <Num label="Route deviation (m)" value={s.deviationM} onSave={(n) => save({ deviationM: n })} />
          <Num label="Trusted contacts limit" value={s.trustedContacts} onSave={(n) => save({ trustedContacts: n })} />
        </div>
      </Panel>
    </Guard>
  );
}

export function DrivingScreen() {
  const { db, run } = useAdmin();
  if (!db) return null;
  const d = db.settings.driving;
  const save = (patch: Partial<Settings["driving"]>) => void run((data, who) => patchSettings(data, who, { driving: { ...data.settings.driving, ...patch } }));
  return (
    <Guard need="settings.edit">
      <PageHead title="Driving rules" subtitle="Hours and breaks. The driver app does not enforce these yet." />
      <Panel className="grid gap-3 md:grid-cols-2">
        <Num label="Max hours per day" value={d.maxHoursDay} onSave={(n) => save({ maxHoursDay: n })} />
        <Num label="Max hours per week" value={d.maxHoursWeek} onSave={(n) => save({ maxHoursWeek: n })} />
        <Num label="Break after (hours)" value={d.breakAfterHours} onSave={(n) => save({ breakAfterHours: n })} />
        <Num label="Warn before end (minutes)" value={d.warnMinutes} onSave={(n) => save({ warnMinutes: n })} />
      </Panel>
    </Guard>
  );
}

export function RequirementsScreen() {
  return (
    <Guard need="documents.review">
      <PageHead title="Onboarding requirements" subtitle="Eleven documents. Company registration is skipped for fleet-partner drivers." />
      <ul className="space-y-2 text-sm">
        {DOC_DEFS.map((doc) => (
          <li key={doc.key} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">{doc.name}</span>
            <span className="block text-xs text-muted">{doc.section}{"note" in doc && doc.note ? ` · ${doc.note}` : ""}</span>
          </li>
        ))}
      </ul>
    </Guard>
  );
}

export function PublishScreen() {
  const { db, run } = useAdmin();
  const [note, setNote] = useState("Stockholm price check");
  if (!db) return null;
  const current = db.releases.find((item) => item.status === "published");
  const draft = db.releases.find((item) => item.status === "draft" || item.status === "pending_approval");
  return (
    <Guard need="settings.edit">
      <PageHead title="Publish" subtitle="Draft, a second person approves, then publish. Rollback restores the previous snapshot in this demo." />
      <Panel className="mb-4">
        <Field label="Note">
          <TextInput value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <Button className="mt-3" onClick={() => void run((data, who) => saveDraft(data, who, note))}>Save draft of current rules</Button>
        {draft ? <p className="mt-3 text-sm">Open {draft.id} · v{draft.version} · {draft.status.replaceAll("_", " ")} · {draft.summary}</p> : <p className="mt-3 text-sm text-muted">No open draft.</p>}
        {draft ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void run((data, who) => decideRelease(data, who, { id: draft.id, decision: "approve" }))}>Approve</Button>
            <Button onClick={() => void run((data, who) => decideRelease(data, who, { id: draft.id, decision: "publish" }))}>Publish</Button>
          </div>
        ) : null}
        <Button className="mt-3" variant="ghost" onClick={() => void run((data, who) => decideRelease(data, who, { id: current?.id ?? "", decision: "rollback" }))}>Roll back</Button>
      </Panel>
      <ul className="space-y-2 text-sm">
        {db.releases.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <span className="font-medium">v{item.version}</span> · {item.status.replaceAll("_", " ")} · {item.summary}
            <span className="block text-xs text-muted">{item.at} · {item.authorId}{item.approverId ? ` · approved ${item.approverId}` : ""}</span>
          </li>
        ))}
        {db.releases.length === 0 ? <li className="text-muted">No versions yet. Save a draft first.</li> : null}
      </ul>
    </Guard>
  );
}

export function ApprovalsScreen() {
  const { db } = useAdmin();
  if (!db) return null;
  const refunds = db.refunds.filter((item) => item.status === "pending_approval");
  const drafts = db.releases.filter((item) => item.status === "pending_approval" || item.status === "draft");
  return (
    <Guard need={["settings.edit", "refunds.approve"]}>
      <PageHead title="Approvals" subtitle="Refunds of 200 kr or more, and rule drafts, wait for a second person." />
      <Panel>
        <h3 className="font-semibold">Money</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {refunds.map((item) => <li key={item.id}><A href="/refunds" className="underline-offset-2 hover:underline">{item.id}</A> · {formatSek(item.amount)} · first agent {item.firstAgentId}</li>)}
          {refunds.length === 0 ? <li className="text-muted">No refund is waiting.</li> : null}
        </ul>
        <h3 className="mt-4 font-semibold">Rules</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {drafts.map((item) => <li key={item.id}><A href="/publish" className="underline-offset-2 hover:underline">{item.id}</A> · {item.status.replaceAll("_", " ")}</li>)}
          {drafts.length === 0 ? <li className="text-muted">No rule draft is waiting.</li> : null}
        </ul>
      </Panel>
    </Guard>
  );
}

export function SystemScreen() {
  return (
    <Guard need="settings.edit">
      <PageHead title="System" subtitle="Read only. No secrets, no raw database, no keys in the browser." />
      <Panel className="space-y-2 text-sm">
        <p>Environment · Demo simulation</p>
        <p>Market · Stockholm · SEK · Europe/Stockholm</p>
        <p>Adapter · in-browser fixture. Production must refuse this adapter.</p>
        <p>Rider and driver apps · not connected. A save stays in this browser.</p>
        <p>Zone {zoneName("norrmalm")} is one of {ZONES.length} operating areas, including Arlanda and Bromma.</p>
      </Panel>
    </Guard>
  );
}
