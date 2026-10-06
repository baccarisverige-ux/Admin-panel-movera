import { TRIP_STATUSES } from "../domain/contract.ts";

export const PLATE = "ABC 123";
export const TRIP_ID = "T0001";
export const PHONE = "+46 70 100 00 01";

const FIRST = ["Erik", "Sara", "Noah", "Maja", "Lars", "Ingrid", "Oscar", "Linnea", "Axel", "Freja", "Hugo", "Alva", "Lukas", "Ella", "Nils", "Astrid"];
const LAST = ["Lind", "Berg", "Ek", "Holm", "Söder", "Nyström", "Dahl", "Blom", "Wallin", "Sand", "Fors", "Lund"];
const STATUSES = ["pending", "active", "on_hold", "suspended"] as const;
const DOC_STATES = ["needed", "in_review", "approved", "rejected", "expiring", "expired"] as const;

export type DemoRecord = {
  id: string;
  name: string;
  phone: string;
  zoneId: string;
  status: string;
  plate?: string;
  tripId?: string;
  driverId?: string | null;
  fareOre?: number;
  kind?: string;
};

export type AuditRow = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  targetId: string;
  before: string;
  after: string;
  reason: string;
  result: string;
};

export type InboxItem = { id: string; title: string; path: string };

export type DemoDb = {
  rev: number;
  updatedAt: string;
  zones: { id: string; name: string }[];
  drivers: DemoRecord[];
  riders: DemoRecord[];
  vehicles: DemoRecord[];
  fleets: DemoRecord[];
  trips: DemoRecord[];
  reservations: DemoRecord[];
  tickets: DemoRecord[];
  incidents: DemoRecord[];
  payments: DemoRecord[];
  refunds: DemoRecord[];
  payouts: DemoRecord[];
  wallet: DemoRecord[];
  templates: DemoRecord[];
  banners: DemoRecord[];
  events: DemoRecord[];
  bonuses: DemoRecord[];
  staff: DemoRecord[];
  audits: AuditRow[];
  inbox: InboxItem[];
  slices: Record<string, unknown>;
};

export const ZONES = [
  ["Z001", "Norrmalm"],
  ["Z002", "Södermalm"],
  ["Z003", "Östermalm"],
  ["Z004", "Kungsholmen"],
  ["Z005", "Vasastan"],
  ["Z006", "Bromma"],
  ["Z007", "Solna"],
  ["Z008", "Kista"],
  ["Z009", "Södertälje"],
  ["ARN", "Arlanda"],
  ["BMA", "Bromma airport"],
] as const;

function mix(index: number): number {
  let value = (index + 1) * 1103515245 + 12345;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value >>> 0) % 1000;
}

function person(index: number): string {
  return `${FIRST[index % FIRST.length]} ${LAST[mix(index) % LAST.length]}`;
}

function phone(index: number): string {
  if (index === 0) return PHONE;
  const body = String(1000001 + index).padStart(7, "0");
  return `+46 70 ${body.slice(0, 3)} ${body.slice(3, 5)} ${body.slice(5)}`;
}

