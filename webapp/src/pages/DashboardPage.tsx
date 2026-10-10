import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Car,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  LifeBuoy,
  Megaphone,
  RefreshCw,
  Repeat,
  Search,
  Siren,
  Ticket,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "../api/AdminApiContext";
import { useRecords } from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { DriversMap, STATE_COLOR } from "../dashboard/DriversMap";
import { EarningsChart } from "../dashboard/EarningsChart";
import { PeriodPicker } from "../dashboard/PeriodPicker";
import { change, COMMISSION_PLACEHOLDER, earningsReport, type Share } from "../dashboard/earnings";
import { countStates, LIVE_STATES, liveDrivers, type LiveState } from "../dashboard/live";
import { parsePeriod, periodParams, periodWindow, type Period } from "../dashboard/period";
import { demoShift, rideCounts, scheduledRides } from "../dashboard/scheduled";
import { RideTable } from "../dashboard/RideTable";
import { localDay, startOfLocalDay } from "../dashboard/time";
import { formatMoney } from "../markets/markets";
import { useMarketScope } from "../markets/useMarketScope";
import { Flag } from "../ui/Flag";

const FIVE_MIN = 5 * 60_000;
const DAY_MS = 86_400_000;

function useNow(stepMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(timer);
  }, [stepMs]);
  return now;
}

