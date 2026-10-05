import { useState } from "react";
import { CATEGORY_INFO, PLACES, distanceBetween, quoteZone, type PriceBook, type PriceCategoryId } from "../pricing/sets";

export function QuotePreview({ book }: { book: PriceBook }) {
  const [zoneId, setZoneId] = useState("Z001");
  const [category, setCategory] = useState<PriceCategoryId>("economy");
  const [from, setFrom] = useState("central");
  const [to, setTo] = useState("slussen");
  const [km, setKm] = useState("10");
  const [minutes, setMinutes] = useState("20");
  const [when, setWhen] = useState("2026-10-05T14:00");
  const zone = book.zones.find((item) => item.zoneId === zoneId) ?? book.zones[0];
  const quote = zone ? quoteZone(zone, category, Number(km) || 0, Number(minutes) || 0) : null;

  function setPlace(which: "from" | "to", value: string) {
    const nextFrom = which === "from" ? value : from;
    const nextTo = which === "to" ? value : to;
    if (which === "from") setFrom(value);
    else setTo(value);
    setKm(String(distanceBetween(nextFrom, nextTo)));
  }

  if (!zone || !quote) return null;

  return (
    <article className="panel" data-testid="quote-preview">
      <h3>Quote preview</h3>
      <p>Movera and the other categories. Adjustment range {zone.adjustMin}–{zone.adjustMax}%. Step {zone.adjustStep}. Quote valid {zone.quoteSeconds} s. Tips {zone.tips.join("/")} kr.</p>
      <div className="field-grid">
        <label>
          Preview zone
          <select aria-label="Preview zone" value={zone.zoneId} onChange={(event) => setZoneId(event.target.value)}>
            {book.zones.map((item) => (
              <option key={item.zoneId} value={item.zoneId}>{item.zoneName}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select aria-label="Quote category" value={category} onChange={(event) => setCategory(event.target.value as PriceCategoryId)}>
            {CATEGORY_INFO.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Point A
          <select aria-label="Point A" value={from} onChange={(event) => setPlace("from", event.target.value)}>
            {PLACES.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>
        </label>
        <label>
          Point B
          <select aria-label="Point B" value={to} onChange={(event) => setPlace("to", event.target.value)}>
            {PLACES.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>
        </label>
        <label>
          When
          <input aria-label="Quote time" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
        </label>
        <label>
          Kilometres
          <input aria-label="Kilometres" value={km} onChange={(event) => setKm(event.target.value)} />
        </label>
        <label>
          Minutes
          <input aria-label="Minutes" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        </label>
      </div>
      <svg className="route-svg" viewBox="0 0 320 80" role="img" aria-label="Quote route">
        <line x1="30" y1="40" x2="290" y2="40" stroke="#111614" strokeWidth="3" />
        <circle cx="30" cy="40" r="7" fill="#1FA463" />
        <circle cx="290" cy="40" r="7" fill="#C2453A" />
      </svg>
      <ul className="version-list" data-testid="quote-lines">
        <li>Pickup {quote.pickup} kr</li>
        <li>{quote.distance} km × {quote.perKm} kr</li>
        <li>{quote.duration} min × {quote.perMin} kr</li>
        <li>Waiting policy {zone.waitingPerMin} kr per minute, not in this quote</li>
        <li>Cancellation {zone.cancelFee} kr · reservation {zone.reservationFee} kr · booking {zone.bookingFee} kr</li>
        <li>Airport {zone.airportFee} kr · event {zone.eventFee} kr</li>
      </ul>
      <p data-testid="quote-version">Rule {quote.ruleVersion}</p>
      <strong data-testid="quote-total">{quote.label}</strong>
    </article>
  );
}
