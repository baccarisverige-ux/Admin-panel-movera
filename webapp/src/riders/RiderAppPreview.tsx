import { useState } from "react";
import { CalendarClock, Car, ChevronRight, Clock, CreditCard, Gift, Map, MapPin, Search, UserRound, Users } from "lucide-react";
import { formatMoney, market, type MarketId } from "../markets/markets";
import { promoPrice, type PromoTicket } from "./care";
import type { CategoryPrice } from "./useCategoryPrices";
import { CURRENCY_SYMBOL } from "./ui";

/** Pictures the rider app already ships, used as the promotion's thumbnail. */
export const CARD_IMAGES: { id: string; label: string; file: string | null }[] = [
  { id: "gradient", label: "Movera colours", file: null },
  { id: "comfort", label: "Comfort ride", file: "movera_comfort_ride.webp" },
  { id: "airport", label: "Airport", file: "movera_airport_premium.webp" },
  { id: "events", label: "Events", file: "movera_events_premium.webp" },
  { id: "business", label: "Work", file: "movera_business_premium.webp" },
  { id: "outings", label: "Outings", file: "movera_outings_premium.webp" },
];

export function imageUrl(id: string | undefined): string | null {
  const file = CARD_IMAGES.find((item) => item.id === id)?.file;
  return file ? `${import.meta.env.BASE_URL}rider-app/${file}` : null;
}

type Promo = Pick<PromoTicket, "title" | "kind" | "value" | "rides" | "maxPerRide" | "minFare" | "country" | "categories"> & { image?: string };

export function promoSubtitle(promo: Promo): string {
  const symbol = CURRENCY_SYMBOL[promo.country as MarketId];
  const deal = promo.kind === "percent" ? `${promo.value}% off` : `${promo.value} ${symbol} off`;
  return `${deal} your next ${promo.rides} ride${promo.rides === 1 ? "" : "s"}${promo.kind === "percent" ? ` · up to ${promo.maxPerRide} ${symbol}` : ""}`;
}

function money(value: number, country: MarketId): string {
  return formatMoney(Math.round(value * market(country).minorUnits), country);
}

/**
 * The rider app with the promotion: on Home it is a small tab on top of the sheet;
 * on Choose ride every category it covers shows the old price crossed out and the new price.
 */
export function RiderAppPreview({ promo, prices = [], zoneName = "", off = false }: { promo: Promo; prices?: CategoryPrice[]; zoneName?: string; off?: boolean }) {
  const [screen, setScreen] = useState<"home" | "ride">("home");
  const country = promo.country as MarketId;
  const url = imageUrl(promo.image);
  const deal = promo.kind === "percent" ? `${promo.value}%` : `${promo.value} ${CURRENCY_SYMBOL[country]}`;
  const covered = prices.filter((row) => promoPrice(row.price, row.id, promo).applies).length;
  return (
    <figure className="ra-phone" aria-label="How riders see the promotion">
      <div className="ra-switch" role="tablist" aria-label="Rider app screen">
        <button data-command="admin.ui.quickAction" type="button" role="tab" aria-selected={screen === "home"} className={screen === "home" ? "active" : undefined} onClick={() => setScreen("home")}>Home</button>
        <button data-command="admin.ui.quickAction" type="button" role="tab" aria-selected={screen === "ride"} className={screen === "ride" ? "active" : undefined} onClick={() => setScreen("ride")}>Choose ride</button>
      </div>
      <div className="ra-screen">
        <div className="ra-status"><span>9:41</span><span className="ra-notch" aria-hidden="true" /><span>5G</span></div>
        {screen === "home" ? (
          <>
            <div className="ra-map" aria-hidden="true">
              <i className="ra-road r1" /><i className="ra-road r2" /><i className="ra-road r3" /><i className="ra-road r4" />
              <span className="ra-pin" />
            </div>
            <div className="ra-sheet">
              {off ? null : (
                <div className="ra-promo-tab" aria-label="Promotion in the rider app">
                  <span className={url ? "ra-promo-icon photo" : "ra-promo-icon"} style={url ? { backgroundImage: `url(${url})` } : undefined}><Gift size={13} aria-hidden="true" /></span>
                  <span className="ra-promo-text">
                    <strong>{deal} off · {promo.title || "Movera offer"}</strong>
                    <span>{promoSubtitle(promo)}</span>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </div>
              )}
              <span className="ra-grabber" aria-hidden="true" />
              <div className="ra-where">
                <span className="ra-where-main"><Search size={14} aria-hidden="true" />Where to?</span>
                <span className="ra-later"><Clock size={11} aria-hidden="true" />Later</span>
              </div>
              <nav className="ra-nav" aria-hidden="true">
                <span className="on"><Map size={15} />Map</span>
                <span><CreditCard size={15} />Payment</span>
                <span><CalendarClock size={15} />Schedule ride</span>
                <span><UserRound size={15} />Account</span>
              </nav>
            </div>
          </>
        ) : (
          <div className="ra-ride">
            <div className="ra-route">
              <span><i className="dot a" />Current location</span>
              <span><MapPin size={11} aria-hidden="true" />{zoneName || "Destination"} · 8 km</span>
            </div>
            {off ? null : <div className="ra-ride-banner"><Gift size={12} aria-hidden="true" />{deal} off applied on {covered} categor{covered === 1 ? "y" : "ies"}</div>}
            <ul className="ra-cats" aria-label="Categories with prices">
              {prices.map((row, index) => {
                const result = off ? { applies: false, discount: 0, newPrice: row.price } : promoPrice(row.price, row.id, promo);
                return (
                  <li key={row.id} className={index === 0 ? "on" : undefined}>
                    <span className="ra-cat-car" aria-hidden="true"><Car size={18} /></span>
                    <span className="ra-cat-name"><b>{row.label}</b><small><Users size={9} aria-hidden="true" />{row.seats} · {3 + (index % 5)} min</small></span>
                    <span className="ra-cat-price">
                      {result.applies ? <s>{money(row.price, country)}</s> : null}
                      <b className={result.applies ? "deal" : undefined}>{money(result.newPrice, country)}</b>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="ra-choose">Choose {prices[0]?.label ?? "ride"}</div>
          </div>
        )}
      </div>
      <figcaption>{off ? "Promotion is off: riders do not see it." : screen === "home" ? "Home · sheet down, promotion on top" : `Choose ride · sample 8 km trip in ${zoneName}`}</figcaption>
    </figure>
  );
}
