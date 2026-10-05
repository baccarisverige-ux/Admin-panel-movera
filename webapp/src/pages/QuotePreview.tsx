import { useState } from "react";
import { quoteRide } from "../pricing/quote";

export function QuotePreview() {
  const [km, setKm] = useState("10");
  const [minutes, setMinutes] = useState("20");
  const quote = quoteRide("economy", Number(km) || 0, Number(minutes) || 0);

  return (
    <article className="panel">
      <h3>Quote preview</h3>
      <p>Movera, rule {quote.ruleVersion}. Same formula as the rider app.</p>
      <label>
        Kilometres
        <input value={km} onChange={(event) => setKm(event.target.value)} />
      </label>
      <label>
        Minutes
        <input value={minutes} onChange={(event) => setMinutes(event.target.value)} />
      </label>
      <strong>{quote.label}</strong>
    </article>
  );
}
