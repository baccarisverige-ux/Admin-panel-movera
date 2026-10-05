import {
  CANCEL_REASONS,
  CATEGORIES,
  DEFAULT_GRANTS,
  DEMO_NOW,
  DOC_DEFS,
  PAYMENTS,
  POLICY_TEXTS,
  ROLES,
  ZONES,
  type AccountStatus,
  type Agent,
  type AppVersion,
  type BankAccount,
  type CategoryId,
  type DemoDb,
  type DocStatus,
  type Document,
  type Driver,
  type DriverOnlineStatus,
  type PaymentId,
  type Place,
  type Reservation,
  type RoleId,
  type Trip,
  type TripStatus,
  type Vehicle,
  type ZoneId,
  type ZonePrice,
} from "./domain";

const ZONE_IDS = ZONES.map((zone) => zone.id);

const FIRST = ["Erik", "Anna", "Johan", "Maria", "Lars", "Karin", "Anders", "Sara", "Peter", "Linnea", "Omar", "Fatima", "Noah", "Elin", "Hugo", "Maja"];
const LAST = ["Lind", "Berg", "Holm", "Nyström", "Ali", "Eriksson", "Johansson", "Karlsson", "Nilsson", "Svensson", "Larsson", "Olsson"];
const RIDER_FIRST = ["Astrid", "Leo", "Wilma", "Elias", "Alma", "Oscar", "Freja", "William", "Nora", "Lucas", "Ebba", "Samir"];
const CARS: [string, string, Vehicle["fuel"]][] = [
  ["Volvo", "XC40", "hybrid"],
  ["Toyota", "Corolla", "petrol"],
  ["Tesla", "Model 3", "electric"],
  ["Volkswagen", "Passat", "diesel"],
  ["Polestar", "2", "electric"],
  ["Skoda", "Octavia", "petrol"],
  ["Kia", "EV6", "electric"],
  ["Volvo", "EX30", "electric"],
];
const COLORS = ["Black", "White", "Grey", "Blue", "Silver"];
const PLACES: Place[] = [
  { label: "Centralstationen", address: "Centralplan 15, Stockholm" },
  { label: "Sergels torg", address: "Sergels torg, Stockholm" },
  { label: "Slussen", address: "Slussen, Stockholm" },
  { label: "Odenplan", address: "Odenplan, Stockholm" },
  { label: "Fridhemsplan", address: "Fridhemsplan, Stockholm" },
  { label: "Globen", address: "Arenavägen, Johanneshov" },
  { label: "Arlanda T5", address: "Arlanda Terminal 5" },
  { label: "Bromma flygplats", address: "Bromma flygplats" },
  { label: "Kista Galleria", address: "Kista Galleria" },
  { label: "Södertälje C", address: "Södertälje centrum" },
  { label: "Fotografiska", address: "Stadsgårdshamnen 22" },
  { label: "Hornstull", address: "Hornstull, Stockholm" },
];

function addMin(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function phone(n: number): string {
  return `+4670${String(1000000 + n).slice(0, 7)}`;
}

function plate(i: number): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a = letters[i % letters.length]!;
  const b = letters[(i * 3) % letters.length]!;
  const c = letters[(i * 7) % letters.length]!;
  return `${a}${b}${c} ${String(100 + (i % 900)).padStart(3, "0")}`;
}

function iban(seed: number): string {
  const bban = String(50000000000000000000 + seed).slice(0, 20);
  const rearranged = `${bban}281400`;
  let rest = 0;
  for (const ch of rearranged) rest = (rest * 10 + Number(ch)) % 97;
  const check = String(98 - rest).padStart(2, "0");
  return `SE${check}${bban}`;
}

function version(mandatory: boolean): AppVersion {
  return {
    latest: "4.8.0",
    minimum: mandatory ? "4.8.0" : "4.4.0",
    title: "Update Movera",
    message: "A new version is ready for Stockholm.",
    actionLabel: "Update",
    dismissLabel: "Later",
    mandatory,
    updateUrl: "https://movera.se",
  };
}

type Stage = "new" | "docs" | "vehicle" | "ready" | "hold" | "suspended" | "active";

function stageOf(i: number): Stage {
  const slot = i % 15;
  if (slot === 0) return "new";
  if (slot === 1) return "docs";
  if (slot === 2) return "vehicle";
  if (slot === 3) return "ready";
  if (slot === 4) return "hold";
  if (slot === 5) return "suspended";
  return "active";
}