export function createSeed(now = "2026-10-05T16:00:00.000Z"): DemoDb {
  const zones = ZONES.map(([id, name]) => ({ id, name }));
  const zoneId = (index: number) => zones[index % 9].id;
  const drivers = Array.from({ length: 60 }, (_, index) => ({
    id: `D${String(index + 1).padStart(4, "0")}`,
    name: person(index),
    phone: phone(index + 20),
    zoneId: zoneId(index),
    status: STATUSES[index % STATUSES.length],
    kind: DOC_STATES[index % DOC_STATES.length],
  }));
  const vehicles = Array.from({ length: 45 }, (_, index) => ({
    id: `V${String(index + 1).padStart(4, "0")}`,
    name: drivers[index % drivers.length].name,
    phone: "",
    zoneId: zoneId(index),
    status: index % 7 === 0 ? "ineligible" : "eligible",
    plate: index === 0 ? PLATE : `MVR ${String(100 + index)}`,
    driverId: drivers[index % drivers.length].id,
  }));
  const riders = Array.from({ length: 250 }, (_, index) => ({
    id: `R${String(index + 1).padStart(4, "0")}`,
    name: person(index + 3),
    phone: phone(index),
    zoneId: zoneId(index),
    status: index % 17 === 0 ? "blocked" : "active",
    tripId: `T${String((index % 600) + 1).padStart(4, "0")}`,
  }));
  const trips = Array.from({ length: 600 }, (_, index) => ({
    id: `T${String(index + 1).padStart(4, "0")}`,
    name: riders[index % riders.length].name,
    phone: riders[index % riders.length].phone,
    zoneId: zoneId(index),
    status: TRIP_STATUSES[index % TRIP_STATUSES.length],
    driverId: index % 4 === 0 ? null : drivers[index % drivers.length].id,
    fareOre: 4900 + (index % 40) * 100,
  }));
  const reservations = Array.from({ length: 40 }, (_, index) => ({
    id: `B${String(index + 1).padStart(3, "0")}`,
    name: riders[index].name,
    phone: riders[index].phone,
    zoneId: zoneId(index),
    status: index % 5 === 0 ? "waiting" : "assigned",
    driverId: index % 5 === 0 ? null : drivers[index % drivers.length].id,
  }));
  const tickets = Array.from({ length: 35 }, (_, index) => ({
    id: `S${String(index + 1).padStart(3, "0")}`,
    name: riders[index].name,
    phone: riders[index].phone,
    zoneId: zoneId(index),
    status: index % 3 === 0 ? "open" : "claimed",
  }));
  const incidents = Array.from({ length: 6 }, (_, index) => ({
    id: `INC-${index + 1}`,
    name: riders[index].name,
    phone: riders[index].phone,
    zoneId: zoneId(index),
    status: index === 0 ? "queued" : "closed",
  }));
  const payments = Array.from({ length: 300 }, (_, index) => ({
    id: `PAY${String(index + 1).padStart(4, "0")}`,
    name: "Card",
    phone: "",
    zoneId: zoneId(index),
    status: index % 8 === 0 ? "failed" : "captured",
    fareOre: 10000 + index * 10,
  }));
  const refunds = Array.from({ length: 20 }, (_, index) => ({
    id: `RF${String(index + 1).padStart(3, "0")}`,
    name: payments[index].id,
    phone: "",
    zoneId: payments[index].zoneId,
    status: "refunded",
    fareOre: 5000,
  }));
  const payouts = Array.from({ length: 8 }, (_, index) => ({
    id: `PO${index + 1}`,
    name: `Week ${index + 1}`,
    phone: "",
    zoneId: "Z001",
    status: "scheduled",
    driverId: drivers[index].id,
    fareOre: 125000,
  }));
  const wallet = Array.from({ length: 30 }, (_, index) => ({
    id: `W${index + 1}`,
    name: riders[index].name,
    phone: riders[index].phone,
    zoneId: riders[index].zoneId,
    status: "posted",
    fareOre: 10000,
    driverId: riders[index].id,
  }));
  const templates = Array.from({ length: 19 }, (_, index) => ({
    id: `TPL${index + 1}`,
    name: `Island ${index + 1}`,
    phone: "",
    zoneId: "Z001",
    status: "draft",
  }));
  const banners = Array.from({ length: 6 }, (_, index) => ({
    id: `BN${index + 1}`,
    name: `Rider home ${index + 1}`,
    phone: "",
    zoneId: "Z001",
    status: "draft",
  }));
  const events = ["Summer", "Nobel", "Marathon", "Midsummer"].map((name, index) => ({
    id: `EV${index + 1}`,
    name,
    phone: "",
    zoneId: zoneId(index),
    status: "draft",
  }));
  const bonuses = [
    ["ARN120", "Airport 120"],
    ["EVE60", "Evening 60"],
    ["PEAK80", "Peak 80"],
  ].map(([id, name]) => ({ id, name, phone: "", zoneId: "ARN", status: "active" }));
  const roles = ["super", "ops", "support", "safety", "finance"];
  const staff = Array.from({ length: 12 }, (_, index) => ({
    id: `A${index + 1}`,
    name: person(index + 8),
    phone: phone(index + 400),
    zoneId: "Z001",
    status: roles[index % roles.length],
  }));
  const fleets = ["North fleet", "South fleet", "Airport fleet"].map((name, index) => ({
    id: `F${index + 1}`,
    name,
    phone: "",
    zoneId: zones[index].id,
    status: "active",
  }));
  return {
    rev: 1,
    updatedAt: now,
    zones,
    drivers,
    riders,
    vehicles,
    fleets,
    trips,
    reservations,
    tickets,
    incidents,
    payments,
    refunds,
    payouts,
    wallet,
    templates,
    banners,
    events,
    bonuses,
    staff,
    audits: [],
    inbox: [
      { id: "in-1", title: `${drivers[4].name} has an expiring document`, path: `/drivers/${drivers[4].id}` },
      { id: "in-2", title: `${reservations[0].id} has no driver`, path: `/reservations/${reservations[0].id}` },
    ],
    slices: {},
  };
}

export type ZoneScope = string | readonly string[] | null;

export function inScope<T extends { zoneId: string }>(rows: T[], scope: ZoneScope): T[] {
  if (!scope) return rows;
  if (Array.isArray(scope)) {
    const allowed = new Set(scope);
    return rows.filter((row) => allowed.has(row.zoneId));
  }
  return rows.filter((row) => row.zoneId === scope);
}

export function searchDb(db: DemoDb, query: string, scope: ZoneScope = null): { kind: string; id: string; label: string; path: string }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: { kind: string; id: string; label: string; path: string }[] = [];
  const consider = (kind: string, row: DemoRecord, path: string) => {
    const hay = `${row.id} ${row.name} ${row.phone} ${row.plate ?? ""} ${row.tripId ?? ""}`.toLowerCase();
    if (hay.includes(needle)) hits.push({ kind, id: row.id, label: `${row.name || row.plate || row.id}`, path });
  };
  for (const row of inScope(db.drivers, scope)) consider("driver", row, `/drivers/${row.id}`);
  for (const row of inScope(db.riders, scope)) consider("rider", row, `/riders/${row.id}`);
  for (const row of inScope(db.trips, scope)) consider("trip", row, `/trips/${row.id}`);
  for (const row of inScope(db.vehicles, scope)) consider("vehicle", row, `/vehicles/${row.id}`);
  for (const row of inScope(db.reservations, scope)) consider("reservation", row, `/reservations/${row.id}`);
  for (const row of inScope(db.tickets, scope)) consider("ticket", row, `/tickets/${row.id}`);
  return hits.slice(0, 8);
}
