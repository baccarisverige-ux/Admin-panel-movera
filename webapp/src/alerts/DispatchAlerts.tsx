import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Bell } from "lucide-react";
import { useAlertsData } from "./AlertsContext";
import { AlertActions, StatusLine } from "./AlertActions";

/** Dispatch → Live shows the dispatch alerts from Alerts, so taking one here takes it everywhere. */
export function DispatchAlerts({ zoneIds }: { zoneIds: string[] }) {
  const data = useAlertsData();
  const [notice, setNotice] = useState("");
  const list = data.active.filter((alert) => alert.group === "dispatch" && alert.zoneId && zoneIds.includes(alert.zoneId));
  return (
    <section className="dx-alerts" aria-label="Alerts">
      <h3><Bell size={15} aria-hidden="true" /> Alerts <span className="dx-count">{list.length}</span> <Link className="link-action" to="/alerts">See all alerts</Link></h3>
      {notice ? <p className="pricing-notice" role="status">{notice}</p> : null}
      {list.length === 0 ? <p className="dx-calm">No dispatch alert right now. Limits are set per zone in Rules → Alerts.</p> : (
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
