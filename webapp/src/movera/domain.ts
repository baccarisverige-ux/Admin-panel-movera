export const DEMO_NOW = "2026-10-05T08:30:00.000+02:00";
export const DEMO_PASSWORD = "demo";

export const ZONES = [
  { id: "norrmalm", name: "Norrmalm", airport: false },
  { id: "sodermalm", name: "Södermalm", airport: false },
  { id: "ostermalm", name: "Östermalm", airport: false },
  { id: "kungsholmen", name: "Kungsholmen", airport: false },
  { id: "vasastan", name: "Vasastan", airport: false },
  { id: "bromma", name: "Bromma", airport: false },
  { id: "solna", name: "Solna", airport: false },
  { id: "kista", name: "Kista", airport: false },
  { id: "sodertalje", name: "Södertälje", airport: false },
  { id: "arlanda", name: "Arlanda (ARN)", airport: true },
  { id: "bma", name: "Bromma Airport (BMA)", airport: true },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];

export const CATEGORIES = [
  { id: "economy", name: "Movera", line: "Standard • Everyday ride", seats: 4 },
  { id: "comfort", name: "Comfort", line: "Extra comfort • Plush", seats: 4 },
  { id: "premium", name: "Premium", line: "Luxury • Premium service", seats: 4 },
  { id: "priority", name: "Priority", line: "Faster pickup • Priority", seats: 4 },
  { id: "xl", name: "Movera XL", line: "Extra space • Groups", seats: 6 },
  { id: "electric", name: "Electric", line: "Low emissions • Eco", seats: 4 },
  { id: "pet", name: "Movera Pet", line: "Pet friendly • Carrier OK", seats: 4 },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const RIDE_OPTIONS = [
  { id: "baby", name: "Baby seat" },
  { id: "child", name: "Child seat" },
  { id: "booster", name: "Booster seat" },
  { id: "bags", name: "Extra bags" },
  { id: "pet", name: "Pet" },
] as const;

export type RideOptionId = (typeof RIDE_OPTIONS)[number]["id"];

export const PAYMENTS = [
  { id: "card", name: "Card" },
  { id: "swish", name: "Swish" },
  { id: "klarna", name: "Klarna" },
  { id: "apple", name: "Apple Pay" },
  { id: "google", name: "Google Pay" },
  { id: "paypal", name: "PayPal" },
  { id: "cash", name: "Cash" },
  { id: "wallet", name: "Movera Wallet" },
] as const;

export type PaymentId = (typeof PAYMENTS)[number]["id"];

export const DOC_DEFS = [
  { key: "terms", section: "Driver", name: "Terms and Conditions" },
  { key: "info_session", section: "Driver", name: "Virtual information session" },
  { key: "license", section: "Driver", name: "Driver’s license" },
  { key: "photo", section: "Driver", name: "Profile photo" },
  { key: "company", section: "Driver", name: "Company registration", note: "Bolagsverket or Skatteverket extract. Not needed with a Fleet Partner." },
  { key: "taxi_license", section: "Driver", name: "Taxi driver license" },
  { key: "taxi_permit", section: "Driver", name: "Taxi traffic permit" },
  { key: "tax", section: "Driver", name: "Tax settings" },
  { key: "bank_statement", section: "Driver", name: "Bank statement" },
  { key: "registration", section: "Vehicle", name: "Registration certificate", note: "Front page" },
  { key: "insurance", section: "Vehicle", name: "Insurance letter" },
] as const;

export type DocKey = (typeof DOC_DEFS)[number]["key"];

export const REJECT_REASONS = [
  "Blurry or unreadable",
  "Wrong document",
  "Expired",
  "Name does not match",
  "Cropped or incomplete",
  "Other",
] as const;

export const TRIP_STATUSES = [
  "draft",
  "quoted",
  "requested",
  "searching",
  "offered",
  "accepted",
  "driver_to_pickup",
  "arrived",
  "rider_onboard",
  "in_trip",
  "approaching_dropoff",
  "completed",
  "cancelled_by_rider",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "no_show",
  "expired",
  "failed",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export const HAPPY_PATH: TripStatus[] = [
  "requested",
  "searching",
  "offered",
  "accepted",
  "driver_to_pickup",
  "arrived",
  "rider_onboard",
  "in_trip",
  "approaching_dropoff",
  "completed",
];

export const ACTIVE_TRIP: TripStatus[] = [
  "driver_to_pickup",
  "arrived",
  "rider_onboard",
  "in_trip",
  "approaching_dropoff",
];

export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";
export type RatingStatus = "pending" | "submitted" | "skipped";
export type AccountStatus = "pending" | "active" | "on_hold" | "suspended";
export type DriverOnlineStatus = "offline" | "going_online" | "online" | "on_trip" | "suspended";
export type DocStatus = "needed" | "in_review" | "approved" | "rejected" | "expiring" | "expired" | "not_required";

export const CANCEL_REASONS = {
  driverBefore: [
    ["rider_requested_cancel", "Rider asked to cancel"],
    ["rider_not_at_pickup", "Rider not at pickup"],
    ["unsafe_pickup", "Pickup unsafe"],
    ["vehicle_issue_before_start", "Vehicle problem"],
    ["driver_emergency_before_start", "Personal emergency"],
    ["other_before_start", "Other reason"],
    ["rider_no_show", "Rider did not arrive (after 5 min)"],
  ],
  driverDuring: [
    ["rider_requested_early_end", "Rider asked to end the trip"],
    ["safety_concern_on_trip", "Safety concern"],
    ["vehicle_issue_on_trip", "Vehicle problem"],
    ["accident_or_road_emergency", "Accident or road emergency"],
    ["rider_behavior", "Rider behavior"],
    ["trip_or_destination_issue", "Trip or destination issue"],
    ["other_on_trip", "Other reason"],
  ],
  riderFinding: [
    ["wait_too_long", "Wait too long"],
    ["plans_changed", "Plans changed"],
    ["requested_by_mistake", "Requested by mistake"],
    ["wrong_ride_option", "Wrong ride option"],
    ["pickup_incorrect", "Pickup incorrect"],
    ["destination_change", "Destination change"],
    ["driver_not_suitable", "Driver not suitable"],
    ["something_else", "Something else"],
  ],
} as const;

export type CancelCode =
  | (typeof CANCEL_REASONS.driverBefore)[number][0]
  | (typeof CANCEL_REASONS.driverDuring)[number][0]
  | (typeof CANCEL_REASONS.riderFinding)[number][0];

export const PERMISSIONS = [
  "drivers.view",
  "drivers.viewSensitive",
  "drivers.setStatus",
  "documents.review",
  "vehicles.review",
  "bank.review",
  "riders.view",
  "riders.block",
  "trips.view",
  "trips.cancel",
  "trips.reassign",
  "reservations.manage",
  "pricing.edit",
  "payouts.manage",
  "refunds.approve",
  "content.edit",
  "messages.send",
  "support.handle",
  "safety.respond",
  "settings.edit",
  "team.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  { id: "super", name: "Super admin" },
  { id: "ops", name: "Operations manager" },
  { id: "onboarding", name: "Onboarding agent" },
  { id: "support", name: "Support agent" },
  { id: "safety", name: "Safety agent" },
  { id: "finance", name: "Finance" },
  { id: "fleet", name: "Fleet partner" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export const DEFAULT_GRANTS: Record<RoleId, Permission[]> = {
  super: [...PERMISSIONS],
  ops: PERMISSIONS.filter((p) => p !== "team.manage"),
  onboarding: ["drivers.view", "documents.review", "vehicles.review", "messages.send"],
  support: ["drivers.view", "riders.view", "trips.view", "support.handle", "messages.send"],
  safety: ["drivers.view", "riders.view", "trips.view", "trips.cancel", "safety.respond"],
  finance: ["drivers.view", "payouts.manage", "refunds.approve", "bank.review"],
  fleet: ["drivers.view", "documents.review", "vehicles.review"],
};

export const ISLAND_TEMPLATES = [
  "New reservation",
  "Reservation accepted",
  "Reservation declined",
  "Rider cancelled",
  "Rider ended trip",
  "Trip matched",
  "Matching…",
  "Taken by another driver",
  "Trip not closed",
  "Radar online",
  "Radar offline",
  "No connection",
  "Contact support",
  "Tap to see earnings",
] as const;

export type Place = { label: string; address: string };

export type Agent = {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  zones: ZoneId[] | "all";
  fleetPartnerId?: string;
  presence: "online" | "away" | "off";
  title: string;
  lastActive: string;
};

export type BankAccount = {
  kind: "se" | "iban";
  clearing?: string;
  account?: string;
  iban?: string;
  bic?: string;
  bankName: string;
  status: "in_review" | "approved" | "rejected";
  rejectReason?: string;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personnummer: string;
  zoneId: ZoneId;
  accountStatus: AccountStatus;
  onlineStatus: DriverOnlineStatus;
  rating: number;
  acceptance: number;
  cancellation: number;
  fleetPartnerId: string | null;
  joined: string;
  assigneeId: string | null;
  categories: Record<CategoryId, boolean>;
  categoryReasons: Partial<Record<CategoryId, string>>;
  booster: boolean;
  boosterReason?: string;
  bank: BankAccount;
  hours: number[];
  emergencyName: string;
  emergencyPhone: string;
};

export type Document = {
  id: string;
  driverId: string;
  vehicleId?: string;
  key: DocKey;
  status: DocStatus;
  uploadedAt?: string;
  expiresAt?: string;
  reviewerId?: string;
  rejectReason?: string;
  message?: string;
};

export type Vehicle = {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  seats: number;
  status: "active" | "inactive" | "maintenance";
  fuel?: "petrol" | "diesel" | "hybrid" | "electric";
  paper?: "in_review" | "approved" | "rejected";
};

export type Rider = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  signIn: "phone" | "apple" | "google";
  status: "active" | "blocked";
  ratingGiven: number;
  trips: number;
  joined: string;
  zoneId: ZoneId;
  walletOre: number;
  pinOn: boolean;
  places: { name: string; address: string }[];
  blockReason?: string;
  privacy?: "none" | "requested" | "done";
  devicesSignedOut?: boolean;
};

export type Trip = {
  id: string;
  status: TripStatus;
  riderId: string;
  driverId: string | null;
  vehicleId: string | null;
  zoneId: ZoneId;
  category: CategoryId;
  paymentMethod: PaymentId;
  paymentStatus: PaymentStatus;
  ratingStatus: RatingStatus;
  rating?: number;
  pickup: Place;
  dropoff: Place;
  stops: Place[];
  km: number;
  minutes: number;
  pickupFee: number;
  distanceFee: number;
  timeFee: number;
  increase: number;
  boost: number;
  tip: number;
  commissionPct: number;
  createdAt: string;
  timeline: { status: TripStatus; at: string }[];
  cancelCode?: string;
  cancelledBy?: "rider" | "driver" | "admin";
  pinVerified: boolean;
  options: RideOptionId[];
  ruleVersion?: number;
  reviewHidden?: boolean;
  reviewNote?: string;
  driverRating?: number;
};

export type Reservation = {
  id: string;
  riderId: string;
  driverId: string | null;
  zoneId: ZoneId;
  category: CategoryId;
  pickupAt: string;
  pickup: Place;
  dropoff: Place;
  stops: Place[];
  price: number;
  previousPrice?: number;
  status: "waiting" | "assigned" | "completed" | "cancelled";
  offers: number;
  cancelReason?: string;
};

export type Ticket = {
  id: string;
  personType: "driver" | "rider";
  personId: string;
  tripId?: string;
  subject: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "waiting" | "solved";
  assigneeId: string | null;
  createdAt: string;
  messages: { from: "user" | "agent"; text: string; at: string; agentId?: string }[];
};

export type Incident = {
  id: string;
  tripId: string;
  kind: "sos" | "ridecheck" | "share";
  status: "open" | "handling" | "closed";
  assigneeId: string | null;
  createdAt: string;
  area: string;
  outcome?: string;
  actions: { at: string; agentId: string; action: string }[];
};

export type AdminEvent = {
  id: string;
  title: string;
  category: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  description: string;
  recommendedWindow: string;
  demandLabel: string;
  driverNote: string;
  imageCredit: string;
  enabled: boolean;
};

export type Bonus = {
  code: string;
  title: string;
  rule: string;
  rewardOre: number;
  zoneId: ZoneId | "all";
  enabled: boolean;
  start: string;
  end: string;
};

export type Promo = {
  code: string;
  title: string;
  offOre: number;
  zoneId: ZoneId | "all";
  perRider: number;
  budgetOre: number;
  used: number;
  enabled: boolean;
  until: string;
};

export type Article = {
  id: string;
  audience: "driver" | "rider";
  topic: string;
  title: string;
  body: string;
  published: boolean;
  order: number;
};

export type LegalDoc = {
  id: string;
  app: "driver" | "rider";
  kind: "terms" | "privacy";
  version: string;
  publishedAt: string;
  body: string;
};

export type Campaign = {
  id: string;
  type: "island" | "push" | "banner" | "sms";
  tone: "info" | "warning" | "action";
  title: string;
  body: string;
  target: string;
  sent: number;
  delivered: number;
  opened: number;
  at: string;
  phase?: "test" | "queued" | "sent" | "cancelled" | "failed";
  accepted?: number;
  failed?: number;
};

export type Payout = {
  id: string;
  driverId: string;
  period: string;
  gross: number;
  commission: number;
  bonuses: number;
  net: number;
  status: "pending" | "paid" | "failed";
};

export type RefundCase = {
  id: string;
  tripId: string;
  riderId: string;
  report: string;
  amount: number;
  status: "open" | "pending_approval" | "approved" | "rejected";
  reason?: string;
  firstAgentId?: string;
};

export type Note = {
  id: string;
  targetType: "driver" | "rider";
  targetId: string;
  authorId: string;
  text: string;
  at: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  agentId: string;
  action: string;
  target: string;
  reason?: string;
};

export type ZonePrice = {
  zoneId: ZoneId;
  category: CategoryId;
  pickup: number;
  perKm: number;
  perMin: number;
  minFare: number;
  maxFare: number;
  increaseMin: number;
  increaseMax: number;
  cancelFee: number;
};

export type AppVersion = {
  latest: string;
  minimum: string;
  title: string;
  message: string;
  actionLabel: string;
  dismissLabel: string;
  mandatory: boolean;
  updateUrl: string;
};

export type Settings = {
  orgName: string;
  currency: "SEK";
  timeZone: "Europe/Stockholm";
  sessionMinutes: number;
  twoStep: boolean;
  maxLoginAttempts: number;
  simulateErrors: boolean;
  dispatch: {
    offerSeconds: number;
    onTripOfferSeconds: number;
    radarPickSeconds: number;
    maxRadarOffers: number;
    searchKm: number;
    radarKm: number;
    approachMeters: number;
    arrivedMeters: number;
    freeWaitSeconds: number;
    quoteSeconds: number;
    noShowMinutes: number;
    destinationUses: number;
    airportQueue: boolean;
    airportZone: ZoneId;
  };
  dispatchByZone?: Partial<Record<ZoneId, Partial<Settings["dispatch"]>>>;
  reservations: {
    bookAheadDays: number;
    earliestAssignHours: number;
    waitingMinutes: number;
    freeCancelHours: number;
    cancelFeeOre: number;
    giveUpMinutes: number;
    noDriverText: string;
    termsText: string;
    policy: { title: string; en: string; sv: string }[];
  };
  safety: {
    pin: boolean;
    rideCheckStopMin: number;
    deviationM: number;
    shareTrip: boolean;
    trustedContacts: number;
    audio: boolean;
  };
  driving: {
    maxHoursDay: number;
    maxHoursWeek: number;
    breakAfterHours: number;
    warnMinutes: number;
    impossibleMps: number;
  };
  tips: number[];
  tipsEnabled: boolean;
  paymentMethods: Record<PaymentId, boolean>;
  performance: { showRating: boolean; showAcceptance: boolean; showCancellation: boolean };
  scheduledRow: { enabled: boolean; title: string; subtitle: string };
  signIn: { phone: boolean; apple: boolean; google: boolean };
  versions: Record<"driverIos" | "driverAndroid" | "riderIos" | "riderAndroid", AppVersion>;
  eventsTitle: string;
  eventsSubtitle: string;
  referral: { inviterOre: number; inviteeOre: number; condition: string };
};

export type FleetPartner = { id: string; name: string; orgNo: string; zoneId: ZoneId };

export type ConfigRelease = {
  id: string;
  version: number;
  status: "draft" | "pending_approval" | "scheduled" | "published" | "expired";
  at: string;
  authorId: string;
  approverId?: string;
  note?: string;
  publishAt?: string;
  summary: string;
  settings: Settings;
  prices: ZonePrice[];
};

export const POLICY_TEXTS: { title: string; en: string; sv: string }[] = [
  { title: "Reservation pricing", en: "The price is fixed when you book, from the zone price set at that moment.", sv: "Priset låses när du bokar, från zonens prislista just då." },
  { title: "When a driver may be assigned", en: "A driver can be assigned from 30 minutes before pickup.", sv: "En förare kan tilldelas från 30 minuter före upphämtning." },
  { title: "Included waiting time", en: "Waiting time included at pickup is 5 minutes.", sv: "Väntetid vid upphämtning ingår i 5 minuter." },
  { title: "Cancellation terms", en: "Free cancellation until 1 hour before pickup.", sv: "Gratis avbokning fram till 1 timme före upphämtning." },
  { title: "Cancellation fees", en: "After the free window a cancellation fee applies. No fee is published for on-demand rides.", sv: "Efter gratisperioden tas en avbokningsavgift ut. Ingen avgift är publicerad för direktresor." },
  { title: "Changes to pickup, time, or destination", en: "A change can reprice the ride. The previous price stays on the reservation.", sv: "En ändring kan ge ett nytt pris. Det tidigare priset ligger kvar på bokningen." },
  { title: "If a driver cannot be assigned", en: "If no driver is assigned, the reservation is cancelled and you are not charged.", sv: "Om ingen förare tilldelas avbokas resan och du debiteras inte." },
  { title: "Promotions", en: "A promo applies only inside its zone, limit and budget.", sv: "En kampanj gäller bara inom sin zon, gräns och budget." },
  { title: "Rider responsibilities", en: "Be at the pickup, follow the safety toolkit, and do not share your PIN.", sv: "Var på plats, följ säkerhetsverktygen och dela aldrig din PIN." },
];

export const ZONE_LAYOUT: Record<ZoneId, { x: number; y: number }> = {
  norrmalm: { x: 48, y: 48 },
  sodermalm: { x: 50, y: 62 },
  ostermalm: { x: 62, y: 42 },
  kungsholmen: { x: 36, y: 46 },
  vasastan: { x: 46, y: 34 },
  bromma: { x: 24, y: 40 },
  solna: { x: 40, y: 24 },
  kista: { x: 42, y: 12 },
  sodertalje: { x: 28, y: 82 },
  arlanda: { x: 70, y: 8 },
  bma: { x: 18, y: 32 },
};

export const REFUND_SECOND_PERSON_ORE = 20000;

export function vehicleIssue(vehicle: Vehicle, category: CategoryId): string | null {
  if (vehicle.year < 2016) return "Older than 2016.";
  if (category === "xl" && vehicle.seats < 6) return "XL needs 6 seats.";
  if (category === "electric" && vehicle.fuel && vehicle.fuel !== "electric") return "Electric only accepts an electric car.";
  if (vehicle.paper === "rejected") return "Vehicle papers were rejected.";
  return null;
}

export type DemoDb = {
  schema: 1;
  seq: number;
  rev: number;
  drivers: Driver[];
  documents: Document[];
  vehicles: Vehicle[];
  riders: Rider[];
  trips: Trip[];
  reservations: Reservation[];
  tickets: Ticket[];
  incidents: Incident[];
  events: AdminEvent[];
  bonuses: Bonus[];
  promos: Promo[];
  articles: Article[];
  legal: LegalDoc[];
  messages: Campaign[];
  payouts: Payout[];
  refunds: RefundCase[];
  notes: Note[];
  audit: AuditEntry[];
  agents: Agent[];
  roleGrants: Record<RoleId, Permission[]>;
  prices: ZonePrice[];
  categoriesOn: Record<CategoryId, ZoneId[]>;
  options: { id: RideOptionId; extraOre: number; categories: CategoryId[] }[];
  settings: Settings;
  partners: FleetPartner[];
  releases: ConfigRelease[];
  cancelLists: {
    driverBefore: { code: string; title: string; on: boolean; fault: boolean }[];
    driverDuring: { code: string; title: string; on: boolean; fault: boolean }[];
    riderFinding: { code: string; title: string; on: boolean; fault: boolean }[];
  };
};

export function zoneName(id: ZoneId): string {
  return ZONES.find((z) => z.id === id)?.name ?? id;
}

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function docDef(key: DocKey) {
  return DOC_DEFS.find((d) => d.key === key)!;
}

export function tripTotal(t: Pick<Trip, "pickupFee" | "distanceFee" | "timeFee" | "increase" | "boost" | "tip">): number {
  return t.pickupFee + t.distanceFee + t.timeFee + t.increase + t.boost + t.tip;
}

export function tripFare(t: Trip): number {
  return t.pickupFee + t.distanceFee + t.timeFee + t.increase + t.boost;
}

export function driverPayout(t: Trip): number {
  const fare = tripFare(t);
  return fare - Math.round((fare * t.commissionPct) / 100) + t.tip;
}

export function personName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

export function approvedDoc(status: DocStatus): boolean {
  return status === "approved" || status === "expiring" || status === "not_required";
}

export function requiredDocs(driver: Driver, docs: Document[]): Document[] {
  return docs.filter((d) => d.driverId === driver.id && !(d.key === "company" && driver.fleetPartnerId));
}

export function onboardingStage(driver: Driver, docs: Document[]): "new" | "docs" | "vehicle" | "ready" | "activated" | null {
  if (driver.accountStatus === "active") return "activated";
  if (driver.accountStatus !== "pending") return null;
  const req = requiredDocs(driver, docs);
  const vehicleDocs = req.filter((d) => d.key === "registration" || d.key === "insurance");
  const driverDocs = req.filter((d) => d.key !== "registration" && d.key !== "insurance");
  if (driverDocs.every((d) => approvedDoc(d.status)) && vehicleDocs.every((d) => approvedDoc(d.status))) return "ready";
  if (driverDocs.every((d) => approvedDoc(d.status))) return "vehicle";
  if (driverDocs.some((d) => d.status === "in_review" || d.status === "rejected" || d.status === "approved")) return "docs";
  return "new";
}

export function canActivate(driver: Driver, docs: Document[]): boolean {
  return driver.accountStatus === "pending" && onboardingStage(driver, docs) === "ready";
}

export function canDo(agent: Agent | null, grants: Record<RoleId, Permission[]>, permission: Permission): boolean {
  if (!agent) return false;
  if (agent.role === "super") return true;
  return grants[agent.role]?.includes(permission) ?? false;
}

export function inZoneScope(agent: Agent, zoneId: ZoneId): boolean {
  return agent.zones === "all" || agent.zones.includes(zoneId);
}

export function quoteOre(price: ZonePrice, km: number, minutes: number, increase: number) {
  const raw = price.pickup + Math.round(price.perKm * km) + Math.round(price.perMin * minutes) + increase;
  const capped = Math.min(price.maxFare, Math.max(price.minFare, raw));
  return { raw, total: capped, hitMin: raw < price.minFare, hitMax: raw > price.maxFare };
}
