import { Clock, Home, Plus, Search, Briefcase } from "lucide-react";
import type { MarketId } from "../markets/markets";
import type { PromoTicket } from "./care";
import { CURRENCY_SYMBOL } from "./ui";

/** Pictures the rider app already ships for its home cards. */
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
  return `${deal} your next ${promo.rides} ride${promo.rides === 1 ? "" : "s"}${promo.kind === "percent" ? ` · up to ${promo.maxPerRide} ${symbol} per ride` : ""}.`;
}

/** The promotion card exactly as the rider app draws its home cards: picture on top, title and line below. */
export function RiderHomeCard({ promo }: { promo: Promo }) {
  const url = imageUrl(promo.image);
  const deal = promo.kind === "percent" ? `${promo.value}%` : `${promo.value} ${CURRENCY_SYMBOL[promo.country as MarketId]}`;
  return (
    <div className="ra-card" aria-label="Promotion card in the rider app">
      <div className={url ? "ra-card-img photo" : "ra-card-img"} style={url ? { backgroundImage: `url(${url})` } : undefined}>
        <span className="ra-deal"><b>{deal}</b><small>off</small></span>
      </div>
      <div className="ra-card-band">
        <strong>{promo.title || "Your Movera offer"}</strong>
        <span>{promoSubtitle(promo)}</span>
      </div>
    </div>
  );
}

/**
 * A phone showing the rider app's home sheet: Where to?, saved places, then the card row.
 * The promotion sits first in the row, before the app's own cards.
 */
export function RiderAppPreview({ promo, off = false }: { promo: Promo; off?: boolean }) {
  const comfort = imageUrl("comfort");
  return (
    <figure className="ra-phone" aria-label="How riders see the promotion on the home screen">
      <div className="ra-screen">
        <div className="ra-status"><span>9:41</span><span className="ra-notch" aria-hidden="true" /><span>5G</span></div>
        <div className="ra-map" aria-hidden="true">
          <i className="ra-road r1" /><i className="ra-road r2" /><i className="ra-road r3" />
          <span className="ra-pin" />
        </div>
        <div className="ra-sheet">
          <span className="ra-grabber" aria-hidden="true" />
          <div className="ra-where">
            <span className="ra-where-main"><Search size={14} aria-hidden="true" />Where to?</span>
            <span className="ra-later"><Clock size={11} aria-hidden="true" />Later</span>
          </div>
          <div className="ra-places" aria-hidden="true">
            <span><Home size={12} />Home</span>
            <span><Briefcase size={12} />Work</span>
            <span><Plus size={12} />Add</span>
          </div>
          <div className="ra-row">
            {off ? null : <RiderHomeCard promo={promo} />}
            <div className="ra-card" aria-hidden="true">
              <div className="ra-card-img photo" style={comfort ? { backgroundImage: `url(${comfort})` } : undefined} />
              <div className="ra-card-band"><strong>Movera Comfort</strong><span>Extra space. Elevated comfort. A smoother way to ride.</span></div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>{off ? "Promotion is off: riders do not see it." : "Rider app · home screen sheet"}</figcaption>
    </figure>
  );
}
