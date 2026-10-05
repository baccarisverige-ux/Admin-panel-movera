import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import { Menu } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { can, permissionForPage } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { ADMIN_PAGES, type AdminPage } from "../nav";
import { ZoneSelect } from "../ui/ZoneSelect";

type AppShellProps = {
  page: AdminPage;
  children: ReactNode;
};

function buildLabel(): string {
  const sha = import.meta.env.VITE_BUILD_SHA;
  if (!sha) return "local";
  return sha.slice(0, 7);
}

export function AppShell({ page, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { agent, signOut } = useSession();
  const heading = page.id === "dashboard" ? "Movera Admin Dashboard" : page.label;
  const pages = ADMIN_PAGES.filter((item) => !agent || can(agent.role, permissionForPage(item.id)));

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <span>Movera Admin</span>
        </div>
        <nav className="nav">
          {pages.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={item.id === page.id ? "active" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div>
            <h1>{heading}</h1>
            <p className="crumb">{page.crumb}</p>
          </div>
          <div className="topbar-actions">
            <ZoneSelect scoped />
            <button className="icon-btn notification-btn" type="button" aria-label="Notifications">
              🔔
              <span className="notification-count">3</span>
            </button>
            <div className="admin-profile">
              <div className="avatar">{agent ? agent.name.slice(0, 2).toUpperCase() : "AD"}</div>
              <div>
                <strong>{agent?.name ?? "Admin User"}</strong>
                <span>{agent?.role ?? "signed out"}</span>
              </div>
              {agent && can(agent.role, "riders.read") ? <Link to="/riders">Riders</Link> : null}
              {agent && can(agent.role, "team.read") ? (
                <Link to="/team">Team</Link>
              ) : null}
              <button className="link-action" type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="build-footer">
          <span>Demo data</span>
          <span>{formatInTimeZone(new Date(), "Europe/Stockholm", "yyyy-MM-dd HH:mm")}</span>
          <span>{buildLabel()}</span>
        </footer>
      </section>
    </div>
  );
}
