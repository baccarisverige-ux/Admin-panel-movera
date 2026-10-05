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
import { allowedZones, can, canUseZone } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { useAdminApi } from "../api/AdminApiContext";
import { useInbox, useSearch } from "../api/hooks";
import { ZONES } from "../api/seed";
import type { Fault } from "../api/demoStore";
import { MENU, MENU_GROUPS, type MenuItem, type NavIcon } from "../nav";
import { CommandButton } from "../ui/CommandButton";

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
  const zoneOptions = allowedZones(agent ?? { id: "", email: "", name: "", password: "", code: "", role: "viewer", active: false, presence: "away", scope: { zones: "all", market: "SE-STO" } }, ZONES.map(([id, name]) => ({ id, name })));
  const scopeDenied = Boolean(agent && scope && !canUseZone(agent, scope));
  const found = useSearch(searchOpen ? query : "");
  const inbox = useInbox();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const stockholm = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(clock);

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
      <a className="skip-link" href="#content">Skip to content</a>
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
          <CommandButton command="admin.shell.menu" className="icon-btn mobile-menu" type="button" aria-label="Open menu" onDone={() => setMenuOpen((open) => !open)}>
            <Menu size={18} aria-hidden="true" />
          </CommandButton>
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
              <option value="">All allowed zones</option>
              {zoneOptions.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <CommandButton command="admin.shell.search" className="secondary-btn" type="button" onDone={() => setSearchOpen(true)}>Search</CommandButton>
            <CommandButton command="admin.shell.inbox" className="secondary-btn" type="button" aria-label="Inbox" onDone={() => setInboxOpen((open) => !open)}>Inbox</CommandButton>
            <div className="admin-profile">
              <div className="avatar">{agent ? agent.name.slice(0, 2).toUpperCase() : "AD"}</div>
              <div>
                <strong>{agent?.name ?? "Signed out"}</strong>
                <span>{stockholm} · {env} · {scope || "all"} · {agent?.role ?? "signed out"}</span>
              </div>
              {agent?.role === "super" ? (
                <>
                  <select aria-label="Simulate errors" defaultValue="none" onChange={(event) => void api.setFault(event.target.value as Fault)}>
                    {["none", "401", "403", "409", "422", "429", "503", "offline", "slow", "empty"].map((fault) => (
                      <option key={fault} value={fault}>{fault}</option>
                    ))}
                  </select>
                  <CommandButton command="admin.shell.reset" className="link-action" type="button" onDone={() => void api.reset().then(() => client.invalidateQueries())}>Reset demo</CommandButton>
                </>
              ) : null}
              <CommandButton command="admin.shell.signOut" className="link-action" type="button" onDone={signOut}>Sign out</CommandButton>
            </div>
          </div>
        </header>
        {scopeDenied ? <p className="state-line">No access to scope {scope}. Choose an allowed zone.</p> : null}
        {searchOpen ? (
          <div className="panel">
            <label>
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plate, trip or phone" />
            </label>
            <ul>
              {(found.data ?? []).map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <CommandButton command="admin.shell.openHit" className="link-action" type="button" onDone={() => { setSearchOpen(false); navigate(hit.path); }}>{hit.kind}: {hit.label}</CommandButton>
                </li>
              ))}
            </ul>
            <CommandButton command="admin.shell.closeSearch" className="secondary-btn" type="button" onDone={() => setSearchOpen(false)}>Close</CommandButton>
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
        <main id="content" tabIndex={-1} className="content">{children}</main>
        <footer className="build-footer">Demo data · {env} · {buildLabel()}</footer>
      </section>
    </div>
  );
}
