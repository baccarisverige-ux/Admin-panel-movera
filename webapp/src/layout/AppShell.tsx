import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router";
import {
  Banknote,
  BarChart3,
  CalendarClock,
  Car,
  ClipboardList,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPinned,
  Menu,
  MessageSquare,
  MessagesSquare,
  Route,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  Star,
  Tags,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { MENU, MENU_GROUPS, type MenuItem, type NavIcon } from "../nav";
import { ZoneSelect } from "../ui/ZoneSelect";

const ICONS: Record<NavIcon, typeof Menu> = {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Route,
  CalendarClock,
  Map,
  Users,
  UserPlus,
  UserRound,
  Car,
  Wallet,
  Banknote,
  MapPinned,
  Tags,
  LifeBuoy,
  MessagesSquare,
  Siren,
  ShieldAlert,
  MessageSquare,
  Images,
  Ticket,
  Star,
  ScrollText,
  Settings,
  Server,
  Shield,
};

type AppShellProps = {
  page: MenuItem;
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
  const visible = MENU.filter((item) => !agent || can(agent.role, item.permission));
  const groups = MENU_GROUPS.filter((group) => visible.some((item) => item.group === group));
  const env = import.meta.env.VITE_DATA || "demo";

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <span>Movera Admin</span>
        </div>
        <nav className="nav" aria-label="Main">
          {groups.map((group) => (
            <div key={group} className="nav-group">
              <p className="nav-group-label">{group}</p>
              {visible
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={item.id === page.id ? "active" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon className="nav-icon" size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <button className="icon-btn mobile-menu" type="button" aria-label="Open menu" onClick={() => setMenuOpen((open) => !open)}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <div>
            <h1>{page.label}</h1>
            <p className="crumb">{page.group}</p>
          </div>
          <div className="topbar-actions">
            <ZoneSelect scoped />
            <div className="admin-profile">
              <div className="avatar">{agent ? agent.name.slice(0, 2).toUpperCase() : "AD"}</div>
              <div>
                <strong>{agent?.name ?? "Signed out"}</strong>
                <span>{agent?.role ?? "signed out"}</span>
              </div>
              <button className="link-action" type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="build-footer">Demo data · {env} · {buildLabel()}</footer>
      </section>
    </div>
  );
}
