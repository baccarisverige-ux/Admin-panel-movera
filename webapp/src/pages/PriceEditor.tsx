import { useState } from "react";
import { CATEGORY_INFO, RIDE_OPTION_INFO, type PriceBook, type PriceCategoryId, type ZonePrice } from "../pricing/sets";

type Props = {
  book: PriceBook;
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
  onChange: (book: PriceBook) => void;
  onSave: (zoneId: string) => void;
  canEdit: boolean;
  saving?: boolean;
  validationError?: string | null;
};

export function PriceEditor({ book, zoneId, onZoneChange, onChange, onSave, canEdit, saving = false, validationError = null }: Props) {
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
      <h3>Price set · {zone.zoneName} · v{zone.version}</h3>
      <div className="field-grid">
        <label>
          Price zone
          <select aria-label="Price zone" value={zone.zoneId} onChange={(event) => onZoneChange(event.target.value)}>
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
        <label className="check-row">
          <input
            aria-label={`${info?.label} enabled in ${zone.zoneName}`}
            type="checkbox"
            checked={zone.enabledCategories[category]}
            disabled={!canEdit}
            onChange={(event) => patchZone({ enabledCategories: { ...zone.enabledCategories, [category]: event.target.checked } })}
          />
          {info?.label} enabled
        </label>
      </div>
      <p>{info?.line}. Badge {info?.badge}. Eligibility: {info?.eligibility}.</p>

      <ul aria-label="Categories">
        {CATEGORY_INFO.map((item) => (
          <li key={item.id}>{item.label} · {zone.enabledCategories[item.id] ? "enabled" : "disabled"} · {item.line} · {item.badge}</li>
        ))}
      </ul>

      <div className="field-grid">
        <label>
          Pickup
          <input disabled={!canEdit} aria-label={`${zone.zoneName} ${info?.label} pickup`} type="number" value={rate.pickup} onChange={(event) => patchRate("pickup", Number(event.target.value))} />
        </label>
        <label>
          Per km
          <input disabled={!canEdit} aria-label={`${zone.zoneName} ${info?.label} per km`} type="number" value={rate.perKm} onChange={(event) => patchRate("perKm", Number(event.target.value))} />
        </label>
        <label>
          Per minute
          <input disabled={!canEdit} aria-label={`${zone.zoneName} ${info?.label} per minute`} type="number" value={rate.perMin} onChange={(event) => patchRate("perMin", Number(event.target.value))} />
        </label>
        <label>
          Minimum
          <input disabled={!canEdit} aria-label={`${zone.zoneName} ${info?.label} minimum`} type="number" value={rate.minimum} onChange={(event) => patchRate("minimum", Number(event.target.value))} />
        </label>
        <label>
          Maximum
          <input disabled={!canEdit} aria-label={`${zone.zoneName} ${info?.label} maximum`} type="number" value={rate.maximum} onChange={(event) => patchRate("maximum", Number(event.target.value))} />
        </label>
      </div>

      <h4>Ride options</h4>
      <div className="field-grid">
        {RIDE_OPTION_INFO.map((item) => (
          <div key={item.id}>
            <label className="check-row">
              <input
                aria-label={`${item.label} enabled`}
                type="checkbox"
                checked={zone.enabledOptions[item.id]}
                disabled={!canEdit}
                onChange={(event) => patchZone({ enabledOptions: { ...zone.enabledOptions, [item.id]: event.target.checked } })}
              />
              {item.label} enabled
            </label>
            <label>
              {item.label} fee
              <input
                aria-label={`${item.label} fee`}
                type="number"
                min="0"
                disabled={!canEdit}
                value={zone.optionFee[item.id]}
                onChange={(event) => patchZone({ optionFee: { ...zone.optionFee, [item.id]: Number(event.target.value) } })}
              />
            </label>
          </div>
        ))}
      </div>

      {validationError ? <p className="state-line">{validationError}</p> : null}
      <button
        data-command="admin.pricing.saveZone"
        className="primary-btn"
        type="button"
        disabled={!canEdit || saving || Boolean(validationError)}
        onClick={() => onSave(zone.zoneId)}
      >
        Save price set
      </button>
    </article>
  );
}
