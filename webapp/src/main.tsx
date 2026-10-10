import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminProviders } from "./api/AdminApiContext";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/dashboard.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminProviders>
      <App />
    </AdminProviders>
  </StrictMode>,
);
