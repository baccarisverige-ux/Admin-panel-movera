import { useState } from "react";
import { quotePricing, type BoostMode } from "../pricing/quote";
import { CATEGORY_INFO, PLACES, RIDE_OPTION_INFO, distanceBetween, type PriceCategoryId } from "../pricing/sets";
import type { PricingBook } from "../pricing/book";

export function QuotePreview({ pricing }: { pricing: PricingBook }) {
  const [zoneId, setZoneId] = useState("Z001");
  const [category, setCategory] = useState<PriceCategoryId>("economy");
  const [from, setFrom] = useState("central");
  const [to, setTo] = useState("slussen");
  const [km, setKm] = useState("10");
  const [minutes, setMinutes] = useState("20");
  const [when, setWhen] = useState("2026-10-05T14:00");
  const [adjustment, setAdjustment] = useState("100");
  const [boostMode, setBoostMode] = useState<BoostMode>("none");
  const [waiting, setWaiting] = useState("0");
  const [reserved, setReserved] = useState(false);
  const [airport, setAirport] = useState(false);
  const [event, setEvent] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const zone = pricing.book.zones.find((item) => item.zoneId === zoneId) ?? pricing.book.zones[0];

  function setPlace(which: "from" | "to", value: string) {
    const nextFrom = which === "from" ? value : from;
    const nextTo = which === "to" ? value : to;
    if (which === "from") setFrom(value);
    else setTo(value);
    setKm(String(distanceBetween(nextFrom, nextTo)));
  }

  if (!zone) return null;

  const quote = quotePricing(pricing, {
    zoneId: zone.zoneId,
    category,
    distanceKm: Number(km) || 0,
    durationMin: Number(minutes) || 0,
    whenIso: when ? new Date(when).toISOString() : new Date().toISOString(),
    adjustmentPct: Number(adjustment) || 100,
    boostMode,
    waitingMin: Number(waiting) || 0,
    reserved,
    airport,
    event,
    options,
  });

  const allowedCategories = CATEGORY_INFO.filter((item) => zone.enabledCategories[item.id]);

  return (
    <article className="panel" data-testid="quote-preview">
      <h3>Quote preview</h3>
      <p>
        Adjustment range {zone.adjustMin}–{zone.adjustMax}%. Step {zone.adjustStep}. Quote valid {zone.quoteSeconds} s.
        Tips {zone.tips.join("/")} kr. The preview reads the current unsaved draft.
      </p>

      <div className="field-grid">
        <label>
          Preview zone
          <select
            aria-label="Preview zone"
            value={zone.zoneId}
            onChange={(event) => {
              setZoneId(event.target.value);
              setOptions([]);
              const next = pricing.book.zones.find((item) => item.zoneId === event.target.value);
              if (next && !next.enabledCategories[category]) {
                const first = CATEGORY_INFO.find((item) => next.enabledCategories[item.id]);
                if (first) setCategory(first.id);
              }
            }}
          >
            {pricing.book.zones.map((item) => (
              <option key={item.zoneId} value={item.zoneId}>{item.zoneName}</option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select aria-label="Quote category" value={category} onChange={(event) => setCategory(event.target.value as PriceCategoryId)}>
            {allowedCategories.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          Point A
          <select aria-label="Point A" value={from} onChange={(event) => setPlace("from", event.target.value)}>
            {PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>

        <label>
          Point B
          <select aria-label="Point B" value={to} onChange={(event) => setPlace("to", event.target.value)}>
            {PLACES.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>

        <label>
          When
          <input aria-label="Quote time" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
        </label>

        <label>
          Kilometres
          <input aria-label="Kilometres" type="number" min="0" value={km} onChange={(event) => setKm(event.target.value)} />
        </label>

        <label>
          Minutes
          <input aria-label="Minutes" type="number" min="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        </label>

        <label>
          Adjustment (%)
          <input
            aria-label="Quote adjustment"
            type="number"
            min={zone.adjustMin}
            max={zone.adjustMax}
            step={zone.adjustStep}
            value={adjustment}
            onChange={(event) => setAdjustment(event.target.value)}
          />
        </label>

        <label>
          Boost
          <select aria-label="Quote boost" value={boostMode} onChange={(event) => setBoostMode(event.target.value as BoostMode)}>
            <option value="none">None</option>
            <option value="manual">Manual · {zone.boostManual}×</option>
            <option value="scheduled">Scheduled · {zone.boostScheduled}× default</option>
            <option value="automatic">Automatic · {zone.boostAuto}×</option>
          </select>
        </label>

        <label>
          Waiting minutes
          <input aria-label="Quote waiting minutes" type="number" min="0" value={waiting} onChange={(event) => setWaiting(event.target.value)} />
        </label>

        <label className="check-row"><input aria-label="Reservation quote" type="checkbox" checked={reserved} onChange={(event) => setReserved(event.target.checked)} /> Reservation</label>
        <label className="check-row"><input aria-label="Airport quote" type="checkbox" checked={airport} onChange={(event) => setAirport(event.target.checked)} /> Airport</label>
        <label className="check-row"><input aria-label="Event quote" type="checkbox" checked={event} onChange={(event) => setEvent(event.target.checked)} /> Event</label>
      </div>

      <h4>Ride options</h4>
      <div className="actions" aria-label="Quote ride options">
        {RIDE_OPTION_INFO.filter((item) => zone.enabledOptions[item.id]).map((item) => (
          <label className="check-row" key={item.id}>
            <input
              aria-label={`Quote option ${item.label}`}
              type="checkbox"
              checked={options.includes(item.id)}
              onChange={(event) => setOptions((current) =>
                event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)
              )}
            />
            {item.label} · {zone.optionFee[item.id]} kr
          </label>
        ))}
      </div>

      <svg className="route-svg" viewBox="0 0 320 80" role="img" aria-label="Quote route">
        <line x1="30" y1="40" x2="290" y2="40" stroke="#111614" strokeWidth="3" />
        <circle cx="30" cy="40" r="7" fill="#1FA463" />
        <circle cx="290" cy="40" r="7" fill="#C2453A" />
      </svg>

      {quote.error ? <p className="state-line">{quote.error}</p> : null}

      <ul className="version-list" data-testid="quote-lines">
        <li>Base fare {quote.baseKr.toFixed(2)} kr</li>
        <li>Adjustment {quote.adjustmentPct}% → {quote.adjustedKr.toFixed(2)} kr</li>
        <li>Boost {quote.boostMultiplier}× → {quote.boostedKr.toFixed(2)} kr{quote.activeScheduleId ? ` · schedule ${quote.activeScheduleId}` : ""}</li>
        <li>Category minimum/maximum → {quote.fareBeforeFeesKr.toFixed(2)} kr</li>
        <li>Waiting {quote.waitingKr.toFixed(2)} kr · booking {quote.bookingKr.toFixed(2)} kr · reservation {quote.reservationKr.toFixed(2)} kr</li>
        <li>Airport {quote.airportKr.toFixed(2)} kr · event {quote.eventKr.toFixed(2)} kr · options {quote.optionsKr.toFixed(2)} kr</li>
        <li>Cancellation policy {zone.cancelFee} kr · tip presets {quote.tipPresets.join("/")} kr, not included</li>
      </ul>

      <p data-testid="quote-version">Rule {quote.ruleVersion}</p>
      <strong data-testid="quote-total">{quote.totalLabel}</strong>
    </article>
  );
}
