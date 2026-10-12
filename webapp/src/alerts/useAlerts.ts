import { useEffect, useMemo, useState } from "react";
import { useApprovals, useRecords, useSlice } from "../api/hooks";
import { useAdminApi } from "../api/AdminApiContext";
import { emptySafety, type SafetyBook } from "../safety/ops";
import { useSession } from "../auth/SessionContext";
import { can } from "../auth/permissions";
import { liveDrivers } from "../dashboard/live";
import { rideRequests } from "../dashboard/riders";
import { demoShift } from "../dashboard/scheduled";
import { driverFacts } from "../dispatch/demo";
import { DISPATCH_KEY, emptyDispatchBook, liveRules, normalizeDispatchBook, type DispatchBook } from "../dispatch/rules";
import { DRIVER_DOCUMENTS } from "../drivers/gate";
import { driverOps, emptyDriverOpsBook, type DriverOpsBook } from "../drivers/ops";
import { daysUntil, DRIVER_DOC_LABELS } from "../fleet/documents";
import { zoneAllowed } from "../markets/scope";
import { useMarketScope } from "../markets/useMarketScope";
import { failureCause, failureHandled } from "../payments/failures";
import { useRidersData } from "../riders/useRidersData";
import { ALERTS_KEY, computeAlerts, emptyAlertBook, normalizeAlertBook, openAlerts, visibleTo, type AlertBook, type Facts, type OpenAlert } from "./engine";

const SYMBOL = { SE: "kr", FR: "€", TN: "DT" } as const;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

/**
 * Every alert for the chosen country and zones, worked out once from the panel's data and shared by
 * the bell, the Alerts section, the Dashboard strip and Dispatch → Live, so the numbers always match.
 */
