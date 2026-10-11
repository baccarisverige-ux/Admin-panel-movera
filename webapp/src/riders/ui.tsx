import type { ReactNode } from "react";
import { AlertTriangle, Crown, Gift, MessageCircleWarning, Sparkles, Star, Ticket, Wallet } from "lucide-react";
import { formatMoney, type MarketId } from "../markets/markets";
import type { PromoTicket } from "./care";
import { categoryName } from "./profile";
import type { LiveState, RiderRow } from "./segments";

export const CURRENCY_SYMBOL: Record<MarketId, string> = { SE: "kr", FR: "€", TN: "DT" };

export function money(minor: number, country: MarketId, compact = false): string {
  return formatMoney(minor, country, { compact });
}

const LIVE_LABEL: Record<LiveState, string> = { waiting: "Waiting for a driver", on_trip: "On a trip", online: "Online now", offline: "Offline" };

export function LiveChip({ state }: { state: LiveState }) {
  return <span className={`rd-live l-${state}`}><i aria-hidden="true" />{LIVE_LABEL[state]}</span>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "good" : score >= 55 ? "mid" : "low";
  return <span className={`rd-score s-${tone}`} title="Rider score from rating, cancellations, no-shows and payments">Score {score}</span>;
}

export function Stars({ value }: { value: number }) {
  return <span className="rd-stars"><Star size={12} aria-hidden="true" />{value.toFixed(2)}</span>;
}

/** Small badges on a rider: new, top, waiting for reply, unpaid, promotion, flags. */
export function RiderBadges({ row, compact = false }: { row: RiderRow; compact?: boolean }) {
  const items: ReactNode[] = [];
  if (row.isNew) items.push(<span key="new" className="rd-badge new"><Sparkles size={11} aria-hidden="true" />New</span>);
  if (row.segments.has("top")) items.push(<span key="top" className="rd-badge top"><Crown size={11} aria-hidden="true" />Top</span>);
  if (row.waitingMin !== null) items.push(<span key="reply" className={`rd-badge reply t-${row.waitingMin < 60 ? "green" : row.waitingMin < 240 ? "orange" : "red"}`}><MessageCircleWarning size={11} aria-hidden="true" />Reply waiting{compact ? "" : ` · ${waitText(row.waitingMin)}`}</span>);
  if (row.unpaidMinor > 0) items.push(<span key="unpaid" className="rd-badge unpaid"><Wallet size={11} aria-hidden="true" />Unpaid</span>);
  if (row.promos.length) items.push(<span key="promo" className="rd-badge promo"><Gift size={11} aria-hidden="true" />Promo</span>);
  if (row.profile.fraudFlags.length && !compact) items.push(<span key="flag" className="rd-badge flag"><AlertTriangle size={11} aria-hidden="true" />Check</span>);
  return items.length ? <span className="rd-badges">{items}</span> : null;
}

export function waitText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
  return `${Math.floor(minutes / 1440)} d`;
}

/** The promotion as riders see it in the app: a ticket with the deal, the limits and the dates. */
export function PromoTicketCard({ ticket, used, locale }: { ticket: Pick<PromoTicket, "code" | "title" | "kind" | "value" | "rides" | "maxPerRide" | "minFare" | "validFrom" | "validTo" | "country" | "categories" | "status">; used?: number; locale: string }) {
  const symbol = CURRENCY_SYMBOL[ticket.country];
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const deal = ticket.kind === "percent" ? `${ticket.value}%` : `${ticket.value} ${symbol}`;
  const left = used === undefined ? null : Math.max(0, ticket.rides - used);
  return (
    <div className={`rd-ticket${ticket.status === "active" ? "" : ` ${ticket.status}`}`} aria-label={`Promotion ${ticket.code}`}>
      <div className="rd-ticket-deal">
        <Ticket size={16} aria-hidden="true" />
        <strong>{deal}</strong>
        <span>off</span>
      </div>
      <div className="rd-ticket-body">
        <b>{ticket.title || "Your promotion"}</b>
        <span>{ticket.kind === "percent" ? `${deal} off your next ${ticket.rides} ride${ticket.rides === 1 ? "" : "s"} · max ${ticket.maxPerRide} ${symbol} per ride` : `${deal} off each of your next ${ticket.rides} ride${ticket.rides === 1 ? "" : "s"}`}</span>
        <small>
          {ticket.validFrom && ticket.validTo ? `${date.format(Date.parse(ticket.validFrom))} – ${date.format(Date.parse(ticket.validTo))}` : "Pick dates"}
          {ticket.minFare ? ` · min fare ${ticket.minFare} ${symbol}` : ""}
          {ticket.categories.length ? ` · ${ticket.categories.map(categoryName).join(", ")}` : " · all categories"}
        </small>
        {left !== null ? (
          <span className="rd-ticket-usage" aria-label={`${used} of ${ticket.rides} rides used`}>
            <i style={{ width: `${((used ?? 0) / ticket.rides) * 100}%` }} />
            <em>{used} of {ticket.rides} used · {left} left</em>
          </span>
        ) : null}
      </div>
      <div className="rd-ticket-code"><span>Code</span><b>{ticket.code || "CODE"}</b></div>
    </div>
  );
}
