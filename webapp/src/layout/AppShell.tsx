import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  Palette,
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
import { useAdminApi } from "../api/AdminApiContext";
import { useFreshness, useInbox, useSearch } from "../api/hooks";
import { ZONES } from "../api/seed";
import type { Fault } from "../api/demoStore";
import { MENU, MENU_GROUPS, type MenuItem, type NavIcon } from "../nav";

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
  Palette,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const api = useAdminApi();
  const { agent, signOut } = useSession();
  const visible = MENU.filter((item) => !agent || can(agent.role, item.permission));
  const groups = MENU_GROUPS.filter((group) => visible.some((item) => item.group === group));
  const env = import.meta.env.VITE_DATA || "demo";
  const scope = params.get("scope") ?? "";
  const found = useSearch(searchOpen ? query : "");
  const inbox = useInbox();
  const freshness = useFreshness();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
            <select
              aria-label="Scope"
              value={scope}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) next.set("scope", event.target.value);
                else next.delete("scope");
                setParams(next);
              }}
            >
              <option value="">All Stockholm</option>
              {ZONES.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <button className="secondary-btn" type="button" onClick={() => setSearchOpen(true)}>Search</button>
            <button className="secondary-btn" type="button" aria-label="Inbox" onClick={() => setInboxOpen((open) => !open)}>Inbox</button>
            <div className="admin-profile">
              <div className="avatar">{agent ? agent.name.slice(0, 2).toUpperCase() : "AD"}</div>
              <div>
                <strong>{agent?.name ?? "Signed out"}</strong>
                <span>{env} · {scope || "all"} · {agent?.role ?? "signed out"} · {freshness.data ?? "…"}</span>
              </div>
              {agent?.role === "super" ? (
                <>
                  <select aria-label="Simulate errors" defaultValue="none" onChange={(event) => void api.setFault(event.target.value as Fault)}>
                    {["none", "401", "403", "409", "422", "429", "503", "offline", "slow", "empty"].map((fault) => (
                      <option key={fault} value={fault}>{fault}</option>
                    ))}
                  </select>
                  <button className="link-action" type="button" onClick={() => void api.reset().then(() => client.invalidateQueries())}>Reset demo</button>
                </>
              ) : null}
              <button className="link-action" type="button" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </header>
        {searchOpen ? (
          <div className="panel">
            <label>
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plate, trip or phone" />
            </label>
            <ul>
              {(found.data ?? []).map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button className="link-action" type="button" onClick={() => { setSearchOpen(false); navigate(hit.path); }}>{hit.kind}: {hit.label}</button>
                </li>
              ))}
            </ul>
            <button className="secondary-btn" type="button" onClick={() => setSearchOpen(false)}>Close</button>
          </div>
        ) : null}
        {inboxOpen ? (
          <div className="panel">
            <h3>Inbox</h3>
            <ul>
              {(inbox.data ?? []).map((item) => (
                <li key={item.id}><Link to={item.path} onClick={() => setInboxOpen(false)}>{item.title}</Link></li>
              ))}
            </ul>
          </div>
        ) : null}
        <main className="content">{children}</main>
        <footer className="build-footer">Demo data · {env} · {buildLabel()}</footer>
      </section>
    </div>
  );
}
