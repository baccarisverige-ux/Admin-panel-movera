import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Bell,
  BarChart3,
  Building2,
  CalendarClock,
  Car,
  CircleDollarSign,
  Flag,
  Gauge,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Megaphone,
  Menu,
  Newspaper,
  Plane,
  Radar,
  Route,
  ScrollText,
  Search,
  Settings,
  Shield,
  Siren,
  SlidersHorizontal,
  Star,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { setPresence } from "./actions";
import { ROLES, ZONES, type Agent, type Permission, type ZoneId } from "./domain";
import { useAdmin } from "./store";
import { A, Button, cn, Select } from "./ui";

const NAV: { group: string; href: string; label: string; icon: LucideIcon; need?: Permission | Permission[] }[] = [
  { group: "Overview", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { group: "Overview", href: "/map", label: "Live map", icon: Map, need: "trips.view" },
  { group: "Overview", href: "/search", label: "Search", icon: Search },
  { group: "Operations", href: "/trips", label: "Trips", icon: Route, need: "trips.view" },
  { group: "Operations", href: "/reservations", label: "Reservations", icon: CalendarClock, need: "reservations.manage" },
  { group: "Operations", href: "/dispatch", label: "Dispatch rules", icon: Radar, need: "settings.edit" },
  { group: "Operations", href: "/incidents", label: "Safety", icon: Siren, need: "safety.respond" },
  { group: "Operations", href: "/risk", label: "Risk", icon: Gauge, need: "safety.respond" },
  { group: "People", href: "/drivers", label: "Drivers", icon: Users, need: "drivers.view" },
  { group: "People", href: "/onboarding", label: "Onboarding", icon: Shield, need: "documents.review" },
  { group: "People", href: "/vehicles", label: "Vehicles", icon: Car, need: "vehicles.review" },
  { group: "People", href: "/riders", label: "Riders", icon: UserRound, need: "riders.view" },
  { group: "People", href: "/fleet", label: "Fleet partners", icon: Building2, need: "drivers.view" },
  { group: "People", href: "/reviews", label: "Reviews", icon: Star, need: "drivers.view" },
  { group: "Finance", href: "/payments", label: "Payments", icon: Wallet, need: ["payouts.manage", "refunds.approve", "bank.review"] },
  { group: "Finance", href: "/refunds", label: "Refunds", icon: CircleDollarSign, need: "refunds.approve" },
  { group: "Finance", href: "/payouts", label: "Payouts", icon: Landmark, need: "payouts.manage" },
  { group: "Finance", href: "/wallet", label: "Wallet", icon: Wallet, need: "payouts.manage" },
  { group: "Finance", href: "/bank", label: "Bank details", icon: Landmark, need: "bank.review" },
  { group: "Finance", href: "/methods", label: "Payment methods", icon: BadgeDollarSign, need: "pricing.edit" },
  { group: "Finance", href: "/reconcile", label: "Reconciliation", icon: BarChart3, need: "payouts.manage" },
  { group: "Places", href: "/zones", label: "Zones", icon: Map, need: "drivers.view" },
  { group: "Places", href: "/airports", label: "Airports", icon: Plane, need: "settings.edit" },
  { group: "Places", href: "/pickups", label: "Pickup points", icon: Flag, need: "drivers.view" },
  { group: "Places", href: "/categories", label: "Categories", icon: SlidersHorizontal, need: "pricing.edit" },
  { group: "Places", href: "/pricing", label: "Price sets", icon: BadgeDollarSign, need: "pricing.edit" },
  { group: "Places", href: "/boost", label: "Boost", icon: Gauge, need: "pricing.edit" },
  { group: "Support", href: "/support", label: "Support queue", icon: LifeBuoy, need: "support.handle" },
  { group: "Support", href: "/chat", label: "Chat", icon: LifeBuoy, need: "support.handle" },
  { group: "Support", href: "/help", label: "Help center", icon: Newspaper, need: "content.edit" },
  { group: "Content", href: "/driver-home", label: "Driver Home", icon: Newspaper, need: "content.edit" },
  { group: "Content", href: "/banners", label: "Banners", icon: Megaphone, need: "messages.send" },
  { group: "Content", href: "/events", label: "Events", icon: Flag, need: "content.edit" },
  { group: "Content", href: "/messages", label: "Messages", icon: Megaphone, need: "messages.send" },
  { group: "Content", href: "/bonuses", label: "Bonuses", icon: Star, need: "content.edit" },
  { group: "Content", href: "/promotions", label: "Promotions", icon: BadgeDollarSign, need: "content.edit" },
  { group: "Content", href: "/referral", label: "Referral", icon: UserRound, need: "content.edit" },
  { group: "Content", href: "/legal", label: "Legal texts", icon: ScrollText, need: "content.edit" },
  { group: "Content", href: "/reasons", label: "Reasons", icon: ScrollText, need: "settings.edit" },
  { group: "Platform", href: "/features", label: "Features", icon: SlidersHorizontal, need: "settings.edit" },
  { group: "Platform", href: "/versions", label: "App versions", icon: SlidersHorizontal, need: "settings.edit" },
  { group: "Platform", href: "/reservation-rules", label: "Reservation rules", icon: CalendarClock, need: "settings.edit" },
  { group: "Platform", href: "/safety", label: "Safety settings", icon: Shield, need: "settings.edit" },
  { group: "Platform", href: "/driving", label: "Driving rules", icon: Gauge, need: "settings.edit" },
  { group: "Platform", href: "/requirements", label: "Requirements", icon: Shield, need: "documents.review" },
  { group: "Platform", href: "/publish", label: "Publish", icon: ScrollText, need: "settings.edit" },
  { group: "Platform", href: "/approvals", label: "Approvals", icon: Shield, need: ["settings.edit", "refunds.approve"] },
  { group: "Platform", href: "/team", label: "Team & roles", icon: Shield, need: "team.manage" },
  { group: "Platform", href: "/audit", label: "Audit log", icon: ScrollText, need: "audit.view" },
  { group: "Platform", href: "/reports", label: "Reports", icon: BarChart3, need: ["audit.view", "payouts.manage"] },
  { group: "Platform", href: "/settings", label: "Settings", icon: Settings, need: ["settings.edit", "content.edit"] },
  { group: "Platform", href: "/system", label: "System", icon: Settings, need: "settings.edit" },
];

function allowed(need: Permission | Permission[] | undefined, can: (permission: Permission) => boolean) {
  if (!need) return true;
  return Array.isArray(need) ? need.some((item) => can(item)) : can(need);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { agent, can, db, switchAgent, logout, run, scopeZone, setScopeZone } = useAdmin();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [inbox, setInbox] = useState(false);
  const [query, setQuery] = useState("");
  const sos = db?.incidents.find((item) => item.status === "open");
  const inboxItems = [
    ...(db?.incidents.filter((item) => item.status !== "closed").map((item) => ({ href: `/incidents/${item.id}`, label: `${item.kind.toUpperCase()} · ${item.area}` })) ?? []),
    ...(db?.tickets.filter((item) => item.status !== "solved").map((item) => ({ href: `/support/${item.id}`, label: item.subject })) ?? []),
  ];
  const groups = [...new Set(NAV.map((item) => item.group))];
  useEffect(() => {
    const zone = new URLSearchParams(search).get("zone");
    if (!zone || zone === "all") setScopeZone("all");
    else if (ZONES.some((item) => item.id === zone)) setScopeZone(zone as ZoneId);
  }, [search, setScopeZone]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {open ? <button className="fixed inset-0 z-30 bg-ink/40 md:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-paper transition-transform md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-ink text-sm font-semibold text-paper">M</span>
          <div>
            <div className="text-sm font-semibold">Movera Admin</div>
            <div className="text-xs text-muted">Stockholm</div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((group) => (
            <div key={group} className="mt-3">
              <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{group}</div>
              {NAV.filter((item) => item.group === group && allowed(item.need, can)).map((item) => {
                const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <A
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn("flex h-11 items-center gap-2 rounded-xl px-3 text-sm", active ? "bg-ink text-paper" : "text-ink hover:bg-canvas")}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span>{item.label}</span>
                  </A>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper px-4">
          <button className="grid size-11 place-items-center rounded-xl border border-line md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <form
            className="min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              const q = query.trim();
              void navigate({ href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" });
              setOpen(false);
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search driver, rider, trip, plate"
              aria-label="Search"
              className="h-11 w-full max-w-md rounded-full border border-line bg-canvas px-4 text-sm"
            />
          </form>
          <span className="hidden rounded-full border border-line px-3 py-1 text-xs text-muted lg:inline">Demo</span>
          <label className="hidden text-xs text-muted sm:block">
            <span className="sr-only">Zone scope</span>
            <Select
              value={scopeZone}
              aria-label="Zone scope"
              onChange={(event) => {
                const zone = event.target.value as ZoneId | "all";
                setScopeZone(zone);
                const params = new URLSearchParams(search);
                if (zone === "all") params.delete("zone");
                else params.set("zone", zone);
                const next = params.toString();
                void navigate({ href: `${path}${next ? `?${next}` : ""}` });
              }}
            >
              <option value="all">All Stockholm</option>
              {ZONES.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </Select>
          </label>
          <div className="relative">
            <button className="relative grid size-11 place-items-center rounded-full border border-line" aria-label={`Inbox, ${inboxItems.length} open`} onClick={() => setInbox((value) => !value)}>
              <Bell className="size-4" />
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] text-paper">{inboxItems.length}</span>
            </button>
            {inbox ? (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-paper p-3 text-sm">
                <p className="text-xs text-muted">Open incidents and tickets. Count is the real queue.</p>
                <ul className="mt-2 space-y-2">
                  {inboxItems.map((item) => <li key={item.href}><A href={item.href} onClick={() => setInbox(false)} className="underline-offset-2 hover:underline">{item.label}</A></li>)}
                  {inboxItems.length === 0 ? <li className="text-muted">Nothing waiting.</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button className="flex h-11 items-center gap-2 rounded-full border border-line px-2 pr-3" onClick={() => setMenu((value) => !value)}>
              <span className="grid size-8 place-items-center rounded-full bg-ink text-xs text-paper">{agent?.name.slice(0, 1)}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-ink">{agent?.name}</span>
                <span className="block text-xs text-muted">{ROLES.find((role) => role.id === agent?.role)?.name}</span>
              </span>
            </button>
            {menu ? (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-paper p-3">
                <label className="text-xs text-muted">
                  Switch demo agent
                  <Select className="mt-1 w-full" value={agent?.id} onChange={(event) => switchAgent(event.target.value)}>
                    {db?.agents.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} · {ROLES.find((role) => role.id === item.role)?.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="mt-3 block text-xs text-muted">
                  Your presence
                  <Select
                    className="mt-1 w-full"
                    value={agent?.presence}
                    onChange={(event) => void run((data, who) => setPresence(data, who, event.target.value as Agent["presence"]))}
                  >
                    <option value="online">Online</option>
                    <option value="away">Away</option>
                    <option value="off">Off</option>
                  </Select>
                </label>
                <Button variant="ghost" className="mt-3 w-full" onClick={logout}>Sign out</Button>
              </div>
            ) : null}
          </div>
        </header>
        {sos && can("safety.respond") ? (
          <A href={`/incidents/${sos.id}`} className="flex items-center gap-2 bg-bad px-4 py-3 text-sm text-paper">
            <Siren className="size-4" aria-hidden />
            SOS open · {sos.area}. Take it.
          </A>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-2 text-xs text-muted">
          <span>Demo simulation · Stockholm · SEK · not connected to the apps</span>
          <span className="hidden sm:inline">{ROLES.find((role) => role.id === agent?.role)?.name}</span>
        </div>
        <main className="px-4 py-5 md:px-8">{children}</main>
        <footer className="px-4 pb-6 text-xs text-muted md:px-8">Demo simulation · Stockholm · SEK · Europe/Stockholm · build marker gate-a · 5 Oct 2026 · not the rider or driver app</footer>
      </div>
    </div>
  );
}
