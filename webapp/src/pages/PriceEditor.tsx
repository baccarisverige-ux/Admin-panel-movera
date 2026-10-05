import { useState } from "react";
import { useCommands } from "../api/hooks";
import { CATEGORY_INFO, RIDE_OPTION_INFO, type PriceBook, type PriceCategoryId, type ZonePrice } from "../pricing/sets";

export function PriceEditor({ book, onChange }: { book: PriceBook; onChange: (book: PriceBook) => void }) {
  const commands = useCommands();
  const [zoneId, setZoneId] = useState("Z001");
  const [category, setCategory] = useState<PriceCategoryId>("economy");
  const zone = book.zones.find((item) => item.zoneId === zoneId) ?? book.zones[0];
  if (!zone) return null;
  const rate = zone.rates[category];
  const info = CATEGORY_INFO.find((item) => item.id === category);

  function patchZone(patch: Partial<ZonePrice>) {
    onChange({
      ...book,
      zones: book.zones.map((item) => (item.zoneId === zone.zoneId ? { ...item, ...patch } : item)),
    });
  }

  function patchRate(field: "pickup" | "perKm" | "perMin" | "minimum" | "maximum", value: number) {
    patchZone({ rates: { ...zone.rates, [category]: { ...rate, [field]: value } } });
  }

  return (
    <article className="panel" data-testid="price-set">
      <h3>Price set</h3>
      <div className="field-grid">
        <label>
          Price zone
          <select aria-label="Price zone" value={zone.zoneId} onChange={(event) => setZoneId(event.target.value)}>
            {book.zones.map((item) => (
              <option key={item.zoneId} value={item.zoneId}>{item.zoneName}</option>
            ))}
          </select>
        </label>
        <label>
          Edit category
          <select aria-label="Edit category" value={category} onChange={(event) => setCategory(event.target.value as PriceCategoryId)}>
            {CATEGORY_INFO.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <p>{info?.line}. Badge {info?.badge}. Eligibility: {info?.eligibility}. <span className="badge-amber">To confirm</span></p>
      <ul aria-label="Categories">
        {CATEGORY_INFO.map((item) => (
          <li key={item.id}>{item.label} · {item.line} · {item.badge}</li>
        ))}
      </ul>
      <ul aria-label="Ride options">
        {RIDE_OPTION_INFO.map((item) => (
          <li key={item.id}>{item.label} · {item.note} · {zone.optionFee[item.id]} kr</li>
        ))}
      </ul>
      <div className="field-grid">
        <label>
          Pickup
          <input aria-label={`${zone.zoneName} ${info?.label} pickup`} type="number" value={rate.pickup} onChange={(event) => patchRate("pickup", Number(event.target.value))} />
        </label>
        <label>
          Per km
          <input aria-label={`${zone.zoneName} ${info?.label} per km`} type="number" value={rate.perKm} onChange={(event) => patchRate("perKm", Number(event.target.value))} />
        </label>
        <label>
          Per minute
          <input aria-label={`${zone.zoneName} ${info?.label} per minute`} type="number" value={rate.perMin} onChange={(event) => patchRate("perMin", Number(event.target.value))} />
        </label>
        <label>
          Minimum
          <input aria-label={`${zone.zoneName} ${info?.label} minimum`} type="number" value={rate.minimum} onChange={(event) => patchRate("minimum", Number(event.target.value))} />
        </label>
        <label>
          Maximum
          <input aria-label={`${zone.zoneName} ${info?.label} maximum`} type="number" value={rate.maximum} onChange={(event) => patchRate("maximum", Number(event.target.value))} />
        </label>
        <label>
          Cancellation fee
          <input aria-label="Cancellation fee" type="number" value={zone.cancelFee} onChange={(event) => patchZone({ cancelFee: Number(event.target.value) })} />
        </label>
        <label>
          Reservation fee
          <input aria-label="Reservation fee" type="number" value={zone.reservationFee} onChange={(event) => patchZone({ reservationFee: Number(event.target.value) })} />
        </label>
        <label>
          Booking fee
          <input aria-label="Booking fee" type="number" value={zone.bookingFee} onChange={(event) => patchZone({ bookingFee: Number(event.target.value) })} />
        </label>
        <label>
          Airport fee
          <input aria-label="Airport fee" type="number" value={zone.airportFee} onChange={(event) => patchZone({ airportFee: Number(event.target.value) })} />
        </label>
        <label>
          Event fee
          <input aria-label="Event fee" type="number" value={zone.eventFee} onChange={(event) => patchZone({ eventFee: Number(event.target.value) })} />
        </label>
        <label>
          Manual boost
          <input aria-label="Manual boost" type="number" step="0.1" value={zone.boostManual} onChange={(event) => patchZone({ boostManual: Number(event.target.value) })} />
        </label>
        <label>
          Scheduled boost
          <input aria-label="Scheduled boost" type="number" step="0.1" value={zone.boostScheduled} onChange={(event) => patchZone({ boostScheduled: Number(event.target.value) })} />
        </label>
        <label>
          Automatic boost
          <input aria-label="Automatic boost" type="number" step="0.1" value={zone.boostAuto} onChange={(event) => patchZone({ boostAuto: Number(event.target.value) })} />
        </label>
        <label>
          Boost cap
          <input aria-label="Boost cap" type="number" step="0.1" value={zone.boostCap} onChange={(event) => patchZone({ boostCap: Number(event.target.value) })} />
        </label>
        <label>
          Commission percent
          <input aria-label="Commission percent" type="number" value={zone.commission[category]} onChange={(event) => patchZone({ commission: { ...zone.commission, [category]: Number(event.target.value) } })} />
        </label>
        <label>
          Fleet commission
          <input aria-label="Fleet commission" type="number" value={zone.fleetCommission} onChange={(event) => patchZone({ fleetCommission: Number(event.target.value) })} />
        </label>
      </div>
      <button
        data-command="admin.pricing.saveZone"
        className="primary-btn"
        type="button"
        disabled={commands.phase === "submitting"}
        onClick={() => {
          const saved = {
            ...book,
            zones: book.zones.map((item) => (item.zoneId === zone.zoneId ? { ...item, version: item.version + 1 } : item)),
          };
          onChange(saved);
          void commands.run("admin.pricing.saveZone", {
            reason: "Safety review",
            targetId: zone.zoneId,
            before: `${zone.zoneName} v${zone.version}`,
            after: `${zone.zoneName} v${zone.version + 1} ${info?.label} ${rate.perKm} kr/km`,
            sliceKey: "prices",
            value: saved,
          });
        }}
      >
        Save price set
      </button>
      {commands.message ? <p className="state-line">{commands.message}</p> : null}
    </article>
  );
}
