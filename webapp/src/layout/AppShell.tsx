import type { ReactNode } from "react";
import { useState } from "react";
import { ADMIN_PAGES, type AdminPage } from "../nav";
import { ZoneSelect } from "../ui/ZoneSelect";

type AppShellProps = {
  page: AdminPage;
  onNavigate: (path: string) => void;
  children: ReactNode;
};

export function AppShell({ page, onNavigate, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const heading = page.id === "dashboard" ? "Movera Admin Dashboard" : page.label;

  function go(path: string) {
    onNavigate(path);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <span>Movera Admin</span>
        </div>
        <nav className="nav">
          {ADMIN_PAGES.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className={item.id === page.id ? "active" : undefined}
              onClick={(event) => {
                event.preventDefault();
                go(item.path);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
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
      </section>
    </div>
  );
}
