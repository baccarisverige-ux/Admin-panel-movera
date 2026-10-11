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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminProviders>
      <App />
    </AdminProviders>
  </StrictMode>,
);
