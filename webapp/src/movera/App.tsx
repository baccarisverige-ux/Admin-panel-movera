import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AppShell } from "./layout/AppShell";
import { pageForPath } from "./nav";
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

export function App() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/+$/, "") || "/",
  });
  const navigate = useNavigate();
  const page = pageForPath(pathname);

  return (
    <AppShell
      page={page}
      onNavigate={(next) => {
        void navigate({ href: next });
      }}
    >
      <section className="page active" data-page={page.id}>
        <PageBody pageId={page.id} />
      </section>
    </AppShell>
  );
}
