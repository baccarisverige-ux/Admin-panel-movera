import { useEffect, useState } from "react";
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
  const [path, setPath] = useState(
    () => window.location.pathname.replace(/\/+$/, "") || "/",
  );

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname.replace(/\/+$/, "") || "/");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const page = pageForPath(path);

  function navigate(next: string) {
    window.history.pushState({}, "", next);
    setPath(next);
  }

  return (
    <AppShell page={page} onNavigate={navigate}>
      <section className="page active" data-page={page.id}>
        <PageBody pageId={page.id} />
      </section>
    </AppShell>
  );
}