function Delta({ value, inverse = false, label }: { value: number | null; inverse?: boolean; label: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="delta flat">No comparison</span>;
  const up = value >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={good ? "delta good" : "delta bad"} title={label}>
      <Icon size={14} aria-hidden="true" />
      {up ? "+" : "−"}{Math.abs(value).toFixed(1)}%
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function Kpi({ icon, tone, label, value, delta, hint }: { icon: ReactNode; tone: string; label: string; value: string; delta?: ReactNode; hint?: string }) {
  return (
    <article className={`kpi tone-${tone}`}>
      <div className="kpi-icon" aria-hidden="true">{icon}</div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        <div className="kpi-foot">{delta}{hint ? <small>{hint}</small> : null}</div>
      </div>
    </article>
  );
}

function ShareBars({ rows, format }: { rows: Share[]; format: (minor: number) => string }) {
  const max = Math.max(...rows.map((row) => row.minor), 1);
  const total = rows.reduce((sum, row) => sum + row.minor, 0) || 1;
  return (
    <ul className="share-bars">
      {rows.slice(0, 8).map((row) => (
        <li key={row.id} title={`${row.label}: ${format(row.minor)}`}>
          <div className="share-head"><span>{row.label}</span><strong>{format(row.minor)}</strong><small>{Math.round((row.minor / total) * 100)}%</small></div>
          <div className="share-track"><i style={{ width: `${(row.minor / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

type Action = { id: string; label: string; icon: ReactNode; path?: string; permission: string; onRun?: () => void };

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const api = useAdminApi();
  const { agent } = useSession();
  const scope = useMarketScope();
  const { market, country } = scope;
  const zoneKey = (Array.isArray(scope.effective) ? scope.effective : [scope.effective]).filter((zone) => zone !== "__scope-denied__").join(",");
  const period = parsePeriod(params);
  const now = useNow(30_000);
  const reportNow = Math.floor(now / FIVE_MIN) * FIVE_MIN;
  const [tick, setTick] = useState(0);
  const [hidden, setHidden] = useState<Set<LiveState>>(() => new Set());
  const [rideTab, setRideTab] = useState<"upcoming" | "past" | "calendar">("upcoming");
  const [shareTab, setShareTab] = useState<"zone" | "category" | "method">("zone");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 5_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  const drivers = useRecords("drivers");
  const vehicles = useRecords("vehicles");
  const trips = useRecords("trips");
  const incidents = useRecords("incidents");
  const tickets = useRecords("tickets");
  const reservations = useRecords("reservations");
  const payouts = useRecords("payouts");
  const payments = useRecords("payments");
  const failed = [drivers, trips, incidents, tickets, reservations].find((query) => query.error);

  const money = (minor: number) => formatMoney(minor, country);
  const compact = (minor: number) => formatMoney(minor, country, { compact: true });
  const withScope = (path: string) => {
    const keep = new URLSearchParams();
    if (params.get("country") || params.get("scope")) keep.set("country", country);
    if (params.get("scope")) keep.set("scope", params.get("scope")!);
    return keep.size ? `${path}?${keep.toString()}` : path;
  };

  const periodKey = `${period.kind}|${period.on ?? ""}|${period.from ?? ""}|${period.to ?? ""}`;
  const span = useMemo(() => periodWindow(parsePeriod(new URLSearchParams(periodKeyToSearch(periodKey))), reportNow, market.timeZone, market.locale), [periodKey, reportNow, market]);
  const report = useMemo(() => earningsReport(country, zoneKey ? zoneKey.split(",") : [], span), [country, zoneKey, span]);
  const { totals, previous } = report;
  const cancelRate = totals.trips + totals.cancelled ? (totals.cancelled / (totals.trips + totals.cancelled)) * 100 : 0;
  const prevCancelRate = previous.trips + previous.cancelled ? (previous.cancelled / (previous.trips + previous.cancelled)) * 100 : 0;
  const avgWait = totals.trips ? totals.waitMinTotal / totals.trips : 0;
  const prevWait = previous.trips ? previous.waitMinTotal / previous.trips : 0;
  const avgFare = totals.trips ? totals.grossMinor / totals.trips : 0;
  const prevAvgFare = previous.trips ? previous.grossMinor / previous.trips : 0;
  const number = new Intl.NumberFormat(market.locale);

  const live = useMemo(
    () => liveDrivers(drivers.data ?? [], vehicles.data ?? [], trips.data ?? [], incidents.data ?? [], tick),
    [drivers.data, vehicles.data, trips.data, incidents.data, tick],
  );
  const liveCounts = countStates(live);

  const shift = demoShift(now, api.demo);
  const rides = useMemo(() => scheduledRides(reservations.data ?? [], drivers.data ?? [], now, shift), [reservations.data, drivers.data, now, shift]);
  const counts = rideCounts(rides, now);
  const upcoming = rides.filter((ride) => ride.pickupAt >= now && ride.pickupAt < now + 7 * DAY_MS);
  const past = rides.filter((ride) => ride.pickupAt < now && ride.pickupAt >= span.start).reverse();

  const sos = (incidents.data ?? []).filter((row) => row.status === "queued");
  const openTickets = (tickets.data ?? []).filter((row) => row.status === "open");
  const pendingDrivers = (drivers.data ?? []).filter((row) => row.status === "pending");
  const scheduledPayouts = (payouts.data ?? []).filter((row) => row.status === "scheduled");
  const failedPayments = (payments.data ?? []).filter((row) => row.status === "failed");
  const urgentRides = rides.filter((ride) => ride.warning === "red");

  const role = agent?.role ?? "viewer";
  const alerts = [
    { id: "sos", tone: "critical", icon: <Siren size={16} aria-hidden="true" />, permission: "incidents.read", count: sos.length, text: sos.length === 1 ? "SOS waiting for a responder" : "SOS alerts waiting for a responder", path: "/incidents" },
    { id: "late", tone: "critical", icon: <CalendarClock size={16} aria-hidden="true" />, permission: "trips.read", count: urgentRides.length, text: "scheduled rides start within the hour with no driver", path: "/reservations" },
    { id: "pay", tone: "serious", icon: <CreditCard size={16} aria-hidden="true" />, permission: "finance.read", count: failedPayments.length, text: "failed payments to review", path: "/payments" },
    { id: "support", tone: "warning", icon: <LifeBuoy size={16} aria-hidden="true" />, permission: "support.reply", count: openTickets.length, text: "open support tickets", path: "/support" },
  ].filter((alert) => alert.count > 0 && can(role, alert.permission));

  const actions: Action[] = ([
    { id: "sos", label: "Claim SOS", icon: <Siren size={16} aria-hidden="true" />, path: "/incidents", permission: "incidents.read" },
    { id: "assign", label: "Assign ride", icon: <CalendarClock size={16} aria-hidden="true" />, path: "/reservations", permission: "trips.intervene" },
    { id: "review", label: "Review drivers", icon: <UserCheck size={16} aria-hidden="true" />, path: "/onboarding", permission: "documents.approve" },
    { id: "refund", label: "Refund / voucher", icon: <Repeat size={16} aria-hidden="true" />, path: "/payments", permission: "payments.refund" },
    { id: "payouts", label: "Approve payouts", icon: <Banknote size={16} aria-hidden="true" />, path: "/payouts", permission: "finance.read" },
    { id: "surge", label: "Surge & boost", icon: <Zap size={16} aria-hidden="true" />, path: "/pricing", permission: "settings.edit" },
    { id: "message", label: "Send message", icon: <Megaphone size={16} aria-hidden="true" />, path: "/messages", permission: "settings.edit" },
    { id: "promo", label: "Create promo", icon: <Ticket size={16} aria-hidden="true" />, path: "/promotions", permission: "settings.edit" },
    { id: "export", label: "Export report", icon: <Download size={16} aria-hidden="true" />, path: "/reports", permission: "overview.read" },
    {
      id: "search",
      label: "Search (Ctrl+K)",
      icon: <Search size={16} aria-hidden="true" />,
      permission: "overview.read",
      onRun: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true })),
    },
  ] satisfies Action[]).filter((action) => can(role, action.permission));
  const mainActions = actions.slice(0, 6);
  const moreActions = actions.slice(6);

  const unassigned = rides.filter((ride) => ride.pickupAt >= now && (ride.status === "waiting" || ride.status === "booked") && !ride.driver);
  const queues = [
    { label: "Unclaimed SOS", permission: "incidents.read", count: sos.length, path: "/incidents", icon: <Siren size={16} />, tone: "critical" },
    { label: "Open support", permission: "support.reply", count: openTickets.length, path: "/support", icon: <LifeBuoy size={16} />, tone: "warning" },
    { label: "Drivers to review", permission: "drivers.read", count: pendingDrivers.length, path: "/onboarding", icon: <UserPlus size={16} />, tone: "info" },
    { label: "Rides without driver", permission: "trips.read", count: unassigned.length, path: "/reservations", icon: <CalendarClock size={16} />, tone: "serious" },
    { label: "Payouts scheduled", permission: "finance.read", count: scheduledPayouts.length, path: "/payouts", icon: <Banknote size={16} />, tone: "good" },
  ].filter((queue) => can(role, queue.permission));

  function setPeriod(next: Period) {
    setParams(periodParams(next, params));
  }

  const shares = shareTab === "zone" ? report.byZone : shareTab === "category" ? report.byCategory : report.byMethod;
  const loading = drivers.isLoading || trips.isLoading;
  const timeFormat = new Intl.DateTimeFormat(market.locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: market.timeZone });
  const dayFormat = new Intl.DateTimeFormat(market.locale, { weekday: "short", day: "numeric", month: "short", timeZone: market.timeZone });

  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const start = startOfLocalDay(now, market.timeZone, index);
    const end = startOfLocalDay(now, market.timeZone, index + 1);
    const dayRides = rides.filter((ride) => ride.pickupAt >= start && ride.pickupAt < end && ride.status !== "cancelled");
    return { key: localDay(start + 3_600_000, market.timeZone), start, total: dayRides.length, open: dayRides.filter((ride) => !ride.driver).length };
  });
  const calendarMax = Math.max(1, ...calendarDays.map((day) => day.total));
  const rideRows = rideTab === "upcoming" ? upcoming : past;

  return (
    <div className="dash" data-testid="dashboard">
      <div className="dash-head">
        <div>
          <h2>Dashboard</h2>
          <p>
            <Flag id={country} /> {market.name} · {scope.zones.length ? `${scope.zones.length} zone${scope.zones.length > 1 ? "s" : ""}` : "All zones"} · {span.label} · Updated {timeFormat.format(now)}
          </p>
        </div>
        <div className="dash-head-actions">
          <PeriodPicker key={periodKey} period={period} today={localDay(now, market.timeZone)} onChange={setPeriod} />
          <button data-command="admin.ui.refresh" type="button" className="dash-btn ghost icon" aria-label="Refresh" onClick={() => void client.invalidateQueries()}><RefreshCw size={16} aria-hidden="true" /></button>
        </div>
      </div>

      {failed?.error ? <p role="alert" className="dash-error">{failed.error.message}</p> : null}

      {alerts.length ? (
        <div className="alert-strip" role="region" aria-label="Urgent">
          {alerts.map((alert) => (
            <Link key={alert.id} to={withScope(alert.path)} className={`alert-pill ${alert.tone}`}>
              {alert.icon}<strong>{alert.count}</strong> {alert.text}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="quick-actions" role="toolbar" aria-label="Quick actions">
        {mainActions.map((action) => action.path ? (
          <Link key={action.id} className="quick-action" to={withScope(action.path)}>{action.icon}{action.label}</Link>
        ) : (
          <button data-command="admin.ui.quickAction" key={action.id} type="button" className="quick-action" onClick={action.onRun}>{action.icon}{action.label}</button>
        ))}
        {moreActions.length ? (
          <div className="more-wrap" ref={moreRef}>
            <button data-command="admin.ui.quickAction" type="button" className="quick-action" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>More <ChevronDown size={14} aria-hidden="true" /></button>
            {moreOpen ? (
              <div className="more-menu">
                {moreActions.map((action) => action.path ? (
                  <Link key={action.id} to={withScope(action.path)} onClick={() => setMoreOpen(false)}>{action.icon}{action.label}</Link>
                ) : (
                  <button data-command="admin.ui.quickAction" key={action.id} type="button" onClick={() => { setMoreOpen(false); action.onRun?.(); }}>{action.icon}{action.label}</button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="earnings-card" aria-labelledby="earnings-title">
        <div className="earnings-main">
          <div className="earnings-top">
            <div>
              <h3 id="earnings-title">Gross bookings</h3>
              <div className="hero-number" data-testid="gross-bookings">{money(totals.grossMinor)}</div>
              <div className="hero-sub"><Delta value={change(totals.grossMinor, previous.grossMinor)} label={span.compareLabel} /> <span>{span.compareLabel}</span></div>
            </div>
            <span className="currency-badge">{market.currency}</span>
          </div>
          <EarningsChart points={report.series} format={money} formatAxis={compact} compareLabel={span.compareLabel} />
        </div>
        <dl className="earnings-side">
          <div className="side-row accent">
            <dt>Movera earnings <small>Commission {Math.round(COMMISSION_PLACEHOLDER * 100)}% · placeholder</small></dt>
            <dd>{money(totals.commissionMinor)} <Delta value={change(totals.commissionMinor, previous.commissionMinor)} label={span.compareLabel} /></dd>
          </div>
          <div className="side-row"><dt>Driver earnings</dt><dd>{money(totals.driverMinor)} <Delta value={change(totals.driverMinor, previous.driverMinor)} label={span.compareLabel} /></dd></div>
          <div className="side-row"><dt>Tips</dt><dd>{money(totals.tipsMinor)} <Delta value={change(totals.tipsMinor, previous.tipsMinor)} label={span.compareLabel} /></dd></div>
          <div className="side-row"><dt>Refunds &amp; vouchers</dt><dd>−{money(totals.refundsMinor)} <Delta value={change(totals.refundsMinor, previous.refundsMinor)} inverse label={span.compareLabel} /></dd></div>
          <div className="side-row strong"><dt>Net revenue</dt><dd>{money(totals.netMinor)} <Delta value={change(totals.netMinor, previous.netMinor)} label={span.compareLabel} /></dd></div>
          <div className="side-row"><dt>Average fare</dt><dd>{money(avgFare)} <Delta value={change(avgFare, prevAvgFare)} label={span.compareLabel} /></dd></div>
        </dl>
      </section>

      <section className="kpi-grid" aria-label="Key numbers">
        <Kpi icon={<TrendingUp size={18} />} tone="blue" label="Completed trips" value={number.format(totals.trips)} delta={<Delta value={change(totals.trips, previous.trips)} label={span.compareLabel} />} />
        <Kpi icon={<Car size={18} />} tone="green" label="Drivers online now" value={loading ? "…" : number.format(live.length - liveCounts.stale)} hint={`${liveCounts.free} free · ${liveCounts.trip + liveCounts.pickup} busy`} />
        <Kpi icon={<XCircle size={18} />} tone="red" label="Cancellation rate" value={`${cancelRate.toFixed(1)}%`} delta={<Delta value={change(cancelRate, prevCancelRate)} inverse label={span.compareLabel} />} />
        <Kpi icon={<Clock size={18} />} tone="amber" label="Avg pickup wait" value={`${avgWait.toFixed(1)} min`} delta={<Delta value={change(avgWait, prevWait)} inverse label={span.compareLabel} />} />
        <Kpi icon={<Users size={18} />} tone="violet" label="New riders" value={number.format(totals.newRiders)} delta={<Delta value={change(totals.newRiders, previous.newRiders)} label={span.compareLabel} />} />
        <Kpi icon={<UserPlus size={18} />} tone="aqua" label="New drivers" value={number.format(totals.newDrivers)} delta={<Delta value={change(totals.newDrivers, previous.newDrivers)} label={span.compareLabel} />} />
      </section>

      <div className="dash-row">
        <section className="dash-card map-card" aria-labelledby="map-title">
          <div className="card-head">
            <h3 id="map-title"><span className="live-dot" aria-hidden="true" /> Live drivers</h3>
            {can(role, "trips.read") ? <Link className="link-action" to={withScope("/live")}>Open full live map →</Link> : null}
          </div>
          <div className="state-filters" role="group" aria-label="Show drivers">
            {LIVE_STATES.map((state) => {
              const off = hidden.has(state.id);
              return (
                <button data-command="admin.ui.mapLayer"
                  key={state.id}
                  type="button"
                  aria-pressed={!off}
                  className={off ? "state-chip off" : "state-chip"}
                  onClick={() => setHidden((current) => {
                    const next = new Set(current);
                    if (next.has(state.id)) next.delete(state.id);
                    else next.add(state.id);
                    return next;
                  })}
                >
                  <i style={{ background: STATE_COLOR[state.id] }} />{state.label}<strong>{liveCounts[state.id]}</strong>
                </button>
              );
            })}
          </div>
          <DriversMap drivers={live} market={market} zones={scope.zones} hidden={hidden} withScope={withScope} />
          <p className="fine-print">{api.demo ? "Simulated positions from demo data. " : ""}Refreshes every 5 seconds.</p>
        </section>

        <section className="dash-card queues-card" aria-labelledby="queues-title">
          <div className="card-head"><h3 id="queues-title">Work queues</h3></div>
          <ul className="queue-list">
            {queues.map((queue) => (
              <li key={queue.label}>
                <Link to={withScope(queue.path)} className={`queue tone-${queue.tone}`}>
                  <span className="queue-icon" aria-hidden="true">{queue.icon}</span>
                  <span className="queue-label">{queue.label}</span>
                  <strong>{loading ? "…" : queue.count}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="dash-row">
        <section className="dash-card rides-card" aria-labelledby="rides-title">
          <div className="card-head">
            <h3 id="rides-title">Scheduled rides</h3>
            {can(role, "trips.read") ? <Link className="link-action" to={withScope("/reservations")}>See all →</Link> : null}
          </div>
          <div className="ride-counters">
            <span><strong>{counts.upcoming}</strong> Upcoming</span>
            <span className={counts.unassigned ? "warn" : undefined}><strong>{counts.unassigned}</strong> Unassigned</span>
            <span><strong>{counts.assigned}</strong> Assigned</span>
            <span><strong>{counts.completed}</strong> Completed</span>
            <span><strong>{counts.cancelled}</strong> Cancelled</span>
          </div>
          <div className="tabs-row" role="tablist" aria-label="Scheduled rides">
            {(["upcoming", "past", "calendar"] as const).map((tab) => (
              <button data-command="admin.ui.dashboardTab" key={tab} type="button" role="tab" aria-selected={rideTab === tab} className={rideTab === tab ? "active" : undefined} onClick={() => setRideTab(tab)}>
                {tab === "upcoming" ? "Upcoming · next 7 days" : tab === "past" ? `Past · ${span.label}` : "Calendar"}
              </button>
            ))}
          </div>
          {rideTab === "calendar" ? (
            <div className="ride-calendar">
              {calendarDays.map((day) => (
                <div key={day.key} className="cal-day">
                  <span className="cal-name">{dayFormat.format(day.start + 3_600_000)}</span>
                  <div className="cal-bar"><i style={{ height: `${(day.total / calendarMax) * 100}%` }} /></div>
                  <strong>{day.total}</strong>
                  <small className={day.open ? "warn" : undefined}>{day.open ? `${day.open} without driver` : "All assigned"}</small>
                </div>
              ))}
            </div>
          ) : (
            <RideTable rides={rideRows} now={now} upcoming={rideTab === "upcoming"} timeFormat={timeFormat} dayFormat={dayFormat} money={money} withScope={withScope} />
          )}
        </section>

        <section className="dash-card shares-card" aria-labelledby="shares-title">
          <div className="card-head"><h3 id="shares-title">Where the money comes from</h3></div>
          <div className="tabs-row" role="tablist" aria-label="Breakdown">
            {(["zone", "category", "method"] as const).map((tab) => (
              <button data-command="admin.ui.dashboardTab" key={tab} type="button" role="tab" aria-selected={shareTab === tab} className={shareTab === tab ? "active" : undefined} onClick={() => setShareTab(tab)}>
                {tab === "zone" ? "Zones" : tab === "category" ? "Categories" : "Payment"}
              </button>
            ))}
          </div>
          {totals.grossMinor ? <ShareBars rows={shares} format={compact} /> : <p className="state-line">No earnings in this period yet.</p>}
        </section>
      </div>
    </div>
  );
}

function periodKeyToSearch(key: string): string {
  const [kind, on, from, to] = key.split("|");
  const search = new URLSearchParams({ period: kind });
  if (on) search.set("on", on);
  if (from) search.set("from", from);
  if (to) search.set("to", to);
  return search.toString();
}