function documentFor(driver: Driver, vehicleId: string, key: Document["key"], stage: Stage): Document {
  const id = `${driver.id}-${key}`;
  const vehicleDoc = key === "registration" || key === "insurance";
  if (key === "company" && driver.fleetPartnerId) return { id, driverId: driver.id, key, status: "not_required" };
  const uploaded = addMin(driver.joined, 90);
  if (stage === "new") return { id, driverId: driver.id, key, vehicleId: vehicleDoc ? vehicleId : undefined, status: "needed" };
  if (stage === "docs") {
    if (vehicleDoc) return { id, driverId: driver.id, key, vehicleId, status: "needed" };
    const status: DocStatus = key === "license" || key === "photo" ? "in_review" : "approved";
    return { id, driverId: driver.id, key, status, uploadedAt: uploaded, reviewerId: status === "approved" ? "ag-sara" : undefined, expiresAt: key === "license" ? "2028-04-01" : undefined };
  }
  if (stage === "vehicle") {
    if (vehicleDoc) return { id, driverId: driver.id, key, vehicleId, status: "in_review", uploadedAt: uploaded };
    return { id, driverId: driver.id, key, status: "approved", uploadedAt: uploaded, reviewerId: "ag-sara", expiresAt: key === "license" ? "2028-04-01" : undefined };
  }
  if (stage === "hold" && key === "license") return { id, driverId: driver.id, key, status: "expired", uploadedAt: uploaded, expiresAt: "2026-09-01", reviewerId: "ag-sara" };
  if (stage === "ready" || stage === "active" || stage === "hold" || stage === "suspended") {
    return { id, driverId: driver.id, key, vehicleId: vehicleDoc ? vehicleId : undefined, status: key === "license" && stage === "active" && driver.id.endsWith("6") ? "expiring" : "approved", uploadedAt: uploaded, reviewerId: "ag-sara", expiresAt: key === "license" ? "2028-04-01" : undefined };
  }
  return { id, driverId: driver.id, key, status: "needed" };
}

const PATH: TripStatus[] = ["requested", "searching", "offered", "accepted", "driver_to_pickup", "arrived", "rider_onboard", "in_trip", "approaching_dropoff", "completed"];

