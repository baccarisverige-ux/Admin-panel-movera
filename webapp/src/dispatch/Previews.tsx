import { useState } from "react";
import { Clock, Flag, MapPin, Navigation, Radar, Route, Sparkles, Target, TrendingUp, Users, X } from "lucide-react";
import type { MarketId } from "../markets/markets";
import { EXTRAS, WAIT_KINDS, type OfferMode, type ZoneDispatch } from "./rules";

/** How the rules look on the phones: the driver's offer card and the rider's waiting screen. */

const SAMPLE: Record<MarketId, { pickup: string; stop: string; drop: string; price: number }> = {
  SE: { pickup: "Drottninggatan 50", stop: "Sveavägen 20", drop: "Odenplan", price: 189 },
  FR: { pickup: "Rue de Rivoli 40", stop: "Place de la Bourse", drop: "Gare du Nord", price: 18 },
  TN: { pickup: "Avenue Habib Bourguiba", stop: "Place Barcelone", drop: "Lac 2", price: 12 },
};

export function DriverOfferPreview({ zone, money, country }: { zone: ZoneDispatch; money: (value: number) => string; country: MarketId }) {
  const sample = SAMPLE[country];
  const first: OfferMode = zone.radar.on ? "radar" : "exclusive";
  const [mode, setMode] = useState<OfferMode>(first);
  const shown: OfferMode = zone[mode].on ? mode : first;
  const [view, setView] = useState<"popup" | "full" | "driving">("popup");
  const app = zone.radarApp;
  const radarView = shown === "radar" ? (view === "popup" && !app.popupOn ? (app.fullOn ? "full" : "popup") : view === "full" && !app.fullOn ? "popup" : view) : "popup";
  const stack = shown === "radar" ? (radarView === "driving" ? (app.drivingOn ? app.driving : 0) : app.popup) : 1;
  const seconds = shown === "radar" ? zone.radar.seconds : zone.exclusive.seconds;
  const badges = zone.extras.filter((extra) => extra.on && extra.badge && (extra.id === "child_seat" || extra.id === "long_trip")).map((extra) => EXTRAS.find((item) => item.id === extra.id)!.badge);
  const stops = zone.stops.on ? Math.min(1, zone.stops.max) : 0;
  return (
    <figure className="dp-phone dx-phone" aria-label="Driver offer preview">
      <div className="ra-switch" role="tablist" aria-label="Offer type">
        <button data-command="admin.dispatch.view" type="button" role="tab" aria-selected={shown === "radar"} className={shown === "radar" ? "active" : undefined} disabled={!zone.radar.on} onClick={() => setMode("radar")}>Radar</button>
        <button data-command="admin.dispatch.view" type="button" role="tab" aria-selected={shown === "exclusive"} className={shown === "exclusive" ? "active" : undefined} disabled={!zone.exclusive.on} onClick={() => setMode("exclusive")}>Exclusive</button>
      </div>
      {shown === "radar" ? (
        <div className="dx-step-pick" role="group" aria-label="Radar screen">
          <button data-command="admin.dispatch.view" type="button" aria-pressed={radarView === "popup"} className={radarView === "popup" ? "on" : undefined} disabled={!app.popupOn} onClick={() => setView("popup")}>Popup</button>
          <button data-command="admin.dispatch.view" type="button" aria-pressed={radarView === "full"} className={radarView === "full" ? "on" : undefined} disabled={!app.fullOn} onClick={() => setView("full")}>Full screen</button>
          <button data-command="admin.dispatch.view" type="button" aria-pressed={radarView === "driving"} className={radarView === "driving" ? "on" : undefined} onClick={() => setView("driving")}>While driving</button>
        </div>
      ) : null}
      <div className="dp-screen">
        <div className="dp-status"><span>9:41</span><span className="ra-notch" aria-hidden="true" /><span>5G</span></div>
        {shown === "radar" && radarView === "full" ? (
          <div className="dx-radar-full" aria-label="Full-screen radar">
            <b><Radar size={13} aria-hidden="true" /> Radar · {app.full} offers max</b>
            <ul>
              {Array.from({ length: Math.min(app.full, 6) }, (_, index) => (
                <li key={index}><span><b>{money(Math.round(sample.price * (1 - index * 0.07)))}</b><small>{(0.8 + index * 0.6).toFixed(1)} km · {2 + index} min to pickup</small></span><i>{seconds}s</i></li>
              ))}
            </ul>
            {app.full > 6 ? <small>+{app.full - 6} more when you scroll</small> : null}
          </div>
        ) : null}
        {shown === "radar" && radarView === "driving" && !stack ? <p className="dx-radar-off">No Radar offers while driving a rider in this zone.</p> : null}
        <svg className="dp-map" viewBox="0 0 242 476" aria-hidden="true">
          <rect width="242" height="476" fill="#17222d" />
          <path d="M0 120H242M0 260H242M70 0V476M170 0V476" stroke="#2a3a48" strokeWidth="9" />
          {shown === "radar" ? [40, 70, 100].map((r) => <circle key={r} cx="121" cy="170" r={r} fill="none" stroke="#9b87f5" strokeOpacity={0.5 - r / 300} strokeWidth="2" />) : null}
          <circle cx="121" cy="170" r="8" fill="#e34948" stroke="#fff" strokeWidth="3" />
          <circle cx="70" cy="245" r="11" fill="#215277" stroke="#fff" strokeWidth="3" />
        </svg>
        {stack > 1 ? <span className="dx-offer-stack" aria-label={`${stack} offers stacked`}>{Array.from({ length: Math.min(stack - 1, 3) }, (_, index) => <i key={index} style={{ bottom: `${16 + (index + 1) * 7}px`, left: `${14 + (index + 1) * 6}px`, right: `${14 + (index + 1) * 6}px` }} />)}</span> : null}
        {radarView !== "full" && stack ? <div className={`dx-offer ${shown}`} aria-label="Offer card">
          <div className="dx-offer-top">
            <span className={`dx-mode-tag ${shown}`}>{shown === "radar" ? <><Radar size={11} aria-hidden="true" /> Radar · {zone.radar.drivers} drivers see it</> : <><Target size={11} aria-hidden="true" /> Only for you</>}</span>
            <span className="dx-offer-timer" aria-label={`${seconds} seconds to accept`}>{seconds}s</span>
          </div>
          <b className="dx-offer-price">{money(sample.price)}</b>
          <span className="dx-offer-line"><Navigation size={11} aria-hidden="true" /> 1.8 km · 4 min to pickup</span>
          <span className="dx-offer-line"><MapPin size={11} aria-hidden="true" /> Pickup: {sample.pickup}</span>
          {stops ? <span className="dx-offer-line"><Route size={11} aria-hidden="true" /> 1 stop: {sample.stop}</span> : null}
          <span className="dx-offer-line"><Flag size={11} aria-hidden="true" /> Drop-off: {sample.drop} · 6.2 km</span>
          {badges.length ? <span className="dx-offer-badges">{badges.map((badge) => <i key={badge}>{badge}</i>)}</span> : null}
          <span className="dx-offer-actions">
            <span className="no"><X size={12} aria-hidden="true" /> {shown === "radar" ? "Skip" : "No"}</span>
            <span className="yes">Accept</span>
          </span>
          <i className="dx-offer-bar" aria-hidden="true" />
          {stack > 1 ? <span className="dx-offer-more">1 of {stack} offers</span> : null}
          {radarView === "driving" && shown === "radar" ? <span className="dx-offer-more">Next ride · you are driving a rider</span> : null}
        </div> : null}
      </div>
      <figcaption>{shown === "radar" ? `Driver app · Radar ${radarView === "full" ? "full screen" : radarView === "driving" ? "while driving" : "popup"}` : "Driver app · Exclusive offer"}</figcaption>
    </figure>
  );
}

