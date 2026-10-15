import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { useAlertsData } from "./AlertsContext";
import { AlertActions, StatusLine } from "./AlertActions";
import { OpenRideCheck } from "./OpenRideCheck";

/** Dispatch → Live shows the dispatch alerts from Alerts, so taking one here takes it everywhere. */
export function DispatchAlerts({ zoneIds }: { zoneIds: string[] }) {
  const data = useAlertsData();
  const [notice, setNotice] = useState("");
  const list = data.active.filter((alert) => alert.group === "dispatch" && alert.zoneId && zoneIds.includes(alert.zoneId));
  // Ride check alerts come first in Live: someone on a trip may need help.
  const rides = data.active.filter((alert) => alert.kind === "ride_check" && alert.zoneId && zoneIds.includes(alert.zoneId));
  return (
    <section className="dx-alerts" aria-label="Alerts">
      <h3><Bell size={15} aria-hidden="true" /> Alerts <span className="dx-count">{list.length + rides.length}</span> <Link className="link-action" to="/alerts">See all alerts</Link></h3>
      {notice ? <p className="pricing-notice" role="status">{notice}</p> : null}
      {rides.length ? (
        <ul aria-label="Ride checks in Live">
          {rides.map((alert) => (
            <li key={alert.id} className="red rc-live">
              <ShieldAlert size={14} aria-hidden="true" /> <span>{alert.title} · {alert.detail} <StatusLine alert={alert} /></span>
              <OpenRideCheck alert={alert} label="Open ride check" className="dash-btn small danger" />
            </li>
          ))}
        </ul>
      ) : null}
      {list.length === 0 && rides.length === 0 ? <p className="dx-calm">No dispatch alert right now. Limits are set per zone in Rules → Alerts.</p> : list.length === 0 ? null : (
        <ul>
          {list.slice(0, 8).map((alert) => (
            <li key={alert.id} className={alert.level === "info" ? "orange" : alert.level === "important" ? "orange" : "red"}>
              <AlertTriangle size={14} aria-hidden="true" /> <span>{alert.title} <StatusLine alert={alert} /></span>
              <AlertActions alert={alert} compact onDone={setNotice} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
