import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminProviders } from "./api/AdminApiContext";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/dashboard.css";
import "./styles/fleet.css";
import "./styles/pricing.css";
import "./styles/zones.css";
import "./styles/bonus.css";
import "./styles/riders.css";
import "./styles/dispatch.css";
import "./styles/alerts.css";
import "./styles/reports.css";
import "./styles/ops.css";
import "./styles/fleetops.css";
import "./styles/finance.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminProviders>
      <App />
    </AdminProviders>
  </StrictMode>,
);
