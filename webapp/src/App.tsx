import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { can, permissionForPage } from "./auth/permissions";
import { SessionProvider, useSession } from "./auth/SessionContext";
import { AppShell } from "./layout/AppShell";
import { ADMIN_PAGES, pageForPath, type AdminPage } from "./nav";
import { AuditPage } from "./pages/AuditPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GenericPage } from "./pages/GenericPage";
import { LoginPage } from "./pages/LoginPage";
import { PricingPage } from "./pages/PricingPage";
import { TeamPage } from "./pages/TeamPage";
import { ZonesPage } from "./pages/ZonesPage";

function PageBody({ pageId }: { pageId: string }) {
  if (pageId === "audit") return <AuditPage />;
  if (pageId === "dashboard") return <DashboardPage />;
  if (pageId === "zones") return <ZonesPage />;
  if (pageId === "pricing") return <PricingPage />;
  if (pageId === "team") return <TeamPage />;
  return <GenericPage pageId={pageId} />;
}

export function routerBasename(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base === "" ? "/" : base;
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page-heading">
      <div>
        <h2>Page not found</h2>
        <p>That address is not an admin screen.</p>
        <button className="primary-btn" type="button" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="page-heading">
      <div>
        <h2>No access</h2>
        <p>Your role cannot open this page. The attempt is refused here, not hidden as an empty screen.</p>
      </div>
    </div>
  );
}

function ShellRoute() {
  const location = useLocation();
  const { agent } = useSession();
  const team = location.pathname === "/team";
  const known = team || ADMIN_PAGES.some((page) => page.path === location.pathname);
  const page: AdminPage = team
    ? { id: "team", path: "/team", label: "Team and roles", crumb: "Team", icon: "·" }
    : known
      ? pageForPath(location.pathname)
      : { id: "not-found", path: location.pathname, label: "Page not found", crumb: "404", icon: "!" };
  const allowed = !agent || !known || can(agent.role, permissionForPage(page.id));

  return (
    <AppShell page={page}>
      <section className="page active" data-page={page.id}>
        {!known ? <NotFound /> : allowed ? <PageBody pageId={page.id} /> : <NoAccess />}
      </section>
    </AppShell>
  );
}

function Authed() {
  const { agent } = useSession();
  if (!agent) return <LoginPage />;
  return (
    <Routes>
      <Route path="*" element={<ShellRoute />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <SessionProvider>
        <Authed />
      </SessionProvider>
    </BrowserRouter>
  );
}
