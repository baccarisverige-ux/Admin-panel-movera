import type { ReactNode } from "react";
import { ADMIN_PAGES, type AdminPage } from "../nav";

type AppShellProps = {
  page: AdminPage;
  onNavigate: (path: string) => void;
  children: ReactNode;
};

export function AppShell({ page, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
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
                onNavigate(item.path);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{page.label}</h1>
            <p className="crumb">{page.crumb}</p>
          </div>
          <div className="admin-profile">
            <strong>Admin User</strong>
            <span>Super Admin</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}
