import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
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
  const heading = page.id === "dashboard" ? "Movera Admin Dashboard" : page.label;

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <span>Movera Admin</span>
        </div>
        <nav className="nav">
          {ADMIN_PAGES.map((item) => (
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
            ☰
          </button>
          <div>
            <h1>{heading}</h1>
            <p className="crumb">{page.crumb}</p>
          </div>
          <div className="topbar-actions">
            <ZoneSelect />
            <button className="icon-btn notification-btn" type="button" aria-label="Notifications">
              🔔
              <span className="notification-count">3</span>
            </button>
            <div className="admin-profile">
              <div className="avatar">AD</div>
              <div>
                <strong>Admin User</strong>
                <span>Super Admin</span>
              </div>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="build-footer">
          <span>Demo data</span>
          <span>{buildLabel()}</span>
        </footer>
      </section>
    </div>
  );
}
