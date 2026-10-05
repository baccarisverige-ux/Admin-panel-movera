import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { AppShell } from "./layout/AppShell";
import { ADMIN_PAGES, pageForPath, type AdminPage } from "./nav";
import { DashboardPage } from "./pages/DashboardPage";
import { GenericPage } from "./pages/GenericPage";
import { PricingPage } from "./pages/PricingPage";
import { ZonesPage } from "./pages/ZonesPage";

function PageBody({ pageId }: { pageId: string }) {
  if (pageId === "dashboard") return <DashboardPage />;
  if (pageId === "zones") return <ZonesPage />;
  if (pageId === "pricing") return <PricingPage />;
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
        <p>That address is not an admin screen. The link may be old, or the page has not been added yet.</p>
        <button className="btn" type="button" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

function ShellRoute() {
  const location = useLocation();
  const known = ADMIN_PAGES.some((page) => page.path === location.pathname);
  const page: AdminPage = known
    ? pageForPath(location.pathname)
    : {
        id: "not-found",
        path: location.pathname,
        label: "Page not found",
        crumb: "404",
        icon: "!",
      };

  return (
    <AppShell page={page}>
      <section className="page active" data-page={page.id}>
        {known ? <PageBody pageId={page.id} /> : <NotFound />}
      </section>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <Routes>
        <Route path="*" element={<ShellRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
