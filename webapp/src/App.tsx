import { useEffect, useState } from "react";
import { AppShell } from "./layout/AppShell";
import { pageForPath } from "./nav";
import { PlaceholderPage } from "./pages/PlaceholderPage";

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
      <PlaceholderPage page={page} />
    </AppShell>
  );
}