export function useAlerts() {
  const api = useAdminApi();
  const { agent } = useSession();
  const scope = useMarketScope();
  const market = scope.market;
  const slice = useSlice<AlertBook>(ALERTS_KEY, emptyAlertBook());
  const book = useMemo(() => normalizeAlertBook(slice.value), [slice.value]);
  // Only read what the role may read: a refused read is retried and slows every save.
  const canSafety = Boolean(agent && can(agent.role, "incidents.read"));
  const safety = useSlice<SafetyBook>("safetyOps", emptySafety(), { enabled: canSafety });
  const dispatchSlice = useSlice<DispatchBook>(DISPATCH_KEY, emptyDispatchBook());
  const dispatchBook = useMemo(() => normalizeDispatchBook(dispatchSlice.value), [dispatchSlice.value]);
  const driverStore = useSlice<DriverOpsBook>("driverOps", emptyDriverOpsBook());
  const drivers = useRecords("drivers", undefined, { refetchMs: 15_000 });
  const trips = useRecords("trips", undefined, { refetchMs: 15_000 });
  const incidents = useRecords("incidents", undefined, { refetchMs: 10_000 });
  const reservations = useRecords("reservations", undefined, { refetchMs: 30_000 });
  const payments = useRecords("payments", undefined, { refetchMs: 30_000 });
  const payouts = useRecords("payouts");
  const vehicles = useRecords("vehicles");
  const tickets = useRecords("tickets", undefined, { refetchMs: 30_000 });
  const approvals = useApprovals(30_000);
  const riders = useRidersData("month");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 30_000) * 30_000);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 30_000) * 30_000), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const access = agent?.scope ?? { zones: "all" as const };
  const zones = useMemo(() => market.zones.filter((zone) => zoneAllowed(access, zone.id) && (!scope.zones.length || scope.zones.includes(zone.id))), [market, access, scope.zones]);
  const money = (major: number) => `${new Intl.NumberFormat(market.locale, { maximumFractionDigits: 2 }).format(major)} ${SYMBOL[market.id]}`;

  const facts = useMemo((): Facts => {
    const live = liveDrivers(drivers.data ?? [], vehicles.data ?? [], trips.data ?? [], incidents.data ?? [], 0);
    const online = new Set(live.map((driver) => driver.id));
    const requests = rideRequests(trips.data ?? [], [], (id) => online.has(id));
    const freeByZone: Record<string, number> = {};
    for (const driver of live) if (driver.state === "free") freeByZone[driver.zoneId] = (freeByZone[driver.zoneId] ?? 0) + 1;
    const opsOf = (row: { id: string; name: string; fleetId?: string | null; status: string; kind?: string }) => driverOps(driverStore.value, { id: row.id, name: row.name, fleetId: row.fleetId ?? null, status: row.status, kind: row.kind });
    const activeDrivers = (drivers.data ?? []).filter((row) => row.status === "active");
    const shift = demoShift(now, api.demo);
    const day = new Date(now).toISOString().slice(0, 10);
    const hour = Math.floor(now / 3_600_000);
    return {
      now,
      day,
      zones: zones.map((zone) => ({ id: zone.id, name: zone.name })),
      incidents: (incidents.data ?? []).map((row) => {
        const record = safety.value.incidents[row.id];
        return { id: row.id, zoneId: row.zoneId, who: row.name, status: row.status, owner: record?.owner ?? null, takenAt: record?.events.find((event) => event.kind === "take")?.at ?? null, createdAt: row.createdAt ?? null };
      }),
      requests: requests.map((request) => ({ tripId: request.tripId, rider: request.rider, zoneId: request.zoneId, waitingMin: request.waitingMin, searching: request.status === "searching" })),
      freeByZone,
      dispatch: (zoneId) => {
        const alerts = liveRules(dispatchBook, zoneId).alerts;
        const pick = (id: "long_wait" | "few_drivers" | "no_driver") => {
          const item = alerts.find((entry) => entry.id === id);
          return { on: Boolean(item?.on), limit: item?.limit ?? 5 };
        };
        return { long_wait: pick("long_wait"), few_drivers: pick("few_drivers"), no_driver: pick("no_driver") };
      },
      lateRides: (reservations.data ?? [])
        .filter((row) => row.pickupAt && (row.status === "waiting" || row.status === "booked") && !row.driverId)
        .map((row) => ({ id: row.id, rider: row.name, zoneId: row.zoneId, minutesLeft: Math.round((Date.parse(row.pickupAt!) + shift - now) / 60_000) }))
        .filter((row) => row.minutesLeft >= 0 && row.minutesLeft <= 180),
      documents: activeDrivers.flatMap((row) => {
        const ops = opsOf(row);
        return DRIVER_DOCUMENTS.filter((id) => !(row.fleetId && id === "company_registration")).flatMap((id) => {
          const doc = ops.documents[id];
          const days = doc ? daysUntil(doc.expiresAt, now) : null;
          return days === null ? [] : [{ driverId: row.id, driver: row.name, zoneId: row.zoneId, doc: DRIVER_DOC_LABELS[id] ?? id, days }];
        });
      }),
      ratings: activeDrivers.map((row) => ({ driverId: row.id, driver: row.name, zoneId: row.zoneId, rating: opsOf(row).ratings.stars })),
      offline: driverFacts(live, () => ({ rating: 4.7, acceptancePct: 80, cancelPct: 5, categories: [] }), null)
        .filter((row) => liveRules(dispatchBook, row.zoneId).autoOffline.on && row.noInRow >= liveRules(dispatchBook, row.zoneId).autoOffline.after)
        .map((row) => ({ driverId: row.id, driver: row.name, zoneId: row.zoneId, count: row.noInRow })),
      payments: (payments.data ?? [])
        .filter((row) => row.status === "failed" && !failureHandled(row))
        .map((row) => {
          const cause = failureCause(row);
          return { id: row.id, zoneId: row.zoneId, rider: row.name, amount: (row.fareOre ?? 0) / market.minorUnits, system: cause.kind === "system", reason: cause.reason };
        }),
      refunds: (approvals.data ?? []).filter((row) => row.status === "pending" && row.action.includes("refund")).map((row) => ({ id: row.id, title: `Refund ${row.targetId} waits for approval` })),
      payouts: (payouts.data ?? []).filter((row) => row.status === "scheduled").map((row) => ({ id: row.id, driver: (drivers.data ?? []).find((item) => item.id === row.driverId)?.name ?? row.name, zoneId: row.zoneId, amount: (row.fareOre ?? 0) / market.minorUnits })),
      riders: riders.rows.filter((row) => row.profile.country === market.id).map((row) => ({ id: row.rider.id, name: row.rider.name, flags: row.profile.fraudFlags, cancelRate: row.profile.cancelRate, rides: row.profile.completed + row.profile.cancelled + row.profile.noShows })),
      tickets: (tickets.data ?? []).filter((row) => row.status === "open").map((row) => ({ id: row.id, name: row.name, zoneId: row.zoneId })),
      // Demo health: the map tiles are slow now and then; the backend reports real health later.
      system: [
        { id: "api", name: "Admin API", state: "ok", detail: "" },
        { id: "maps", name: "Map tiles", state: hash(`maps:${hour}`) % 4 === 0 ? "slow" : "ok", detail: "Answers take over 2 seconds" },
        { id: "payments", name: "Payment provider", state: hash(`pay:${hour}`) % 9 === 0 ? "slow" : "ok", detail: "Card payments take longer than usual" },
        { id: "push", name: "Driver app notifications", state: "ok", detail: "" },
      ],
      money,
    };
    // money depends only on the market, which is already a dependency.
  }, [now, zones, drivers.data, vehicles.data, trips.data, incidents.data, reservations.data, payments.data, payouts.data, tickets.data, approvals.data, riders.rows, safety.value, dispatchBook, driverStore.value, market, api.demo]);

  const all = useMemo(() => computeAlerts(facts, book.settings, book.rules.filter((rule) => rule.country === market.id)), [facts, book.settings, book.rules, market.id]);
  const sosOwner = (incidentId: string) => safety.value.incidents[incidentId]?.owner ?? null;
  const viewer = agent ? { id: agent.id, role: agent.role, can: (permission: string) => can(agent.role, permission) } : null;
  const open: OpenAlert[] = useMemo(() => openAlerts(all, book, now, (id) => safety.value.incidents[id]?.owner ?? null).filter((alert) => (viewer ? visibleTo(alert, book, viewer, now) : false)), [all, book, now, safety.value, viewer?.id, viewer?.role]);
  const active = open.filter((alert) => alert.status !== "snoozed" && !alert.muted);
  return {
    book,
    slice,
    safety,
    facts,
    all,
    open,
    active,
    zones,
    market,
    money,
    now,
    sosOwner,
    loading: slice.loading || incidents.isLoading || trips.isLoading,
    counts: {
      critical: active.filter((alert) => alert.level === "critical").length,
      important: active.filter((alert) => alert.level === "important").length,
      info: active.filter((alert) => alert.level === "info").length,
      mine: open.filter((alert) => alert.owner === agent?.id).length,
      notTaken: active.filter((alert) => alert.status === "new").length,
    },
  };
}