export function createSeed(): DemoDb {
  const partners: DemoDb["partners"] = [
    { id: "fp-stockholm", name: "Stockholm Fleet AB", orgNo: "556123-4567", zoneId: "norrmalm" },
    { id: "fp-south", name: "Söder Taxi KB", orgNo: "969712-3344", zoneId: "sodermalm" },
  ];

  const agents: Agent[] = [
    { id: "ag-nora", name: "Nora Lind", email: "nora.lind@movera.se", role: "super", zones: "all", presence: "online", title: "Super admin", lastActive: DEMO_NOW },
    { id: "ag-lena", name: "Lena Berg", email: "lena.berg@movera.se", role: "ops", zones: "all", presence: "online", title: "Operations", lastActive: DEMO_NOW },
    { id: "ag-sara", name: "Sara Holm", email: "sara.holm@movera.se", role: "onboarding", zones: "all", presence: "online", title: "Onboarding", lastActive: DEMO_NOW },
    { id: "ag-amir", name: "Amir Haddad", email: "amir.haddad@movera.se", role: "support", zones: "all", presence: "away", title: "Support", lastActive: addMin(DEMO_NOW, -20) },
    { id: "ag-elin", name: "Elin Nyström", email: "elin.nystrom@movera.se", role: "safety", zones: "all", presence: "online", title: "Safety", lastActive: DEMO_NOW },
    { id: "ag-oskar", name: "Oskar Berg", email: "oskar.berg@movera.se", role: "finance", zones: "all", presence: "online", title: "Finance", lastActive: DEMO_NOW },
    { id: "ag-fatima", name: "Fatima Ali", email: "fatima.ali@stockholmfleet.se", role: "fleet", zones: ["norrmalm", "vasastan"], fleetPartnerId: "fp-stockholm", presence: "online", title: "Fleet", lastActive: DEMO_NOW },
  ];

  const drivers: Driver[] = [];
  const documents: Document[] = [];
  const vehicles: Vehicle[] = [];

  for (let i = 0; i < 60; i += 1) {
    const stage = stageOf(i);
    const accountStatus: AccountStatus = stage === "hold" ? "on_hold" : stage === "suspended" ? "suspended" : stage === "active" ? "active" : "pending";
    const online: DriverOnlineStatus = accountStatus === "suspended" ? "suspended" : accountStatus !== "active" ? "offline" : (["online", "on_trip", "offline", "going_online"] as const)[i % 4]!;
    const zoneId = ZONE_IDS[i % ZONE_IDS.length]!;
    const fleet = i % 4 === 0 ? "fp-stockholm" : i % 5 === 0 ? "fp-south" : null;
    const id = `D-${1001 + i}`;
    const vehicleId = `V-${1001 + i}`;
    const categories = Object.fromEntries(CATEGORIES.map((category) => [category.id, category.id === "premium" ? i % 3 === 0 : category.id === "electric" ? i % 2 === 0 : true])) as Record<CategoryId, boolean>;
    const driver: Driver = {
      id,
      firstName: FIRST[i % FIRST.length]!,
      lastName: LAST[i % LAST.length]!,
      phone: phone(200 + i),
      personnummer: `198${i % 10}0${(i % 9) + 1}${10 + (i % 18)}-${1000 + i}`,
      zoneId,
      accountStatus,
      onlineStatus: online,
      rating: accountStatus === "active" ? Math.round((4.55 + (i % 8) * 0.05) * 10) / 10 : 0,
      acceptance: accountStatus === "active" ? 78 + (i % 20) : 0,
      cancellation: accountStatus === "active" ? 2 + (i % 11) : 0,
      fleetPartnerId: fleet,
      joined: addMin(DEMO_NOW, -(8 + i) * 360),
      assigneeId: stage === "docs" || stage === "vehicle" ? "ag-sara" : null,
      categories,
      categoryReasons: categories.premium ? {} : { premium: "Vehicle is not on the premium list." },
      booster: i % 2 === 0,
      boosterReason: i % 2 === 0 ? undefined : "No child seat fitted.",
      bank: i % 9 === 0
        ? { kind: "iban", iban: iban(810000 + i), bic: "ESSESESS", bankName: "SEB", status: i % 18 === 0 ? "in_review" : "approved" }
        : { kind: "se", clearing: i % 4 === 0 ? "81059" : "5432", account: String(10000000 + i * 97).slice(0, i % 4 === 0 ? 10 : 7), bankName: i % 4 === 0 ? "Swedbank" : "Handelsbanken", status: i % 7 === 0 ? "in_review" : "approved" },
      hours: [6, 7, 8, 5, 9, 4, 3].map((hours, day) => (accountStatus === "active" ? hours + ((i + day) % 3) : 0)),
      emergencyName: "Family contact",
      emergencyPhone: phone(400 + i),
    };
    drivers.push(driver);
    const car = CARS[i % CARS.length]!;
    vehicles.push({
      id: vehicleId,
      driverId: id,
      make: car[0],
      model: car[1],
      year: 2016 + (i % 10),
      plate: plate(i),
      color: COLORS[i % COLORS.length]!,
      seats: car[1] === "XC40" || i % 11 === 0 ? 6 : 4,
      status: i % 17 === 0 ? "maintenance" : "active",
      fuel: car[2],
      paper: stage === "vehicle" ? "in_review" : "approved",
    });
    for (const def of DOC_DEFS) documents.push(documentFor(driver, vehicleId, def.key, stage));
  }

  const riders: DemoDb["riders"] = Array.from({ length: 140 }, (_, i) => ({
    id: `R-${2201 + i}`,
    firstName: RIDER_FIRST[i % RIDER_FIRST.length]!,
    lastName: LAST[(i * 3) % LAST.length]!,
    phone: phone(800 + i),
    signIn: (["phone", "apple", "google"] as const)[i % 3]!,
    status: i % 29 === 0 ? "blocked" as const : "active" as const,
    ratingGiven: 4.6,
    trips: 3 + (i % 40),
    joined: addMin(DEMO_NOW, -(20 + i) * 180),
    zoneId: ZONE_IDS[i % ZONE_IDS.length]!,
    walletOre: (i % 5) * 10000,
    pinOn: i % 2 === 0,
    places: [{ name: "Home", address: PLACES[i % PLACES.length]!.address }, { name: "Work", address: "Klarabergsviadukten 70" }],
    blockReason: i % 29 === 0 ? "Repeated no-shows" : undefined,
    privacy: i % 40 === 0 ? "requested" as const : "none" as const,
  }));

  const trips: Trip[] = [];
  for (let i = 0; i < 280; i += 1) {
    const driver = drivers[i % drivers.length]!;
    const rider = riders[i % riders.length]!;
    const vehicle = vehicles.find((item) => item.driverId === driver.id)!;
    const category = CATEGORIES[i % CATEGORIES.length]!.id;
    const status: TripStatus = i % 17 === 0 ? "cancelled_by_rider" : i % 19 === 0 ? "no_show" : i % 23 === 0 ? "searching" : i < 12 ? PATH[Math.min(i, PATH.length - 1)]! : "completed";
    const active = ["driver_to_pickup", "arrived", "in_trip", "approaching_dropoff", "accepted"].includes(status) || (driver.onlineStatus === "on_trip" && i % 11 === 0);
    const finalStatus: TripStatus = active && status === "completed" ? "in_trip" : status;
    const step = PATH.indexOf(finalStatus as (typeof PATH)[number]);
    const timeline = (step >= 0 ? PATH.slice(0, step + 1) : [finalStatus]).map((item, index) => ({ status: item, at: addMin(DEMO_NOW, -180 + index * 4 + i) }));
    trips.push({
      id: `T-${80000 + i}`,
      status: finalStatus,
      riderId: rider.id,
      driverId: finalStatus === "searching" ? null : driver.id,
      vehicleId: finalStatus === "searching" ? null : vehicle.id,
      zoneId: driver.zoneId,
      category,
      paymentMethod: PAYMENTS[i % PAYMENTS.length]!.id,
      paymentStatus: finalStatus === "completed" ? "captured" : finalStatus === "cancelled_by_rider" ? "refunded" : "authorized",
      ratingStatus: finalStatus === "completed" && i % 3 !== 0 ? "submitted" : finalStatus === "completed" ? "skipped" : "pending",
      rating: finalStatus === "completed" && i % 3 !== 0 ? 3 + (i % 3) : undefined,
      driverRating: finalStatus === "completed" && i % 4 === 0 ? 5 : undefined,
      pickup: PLACES[i % PLACES.length]!,
      dropoff: PLACES[(i + 3) % PLACES.length]!,
      stops: i % 9 === 0 ? [PLACES[(i + 1) % PLACES.length]!] : [],
      km: 3 + (i % 28),
      minutes: 8 + (i % 40),
      pickupFee: 4900,
      distanceFee: (3 + (i % 28)) * 1800,
      timeFee: (8 + (i % 40)) * 400,
      increase: i % 6 === 0 ? 2000 : 0,
      boost: i % 8 === 0 ? 1500 : 0,
      tip: finalStatus === "completed" && i % 5 === 0 ? 2000 : 0,
      commissionPct: 20,
      createdAt: addMin(DEMO_NOW, -400 + i),
      timeline,
      cancelCode: finalStatus === "cancelled_by_rider" ? "plans_changed" : finalStatus === "no_show" ? "rider_no_show" : undefined,
      cancelledBy: finalStatus === "cancelled_by_rider" ? "rider" : undefined,
      pinVerified: ["rider_onboard", "in_trip", "approaching_dropoff", "completed"].includes(finalStatus),
      options: i % 7 === 0 ? ["bags"] : [],
      ruleVersion: 3,
    });
  }

  const reservations: Reservation[] = [
    { id: "B-501", riderId: riders[0]!.id, driverId: null, zoneId: "norrmalm", category: "economy", pickupAt: addMin(DEMO_NOW, 40), pickup: PLACES[0]!, dropoff: PLACES[6]!, stops: [], price: 45900, status: "waiting", offers: 1 },
    { id: "B-502", riderId: riders[1]!.id, driverId: drivers[6]!.id, zoneId: "sodermalm", category: "comfort", pickupAt: addMin(DEMO_NOW, 180), pickup: PLACES[2]!, dropoff: PLACES[7]!, stops: [], price: 32900, previousPrice: 30900, status: "assigned", offers: 2 },
    { id: "B-503", riderId: riders[2]!.id, driverId: drivers[7]!.id, zoneId: "arlanda", category: "premium", pickupAt: addMin(DEMO_NOW, -90), pickup: PLACES[6]!, dropoff: PLACES[1]!, stops: [], price: 68900, status: "completed", offers: 1 },
    { id: "B-504", riderId: riders[3]!.id, driverId: null, zoneId: "kista", category: "electric", pickupAt: addMin(DEMO_NOW, 20), pickup: PLACES[8]!, dropoff: PLACES[0]!, stops: [], price: 21900, status: "waiting", offers: 0 },
    { id: "B-505", riderId: riders[4]!.id, driverId: null, zoneId: "bromma", category: "economy", pickupAt: addMin(DEMO_NOW, -30), pickup: PLACES[7]!, dropoff: PLACES[3]!, stops: [], price: 18900, status: "cancelled", offers: 3, cancelReason: "Plans changed" },
  ];

  const base: Omit<ZonePrice, "zoneId" | "category">[] = [
    { pickup: 4900, perKm: 1800, perMin: 400, minFare: 9900, maxFare: 150000, increaseMin: 0, increaseMax: 8000, cancelFee: 0 },
    { pickup: 6900, perKm: 2200, perMin: 500, minFare: 12900, maxFare: 180000, increaseMin: 0, increaseMax: 10000, cancelFee: 4900 },
    { pickup: 8900, perKm: 2600, perMin: 600, minFare: 15900, maxFare: 220000, increaseMin: 0, increaseMax: 12000, cancelFee: 6900 },
    { pickup: 5900, perKm: 2000, perMin: 450, minFare: 11900, maxFare: 160000, increaseMin: 0, increaseMax: 9000, cancelFee: 0 },
    { pickup: 7900, perKm: 2400, perMin: 550, minFare: 14900, maxFare: 200000, increaseMin: 0, increaseMax: 10000, cancelFee: 4900 },
    { pickup: 4900, perKm: 1800, perMin: 400, minFare: 9900, maxFare: 150000, increaseMin: 0, increaseMax: 8000, cancelFee: 0 },
    { pickup: 5900, perKm: 1900, perMin: 420, minFare: 10900, maxFare: 150000, increaseMin: 0, increaseMax: 8000, cancelFee: 0 },
  ];
  const prices: ZonePrice[] = ZONE_IDS.flatMap((zoneId) =>
    CATEGORIES.map((category, index) => ({ zoneId, category: category.id, ...base[index]! })),
  );

  const settings: DemoDb["settings"] = {
    orgName: "Movera",
    currency: "SEK",
    timeZone: "Europe/Stockholm",
    sessionMinutes: 60,
    twoStep: true,
    maxLoginAttempts: 5,
    simulateErrors: false,
    dispatch: {
      offerSeconds: 8.5,
      onTripOfferSeconds: 8.5,
      radarPickSeconds: 30,
      maxRadarOffers: 4,
      searchKm: 5,
      radarKm: 30,
      approachMeters: 300,
      arrivedMeters: 100,
      freeWaitSeconds: 120,
      quoteSeconds: 120,
      noShowMinutes: 5,
      destinationUses: 2,
      airportQueue: true,
      airportZone: "arlanda",
    },
    reservations: {
      bookAheadDays: 14,
      earliestAssignHours: 0.5,
      waitingMinutes: 5,
      freeCancelHours: 1,
      cancelFeeOre: 4900,
      giveUpMinutes: 5,
      noDriverText: "We could not find a driver. The reservation is cancelled and you are not charged.",
      termsText: "Free cancellation until 1 hour before pickup. After that a cancellation fee applies. Waiting time included is 5 minutes.",
      policy: POLICY_TEXTS.map((item) => ({ ...item })),
    },
    safety: { pin: true, rideCheckStopMin: 4, deviationM: 400, shareTrip: true, trustedContacts: 5, audio: false },
    driving: { maxHoursDay: 10, maxHoursWeek: 48, breakAfterHours: 4, warnMinutes: 30, impossibleMps: 55 },
    tips: [0, 1000, 2000, 3000],
    tipsEnabled: true,
    paymentMethods: Object.fromEntries(PAYMENTS.map((method) => [method.id, true])) as Record<PaymentId, boolean>,
    performance: { showRating: true, showAcceptance: true, showCancellation: true },
    scheduledRow: { enabled: true, title: "Reservations", subtitle: "Requests waiting for a driver" },
    signIn: { phone: true, apple: true, google: true },
    versions: { driverIos: version(false), driverAndroid: version(false), riderIos: version(false), riderAndroid: version(true) },
    eventsTitle: "Around Stockholm",
    eventsSubtitle: "Where demand will be",
    referral: { inviterOre: 10000, inviteeOre: 5000, condition: "First trip completed" },
  };

  return {
    schema: 1,
    seq: 40,
    rev: 1,
    drivers,
    documents,
    vehicles,
    riders,
    trips,
    reservations,
    tickets: [
      { id: "S-11", personType: "rider", personId: riders[0]!.id, tripId: trips[0]!.id, subject: "Charged more than expected", priority: "high", status: "open", assigneeId: null, createdAt: addMin(DEMO_NOW, -80), messages: [{ from: "user", text: "The receipt is higher than the quote.", at: addMin(DEMO_NOW, -80) }] },
      { id: "S-12", personType: "driver", personId: drivers[8]!.id, subject: "Airport queue", priority: "normal", status: "waiting", assigneeId: "ag-amir", createdAt: addMin(DEMO_NOW, -200), messages: [{ from: "user", text: "I waited at Arlanda and did not get an offer.", at: addMin(DEMO_NOW, -200) }, { from: "agent", text: "Looking at the queue now.", at: addMin(DEMO_NOW, -150), agentId: "ag-amir" }] },
    ],
    incidents: [
      { id: "I-21", tripId: trips.find((trip) => trip.status === "in_trip")?.id ?? trips[0]!.id, kind: "sos", status: "open", assigneeId: null, createdAt: addMin(DEMO_NOW, -6), area: "Södermalm", actions: [{ at: addMin(DEMO_NOW, -6), agentId: "system", action: "SOS from rider" }] },
      { id: "I-13", tripId: trips[20]!.id, kind: "ridecheck", status: "closed", assigneeId: "ag-elin", createdAt: addMin(DEMO_NOW, -2000), area: "Norrmalm", outcome: "False alarm", actions: [{ at: addMin(DEMO_NOW, -1990), agentId: "ag-elin", action: "Called driver" }] },
    ],
    events: [
      { id: "E-1", title: "Avicii Arena", category: "Concert", dateLabel: "Fri 10 Oct", timeLabel: "19:00", location: "Johanneshov", description: "Evening demand around Globen.", recommendedWindow: "18:00–23:00", demandLabel: "High", driverNote: "Use the arena pickup points.", imageCredit: "Movera", enabled: true },
    ],
    bonuses: [
      { code: "ARN120", title: "Airport runs", rule: "Trips to or from Arlanda", rewardOre: 12000, zoneId: "arlanda", enabled: true, start: "2026-09-01", end: "2026-12-31" },
      { code: "EVE60", title: "Evening hours", rule: "Stay online for 3 hours after 18:00", rewardOre: 6000, zoneId: "all", enabled: true, start: "2026-09-01", end: "2026-12-31" },
      { code: "PEAK80", title: "Weekday peak", rule: "Complete 8 trips between 07:00 and 09:00, Mon–Fri", rewardOre: 8000, zoneId: "all", enabled: true, start: "2026-09-01", end: "2026-12-31" },
    ],
    promos: [
      { code: "HEM50", title: "First ride home", offOre: 5000, zoneId: "all", perRider: 1, budgetOre: 500000, used: 126, enabled: true, until: "2026-12-31" },
      { code: "ARN20", title: "Arlanda weekday", offOre: 2000, zoneId: "arlanda", perRider: 3, budgetOre: 200000, used: 40, enabled: true, until: "2026-11-30" },
    ],
    articles: [
      { id: "A-1", audience: "rider", topic: "Rides", title: "How a quote works", body: "A quote is valid for 120 seconds. After that the price can change.", published: true, order: 1 },
      { id: "A-2", audience: "rider", topic: "Payments and pricing", title: "Receipts and tips", body: "Tips are 0, 10, 20 or 30 kr. They go to the driver.", published: true, order: 2 },
      { id: "A-3", audience: "driver", topic: "Account and data", title: "Why an account goes on hold", body: "An expired required document puts the account on hold until a new file is approved.", published: true, order: 1 },
    ],
    legal: [
      { id: "L-1", app: "driver", kind: "terms", version: "3.2", publishedAt: "2026-08-01", body: "These terms cover using the Movera driver app in Sweden." },
      { id: "L-2", app: "driver", kind: "privacy", version: "2.4", publishedAt: "2026-08-01", body: "We store trip, document and payout data to run the service." },
      { id: "L-3", app: "rider", kind: "terms", version: "3.2", publishedAt: "2026-08-01", body: "These terms cover booking rides with Movera in Sweden." },
      { id: "L-4", app: "rider", kind: "privacy", version: "2.4", publishedAt: "2026-08-01", body: "We store account, payment and trip data to run the service." },
    ],
    messages: [
      { id: "M-1", type: "island", tone: "info", title: "Radar online", body: "You can receive a next trip within 30 km.", target: "Online drivers", sent: 420, delivered: 402, opened: 310, accepted: 420, failed: 18, phase: "sent", at: addMin(DEMO_NOW, -600) },
    ],
    payouts: drivers.filter((driver) => driver.accountStatus === "active").slice(0, 12).map((driver, index) => ({
      id: `P-${index + 1}`,
      driverId: driver.id,
      period: "2026-W40",
      gross: 180000 + index * 1000,
      commission: 36000,
      bonuses: index % 3 === 0 ? 12000 : 0,
      net: 144000 + index * 1000,
      status: index % 5 === 0 ? "pending" as const : "paid" as const,
    })),
    refunds: [
      { id: "RF-1", tripId: trips[1]!.id, riderId: riders[1]!.id, report: "Charged twice", amount: 18900, status: "open" },
      { id: "RF-2", tripId: trips[2]!.id, riderId: riders[2]!.id, report: "Wrong wait time fee", amount: 25000, status: "open" },
      { id: "RF-3", tripId: trips[3]!.id, riderId: riders[3]!.id, report: "Lost item", amount: 0, status: "rejected", reason: "Not a receipt error" },
    ],
    notes: [
      { id: "N-1", targetType: "driver", targetId: drivers[8]!.id, authorId: "ag-sara", text: "Licence photo is cropped. Asked for a new upload.", at: addMin(DEMO_NOW, -300) },
      { id: "N-2", targetType: "rider", targetId: riders[0]!.id, authorId: "ag-amir", text: "Prefers text, not calls.", at: addMin(DEMO_NOW, -800) },
    ],
    audit: [
      { id: "AU-1", at: addMin(DEMO_NOW, -5000), agentId: "ag-sara", action: "document.approve", target: documents[2]?.id ?? "doc", reason: "Clear photo" },
      { id: "AU-2", at: addMin(DEMO_NOW, -2000), agentId: "ag-elin", action: "incident.close", target: "I-13", reason: "False alarm" },
    ],
    agents,
    roleGrants: Object.fromEntries(ROLES.map((role) => [role.id, [...DEFAULT_GRANTS[role.id as RoleId]]])) as DemoDb["roleGrants"],
    prices,
    categoriesOn: Object.fromEntries(CATEGORIES.map((category) => [category.id, [...ZONE_IDS]])) as Record<CategoryId, ZoneId[]>,
    options: [
      { id: "baby", extraOre: 3000, categories: ["economy", "comfort", "xl", "premium"] },
      { id: "child", extraOre: 2500, categories: ["economy", "comfort", "xl"] },
      { id: "booster", extraOre: 2000, categories: ["economy", "comfort", "xl", "premium"] },
      { id: "bags", extraOre: 1500, categories: CATEGORIES.map((category) => category.id) },
      { id: "pet", extraOre: 2000, categories: ["pet", "economy", "xl"] },
    ],
    settings,
    partners,
    releases: [],
    cancelLists: {
      driverBefore: CANCEL_REASONS.driverBefore.map(([code, title], index) => ({ code, title, on: true, fault: index !== 0 })),
      driverDuring: CANCEL_REASONS.driverDuring.map(([code, title], index) => ({ code, title, on: true, fault: index !== 0 })),
      riderFinding: CANCEL_REASONS.riderFinding.map(([code, title]) => ({ code, title, on: true, fault: false })),
    },
  };
}
