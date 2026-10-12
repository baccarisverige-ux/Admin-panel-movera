import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Bell, History, Settings2, Wand2 } from "lucide-react";
import { useAlertsData } from "../alerts/AlertsContext";
import { HistoryView } from "../alerts/HistoryView";
import { OpenView } from "../alerts/OpenView";
import { RulesView } from "../alerts/RulesView";
import { SettingsView } from "../alerts/SettingsView";

const VIEWS = [
  { id: "open", label: "Open", icon: Bell },
  { id: "history", label: "History & numbers", icon: History },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "rules", label: "Your rules", icon: Wand2 },
] as const;

type View = (typeof VIEWS)[number]["id"];

export function AlertsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const data = useAlertsData();
  const view: View = VIEWS.some((item) => item.id === params.get("view")) ? (params.get("view") as View) : "open";

  function go(next: View) {
    const copy = new URLSearchParams(params);
    if (next === "open") copy.delete("view");
    else copy.set("view", next);
    setParams(copy, { replace: true });
  }

  return (
    <div className="dx-page al-page">
      <header className="dx-head">
        <button data-command="admin.alerts.view" type="button" className="dash-btn ghost dx-back" aria-label="Go back" onClick={() => (view !== "open" ? go("open") : window.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <div className="dx-head-text">
          <h2>Alerts in {data.market.name}</h2>
          <p>Everything that needs an admin now, in one place. Take it, solve it, and everyone sees who did.</p>
        </div>
      </header>
      <div className="dash-tabs dx-views" role="tablist" aria-label="Alerts sections">
        {VIEWS.map((item) => {
          const Icon = item.icon;
          return (
            <button data-command="admin.alerts.view" key={item.id} type="button" role="tab" aria-selected={view === item.id} className={view === item.id ? "active" : undefined} onClick={() => go(item.id)}>
              <Icon size={15} aria-hidden="true" /> {item.label}{item.id === "open" && data.active.length ? <span className="tab-count">{data.active.length}</span> : null}
            </button>
          );
        })}
      </div>
      {data.loading ? <p className="state-line">Loading alerts.</p> : null}
      {view === "open" ? <OpenView /> : null}
      {view === "history" ? <HistoryView /> : null}
      {view === "settings" ? <SettingsView /> : null}
      {view === "rules" ? <RulesView /> : null}
    </div>
  );
}
