import { CalendarClock, ChevronRight, Clock, CreditCard, Map, Search, UserRound } from "lucide-react";
import type { MarketId } from "../markets/markets";
import type { PromoTicket } from "./care";
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

type Promo = Pick<PromoTicket, "title" | "kind" | "value" | "rides" | "maxPerRide" | "country"> & { image?: string };

export function promoSubtitle(promo: Promo): string {
  const symbol = CURRENCY_SYMBOL[promo.country as MarketId];
  const deal = promo.kind === "percent" ? `${promo.value}% off` : `${promo.value} ${symbol} off`;
  return `${deal} your next ${promo.rides} ride${promo.rides === 1 ? "" : "s"}${promo.kind === "percent" ? ` · up to ${promo.maxPerRide} ${symbol} per ride` : ""}`;
}

/**
 * The rider app home screen with the sheet all the way down: the map, then the sheet with
 * its grabber and "Where to?", the promotion right under it, and the floating bottom bar.
 */
export function RiderAppPreview({ promo, off = false }: { promo: Promo; off?: boolean }) {
  const url = imageUrl(promo.image);
  const deal = promo.kind === "percent" ? `${promo.value}%` : `${promo.value} ${CURRENCY_SYMBOL[promo.country as MarketId]}`;
  return (
    <figure className="ra-phone" aria-label="How riders see the promotion on the home screen">
      <div className="ra-screen">
        <div className="ra-status"><span>9:41</span><span className="ra-notch" aria-hidden="true" /><span>5G</span></div>
        <div className="ra-map" aria-hidden="true">
          <i className="ra-road r1" /><i className="ra-road r2" /><i className="ra-road r3" /><i className="ra-road r4" />
          <span className="ra-pin" />
        </div>
        <div className="ra-sheet">
          <span className="ra-grabber" aria-hidden="true" />
          <div className="ra-where">
            <span className="ra-where-main"><Search size={14} aria-hidden="true" />Where to?</span>
            <span className="ra-later"><Clock size={11} aria-hidden="true" />Later</span>
          </div>
          {off ? null : (
            <div className="ra-promo" aria-label="Promotion in the rider app">
              <span className={url ? "ra-promo-thumb photo" : "ra-promo-thumb"} style={url ? { backgroundImage: `url(${url})` } : undefined}>
                <b>{deal}</b><small>off</small>
              </span>
              <span className="ra-promo-text">
                <strong>{promo.title || "Your Movera offer"}</strong>
                <span>{promoSubtitle(promo)}</span>
              </span>
              <ChevronRight size={14} aria-hidden="true" />
            </div>
          )}
          <nav className="ra-nav" aria-hidden="true">
            <span className="on"><Map size={15} />Map</span>
            <span><CreditCard size={15} />Payment</span>
            <span><CalendarClock size={15} />Schedule ride</span>
            <span><UserRound size={15} />Account</span>
          </nav>
        </div>
      </div>
      <figcaption>{off ? "Promotion is off: riders do not see it." : "Rider app · home screen, sheet down"}</figcaption>
    </figure>
  );
}