export function RiderWaitingPreview({ zone }: { zone: ZoneDispatch }) {
  const steps = zone.waiting.filter((step) => step.on).sort((a, b) => a.afterMin - b.afterMin);
  const [pick, setPick] = useState<string | null>(null);
  const step = steps.find((item) => item.id === pick) ?? steps[0] ?? null;
  const label = step ? WAIT_KINDS.find((item) => item.id === step.kind)?.label ?? "" : "";
  return (
    <figure className="dp-phone dx-phone" aria-label="Rider waiting preview">
      <div className="dx-step-pick" role="group" aria-label="Waiting step to show">
        {steps.map((item) => (
          <button data-command="admin.dispatch.view" key={item.id} type="button" aria-pressed={item.id === step?.id} className={item.id === step?.id ? "on" : undefined} onClick={() => setPick(item.id)}>{item.afterMin} min</button>
        ))}
      </div>
      <div className="dp-screen dx-rider">
        <div className="dp-status"><span>9:41</span><span className="ra-notch" aria-hidden="true" /><span>5G</span></div>
        <div className="dx-rider-map" aria-hidden="true">
          <span className="dx-pulse" />
        </div>
        <div className="dx-rider-sheet" aria-label="Rider screen">
          <span className="dx-rider-wait"><Clock size={12} aria-hidden="true" /> Looking for a driver{step ? ` · ${step.afterMin} min` : ""}</span>
          {step ? (
            <>
              <b>{label}</b>
              <p>{step.message}</p>
              {step.kind === "raise_price" ? <span className="dx-rider-btn"><TrendingUp size={12} aria-hidden="true" /> Raise my price</span> : null}
              {step.kind === "upgrade" ? <span className="dx-rider-row"><span className="dx-rider-btn"><Sparkles size={12} aria-hidden="true" /> Priority</span><span className="dx-rider-btn ghost">Comfort</span></span> : null}
              {step.kind === "keep_waiting" ? <span className="dx-rider-row"><span className="dx-rider-btn">Wait {step.extraMin ?? 3} more min</span><span className="dx-rider-btn ghost">Stop</span></span> : null}
              {step.kind === "alert_admin" ? <span className="dx-rider-row"><Users size={12} aria-hidden="true" /> Our team is helping you.</span> : null}
              {step.kind === "busy" ? <span className="dx-rider-btn ghost">Try again later</span> : null}
            </>
          ) : <p>No message is on. The rider only sees “Looking for a driver”.</p>}
          <span className="dx-rider-cancel">Cancel request</span>
        </div>
      </div>
      <figcaption>Rider app · while waiting</figcaption>
    </figure>
  );
}
