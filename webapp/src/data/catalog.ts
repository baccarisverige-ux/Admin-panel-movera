export type StatTuple = [label: string, value: string];
export type CardTuple = [title: string, detail: string, actionsPipeSeparated: string];

export type TableData = {
  head: string[];
  rows: string[][];
};

export type ChatMessage = {
  role: "admin" | "user";
  text: string;
};

export type ChatThread = {
  heading: string;
  messages: ChatMessage[];
};

export type CommunicationsCustom = {
  kind: "communications";
  tabs: string[];
  targets: string[];
  messageTypes: string[];
  zones: string[];
  recentPopups: { title: string; detail: string }[];
  chat: ChatThread;
};

export type TripsCustom = {
  kind: "trips";
  mapLabels: string[];
  table: TableData;
};

export type ChatCustom = {
  kind: "chat";
  tabs: string[];
  thread: ChatThread;
};

export type SettingsCustom = {
  kind: "settings";
  tabs: string[];
  systemName: string;
  currencies: string[];
  timeZones: string[];
  sessionTimeout: string;
  maxLoginAttempts: string;
};

export type CustomPage =
  | CommunicationsCustom
  | TripsCustom
  | ChatCustom
  | SettingsCustom;

export type CatalogEntry = {
  title: string;
  subtitle: string;
  stats?: StatTuple[];
  cards?: CardTuple[];
  table?: TableData;
  custom?: CustomPage;
};

export type DashboardStat = {
  icon: string;
  label: string;
  value: string;
  trend: string;
};

export type DashboardAlert = {
  tone: "danger" | "warning" | "info";
  icon: string;
  title: string;
  body: string;
  time: string;
  action: string;
};

export type ZoneVolume = {
  name: string;
  count: string;
  swatch: "c1" | "c2" | "c3";
};

export type QuickAction = {
  icon: string;
  label: string;
};

export type FareCategoryId = "economy" | "comfort" | "premium" | "xl";

export type FareRates = readonly [
  pickup: number,
  perKm: number,
  perMin: number,
  minFare: number,
];

export type PriceRow = [
  category: string,
  pickup: string,
  perKm: string,
  perMin: string,
  minFare: string,
  maxFare: string,
  minIncrease: string,
  maxIncrease: string,
];

export const DEDICATED_PAGE_IDS = ["dashboard", "zones", "pricing"] as const;

export const ZONE_OPTIONS = [
  "All Zones",
  "Downtown (Z001)",
  "Uptown (Z002)",
  "Midtown (Z003)",
] as const;

export const FARE_ZONE_OPTIONS = [
  "Downtown (Z001)",
  "Uptown (Z002)",
  "Midtown (Z003)",
] as const;

export const FARE_RATES: Record<FareCategoryId, FareRates> = {
  economy: [4, 1.5, 0.3, 8],
  comfort: [6, 2.1, 0.42, 12],
  premium: [10, 3.25, 0.6, 20],
  xl: [8, 2.7, 0.5, 16],
};

export const FARE_CATEGORIES: { id: FareCategoryId; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "comfort", label: "Comfort" },
  { id: "premium", label: "Premium" },
  { id: "xl", label: "XL" },
];

export function calculateFare(
  category: FareCategoryId,
  distanceKm: number,
  durationMin: number,
): number {
  const distance = Math.max(0, distanceKm);
  const duration = Math.max(0, durationMin);
  const rates = FARE_RATES[category];
  return Math.max(rates[3], rates[0] + distance * rates[1] + duration * rates[2]);
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export const PRICE_ROWS: PriceRow[] = [
  ["Economy", "4.00", "1.50", "0.30", "8.00", "150.00", "0", "20"],
  ["Comfort", "6.00", "2.10", "0.42", "12.00", "220.00", "0", "25"],
  ["Premium", "10.00", "3.25", "0.60", "20.00", "350.00", "0", "30"],
];

export const DASHBOARD_STATS: DashboardStat[] = [
  { icon: "🚕", label: "Online Drivers", value: "1,247", trend: "↗ 12% from yesterday" },
  { icon: "👥", label: "Active Riders", value: "3,582", trend: "↗ 8% from yesterday" },
  { icon: "↗", label: "Ongoing Trips", value: "428", trend: "↗ 3% from yesterday" },
  { icon: "💳", label: "Today's Revenue", value: "$24,587", trend: "↗ 15% from yesterday" },
];

export const DASHBOARD_ALERTS: DashboardAlert[] = [
  {
    tone: "danger",
    icon: "!",
    title: "Payment System Downtime",
    body: "Credit card processing is experiencing issues in Zone",
    time: "10 min ago",
    action: "Fix",
  },
  {
    tone: "warning",
    icon: "!",
    title: "Driver Documents Expiring",
    body: "47 drivers have documents expiring in the next 7 days",
    time: "1 hour ago",
    action: "Review",
  },
  {
    tone: "info",
    icon: "↗",
    title: "Surge Demand Detected",
    body: "High demand detected in downtown area. Consider activating boost pricing.",
    time: "2 hours ago",
    action: "Activate",
  },
];

export const ZONE_VOLUMES: ZoneVolume[] = [
  { name: "Downtown", count: "18,420", swatch: "c1" },
  { name: "Uptown", count: "13,267", swatch: "c2" },
  { name: "Midtown", count: "11,160", swatch: "c3" },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { icon: "⏸", label: "Suspend Zone" },
  { icon: "💳", label: "Disable Payments" },
  { icon: "⚠", label: "Emergency Mode" },
  { icon: "💬", label: "Send Popup" },
  { icon: "＋", label: "Add Driver" },
  { icon: "▤", label: "Generate Report" },
  { icon: "⚙", label: "System Settings" },
];

export const DEMAND_POINTS =
  "0,205 90,168 180,188 270,112 360,130 450,70 540,95 630,42 720,80 800,50";
export const SUPPLY_POINTS =
  "0,220 90,206 180,175 270,164 360,116 450,132 540,91 630,112 720,72 800,88";
export const TOTAL_TRIPS = "42,847";

export const ZONES_TABLE: TableData = {
  head: ["Zone ID", "Name", "City", "Country", "Status", "Actions"],
  rows: [
    ["Z001", "Downtown", "New York", "USA", "Active", "Edit|Delete"],
    ["Z002", "Uptown", "New York", "USA", "Active", "Edit|Delete"],
    ["Z003", "Midtown", "New York", "USA", "Inactive", "Edit|Delete"],
  ],
};

export const ZONE_MAP_LABELS = ["Downtown", "Uptown", "Midtown"] as const;

const ADMIN_CHAT: ChatThread = {
  heading: "Chat with John Doe (Driver) - Zone: Downtown",
  messages: [
    { role: "admin", text: "Hello John, how can I help you today?" },
    {
      role: "user",
      text: "Hi, I'm having issues with the payment system. It's not accepting my card.",
    },
    {
      role: "admin",
      text: "I see the issue. Your card was declined due to insufficient funds. Can you try another payment method?",
    },
    {
      role: "user",
      text: "Okay, I'll try with my wallet balance. Thanks for the help!",
    },
  ],
};

const DRIVER_CHAT: ChatThread = {
  heading: "John Driver (D2847) • Zone: Downtown • Active",
  messages: [
    { role: "admin", text: "Hello John, how can I help you today?" },
    {
      role: "user",
      text: "Hi, I'm having issues with the payment system. It's not accepting my card.",
    },
    {
      role: "admin",
      text: "I see the issue. Your card was declined due to insufficient funds. Can you try another payment method?",
    },
  ],
};

export const PAGE_CATALOG: Record<string, CatalogEntry> = {
  dashboard: {
    title: "Dashboard Overview",
    subtitle: "Monitor live platform activity and system health.",
    stats: [
      ["Online Drivers", "1,247"],
      ["Active Riders", "3,582"],
      ["Ongoing Trips", "428"],
      ["Today's Revenue", "$24,587"],
    ],
  },
  zones: {
    title: "Zone Management",
    subtitle: "Create, manage and monitor operating zones.",
    table: ZONES_TABLE,
  },
  pricing: {
    title: "Pricing & Vehicle Categories",
    subtitle: "Configure category fares, rider adjustments, boost pricing and commission.",
    table: {
      head: [
        "Category",
        "Pickup Fare",
        "Per KM Rate",
        "Per Min Rate",
        "Min Fare",
        "Max Fare",
        "Min Increase by Rider",
        "Max Increase by Rider",
        "Actions",
      ],
      rows: PRICE_ROWS.map((row) => [...row, "Save|Delete"]),
    },
  },
  security: {
    title: "Security & Alerts",
    subtitle: "Monitor platform services, SOS alerts, fraud and document compliance.",
    stats: [
      ["Payment System", "ACTIVE"],
      ["Ride Booking", "ACTIVE"],
      ["Driver App", "ACTIVE"],
      ["Rider App", "ACTIVE"],
    ],
    cards: [
      [
        "SOS Alert - Trip #T38472",
        "Driver John D. triggered SOS at 14:32. Location: 5th Ave & 42nd St",
        "Respond|View on Map|Archive",
      ],
      [
        "Suspicious Activity Detected",
        "Multiple accounts from same device detected • 2 hours ago",
        "Review|Block",
      ],
      [
        "GPS Spoofing Detected",
        "Driver ID: D4721 showing inconsistent location data • 3 hours ago",
        "Review|Block",
      ],
    ],
    table: {
      head: ["Driver ID", "Name", "Document Type", "Expiry Date", "Status", "Actions"],
      rows: [
        ["D2847", "Michael Johnson", "Driver's License", "2023-12-15", "Expired", "Suspend · Notify"],
        ["D3921", "Sarah Williams", "Insurance", "2023-12-20", "Expiring Soon", "Notify"],
      ],
    },
  },
  communications: {
    title: "Communications",
    subtitle: "Send popups, manage chats, notifications and templates.",
    custom: {
      kind: "communications",
      tabs: ["Popups", "Chat", "Notifications", "Templates"],
      targets: ["All Users", "Specific Zone", "Single User"],
      messageTypes: ["Info", "Warning", "Action Required"],
      zones: ["Downtown (Z001)", "Uptown (Z002)", "Midtown (Z003)"],
      recentPopups: [
        {
          title: "System maintenance scheduled for tonight",
          detail: "All Users • Info • 78% acknowledged",
        },
        {
          title: "Heavy traffic expected due to parade",
          detail: "Zone: Downtown • Warning • 92% acknowledged",
        },
      ],
      chat: ADMIN_CHAT,
    },
  },
  trips: {
    title: "Trips & Live Map",
    subtitle: "Monitor active trips and intervene when necessary.",
    custom: {
      kind: "trips",
      mapLabels: ["T38472", "T38473"],
      table: {
        head: ["Trip ID", "Driver", "Rider", "Pickup", "Destination", "Status", "Actions"],
        rows: [
          [
            "T38472",
            "John D. (D2847)",
            "Emma R.",
            "5th Ave & 42nd St",
            "Central Park",
            "Ongoing",
            "Reassign · Cancel",
          ],
          [
            "T38473",
            "Sarah W. (D3921)",
            "Michael T.",
            "Times Square",
            "JFK Airport",
            "En Route",
            "Reassign · Cancel",
          ],
        ],
      },
    },
  },
  reports: {
    title: "Reports & Analytics",
    subtitle: "Review financial, driver, passenger and zone performance.",
    stats: [
      ["Downtown Revenue", "$198,452"],
      ["Uptown Revenue", "$152,369"],
      ["Midtown Revenue", "$124,785"],
      ["Reporting Period", "Last 30 days"],
    ],
    table: {
      head: ["Zone", "Today", "This Week", "This Month", "Growth"],
      rows: [
        ["Downtown", "$8,452", "$52,147", "$198,452", "+12%"],
        ["Uptown", "$6,784", "$41,258", "$152,369", "+8%"],
        ["Midtown", "$5,321", "$32,147", "$124,785", "-3%"],
      ],
    },
  },
  franchise: {
    title: "Franchise Management",
    subtitle: "Manage franchise partners and zone performance.",
    stats: [
      ["NYC Drivers", "247"],
      ["NYC Riders", "1,582"],
      ["NYC Revenue", "$24.5K"],
      ["NYC Rating", "4.7"],
    ],
    cards: [
      [
        "NYC Metro",
        "Owner: John Smith • Zones: Downtown, Uptown, Midtown • Commission: 15%",
        "Edit|Reports|Remove",
      ],
      [
        "Chicago Central",
        "Owner: Sarah Johnson • Zones: Loop, North Side, South Side • Commission: 18%",
        "Edit|Reports|Remove",
      ],
      [
        "LA Metro",
        "Owner: Michael Brown • Zones: Hollywood, Downtown, Beverly Hills • Commission: 20%",
        "Edit|Reports|Activate",
      ],
    ],
  },
  onboarding: {
    title: "Driver Onboarding & Verification",
    subtitle: "Review applications, documents, background checks and approvals.",
    stats: [
      ["Application Review", "Pending: 24"],
      ["Document Verifications", "Pending: 18"],
      ["Background Check", "Pending: 12"],
      ["Final Approval", "Pending: 8"],
    ],
    table: {
      head: ["Application ID", "Driver Name", "Applied Date", "Zone", "Status", "Actions"],
      rows: [
        [
          "APP-8472",
          "Michael Johnson",
          "2023-11-20",
          "Downtown",
          "Document Review",
          "Review · Approve · Reject",
        ],
        [
          "APP-8471",
          "Sarah Wilson",
          "2023-11-19",
          "Uptown",
          "Background Check",
          "View · Request Info",
        ],
        ["APP-8470", "David Brown", "2023-11-18", "Midtown", "Approved", "Details · Activate"],
      ],
    },
  },
  payments: {
    title: "Payment & Finance Management",
    subtitle: "Manage revenue, payouts, commission, refunds and gateways.",
    stats: [
      ["Total Revenue", "$248,752"],
      ["Driver Payouts", "$186,564"],
      ["Commission", "$62,188"],
      ["Refunds", "$2,458"],
    ],
    table: {
      head: ["Driver ID", "Driver Name", "Zone", "Amount", "Period", "Status", "Actions"],
      rows: [
        ["D2847", "John Driver", "Downtown", "$1,247.50", "Nov 1-15, 2023", "Pending", "Pay · Details"],
        ["D3921", "Sarah Wilson", "Uptown", "$984.75", "Nov 1-15, 2023", "Pending", "Pay · Details"],
      ],
    },
  },
  support: {
    title: "Support & Ticket System",
    subtitle: "Handle rider and driver support tickets by priority.",
    cards: [
      [
        "Payment Failed - Trip T38472",
        "CRITICAL • User: Emma Rider (R4821) • Zone: Downtown • Created: 15 min ago",
        "Take Action|View Details",
      ],
      [
        "Driver Navigation Issue",
        "HIGH • User: John Driver (D2847) • Zone: Downtown • Created: 45 min ago",
        "Assign|View Details",
      ],
      [
        "Account Verification Request",
        "NORMAL • User: Michael Thompson • Zone: Midtown • Created: 2 hours ago",
        "Respond|View Details",
      ],
    ],
    table: {
      head: ["Ticket ID", "Subject", "User", "Zone", "Priority", "Status", "Actions"],
      rows: [
        [
          "TKT-8472",
          "Payment Failed - Trip T38472",
          "Emma Rider",
          "Downtown",
          "CRITICAL",
          "Open",
          "Respond · View",
        ],
        [
          "TKT-8471",
          "Driver Navigation Issue",
          "John Driver",
          "Downtown",
          "HIGH",
          "In Progress",
          "Update · View",
        ],
      ],
    },
  },
  promotions: {
    title: "Promotions & Marketing",
    subtitle: "Create promotions and track campaign usage and conversion.",
    stats: [
      ["Active Promotions", "3 Active"],
      ["Total Uses", "24.5K"],
      ["Discount Value", "$18.7K"],
      ["Conversion Rate", "12.8%"],
    ],
    table: {
      head: ["Promo Code", "Description", "Discount", "Zone", "Uses", "Status", "Actions"],
      rows: [
        ["WELCOME20", "New User Welcome Discount", "20% off", "All Zones", "8,452", "Active", "Edit · Pause"],
        ["RIDENOW15", "Weekend Special", "15% off", "Downtown", "3,247", "Active", "Edit · Pause"],
        ["SAFETY10", "Safety Promotion", "10% off", "All Zones", "5,821", "Expired", "Copy · Reactivate"],
      ],
    },
  },
  vehicles: {
    title: "Vehicle Management",
    subtitle: "Manage vehicles, insurance, inspections and maintenance.",
    cards: [
      [
        "Toyota Camry 2022 (V7842)",
        "Owner: John Driver • Zone: Downtown • License Plate: ABC-1234 • Color: White • Seats: 4",
        "Schedule Maintenance|View Documents|Service History",
      ],
    ],
    table: {
      head: ["Vehicle ID", "Model", "Owner", "Zone", "License Plate", "Status", "Actions"],
      rows: [
        ["V7842", "Toyota Camry 2022", "John Driver", "Downtown", "ABC-1234", "Active", "Edit · Maintenance"],
        ["V7843", "Honda Accord 2021", "Sarah Wilson", "Uptown", "XYZ-5678", "Active", "Edit · Maintenance"],
      ],
    },
  },
  reviews: {
    title: "Reviews & Ratings Management",
    subtitle: "Moderate reviews and monitor rating health.",
    cards: [
      [
        "Emma Rider — ⭐⭐⭐⭐⭐",
        "Trip: T38472 • Driver: John Driver • “Excellent service! Driver was punctual, car was clean, and the ride was smooth.”",
        "Approve|Reject|Flag",
      ],
      [
        "Michael Thompson — ⭐⭐",
        "Trip: T38471 • Driver: Sarah Wilson • “Driver took a longer route and the car wasn’t very clean.”",
        "Respond|View Details",
      ],
    ],
    table: {
      head: ["Zone", "Average Rating", "Total Reviews", "5 Stars", "1-2 Stars", "Response Rate"],
      rows: [
        ["Downtown", "4.7", "8,452", "6,841 (81%)", "247 (3%)", "94%"],
        ["Uptown", "4.5", "6,784", "5,128 (76%)", "339 (5%)", "89%"],
        ["Midtown", "4.6", "5,321", "4,152 (78%)", "213 (4%)", "91%"],
      ],
    },
  },
  incidents: {
    title: "Emergency & Incident Management",
    subtitle: "Respond to SOS alerts and active safety incidents.",
    cards: [
      [
        "SOS Alert - Trip #T38472",
        "Driver: John Driver • Rider: Emma Rider • Zone: Downtown • Location: 5th Ave & 42nd St • CRITICAL",
        "Contact Emergency|View Location|Contact Driver",
      ],
    ],
    table: {
      head: ["Incident ID", "Type", "Trip ID", "Zone", "Severity", "Status", "Actions"],
      rows: [
        ["INC-8472", "SOS Alert", "T38472", "Downtown", "CRITICAL", "Active", "Respond · Details"],
        ["INC-8471", "Accident Report", "T38465", "Uptown", "HIGH", "Investigating", "Update · Details"],
      ],
    },
  },
  audit: {
    title: "Audit & Compliance",
    subtitle: "Review system activity and compliance reports.",
    cards: [
      ["2023-11-21 14:32:15", "Admin login from IP 192.168.1.105 • User: admin@rideshare.com", ""],
      ["2023-11-21 13:45:22", "Driver document approved • Driver: D2847 (John Driver)", ""],
      ["2023-11-21 12:15:08", "Pricing updated for Zone Downtown • User: admin@rideshare.com", ""],
    ],
    table: {
      head: ["Report Type", "Period", "Generated", "Status", "Actions"],
      rows: [
        ["Driver Compliance", "Q4 2023", "2023-11-20", "Complete", "View · Download"],
        ["Financial Audit", "October 2023", "2023-11-15", "Complete", "View · Download"],
        ["Safety Compliance", "Q4 2023", "2023-11-10", "In Progress", "View · Generate"],
      ],
    },
  },
  notifications: {
    title: "Notification System",
    subtitle: "Create campaigns and monitor notification performance.",
    stats: [
      ["Push Sent", "24.8K"],
      ["Push Delivered", "18.5K"],
      ["Push Opened", "4.2K"],
      ["Open Rate", "22.7%"],
    ],
    table: {
      head: ["Campaign", "Type", "Target", "Sent", "Open Rate", "Status", "Actions"],
      rows: [
        ["Weekend Promotion", "Push + Email", "All Users", "24,852", "22.7%", "Completed", "View · Duplicate"],
        ["Driver App Update", "Push", "All Drivers", "8,452", "45.2%", "Completed", "View · Duplicate"],
        ["Safety Reminder", "SMS", "Zone: Downtown", "12,458", "18.3%", "Scheduled", "Edit · Cancel"],
      ],
    },
  },
  api: {
    title: "API & Integration Management",
    subtitle: "Monitor platform integrations and manage API access.",
    stats: [
      ["Ride Booking API", "Operational"],
      ["Payment Gateway", "Operational"],
      ["Mapping Service", "Operational"],
      ["Notification Service", "Operational"],
    ],
    table: {
      head: ["Key Name", "API Key", "Permissions", "Created", "Last Used", "Status", "Actions"],
      rows: [
        [
          "Mobile App",
          "rs_mob_8472abc...",
          "Read/Write",
          "2023-10-15",
          "2023-11-21 14:25",
          "Active",
          "Regenerate · Revoke",
        ],
        [
          "Partner Integration",
          "rs_part_3921xyz...",
          "Read Only",
          "2023-09-20",
          "2023-11-20 09:15",
          "Active",
          "Regenerate · Revoke",
        ],
      ],
    },
  },
  chat: {
    title: "Chat Management",
    subtitle: "Manage driver, rider and support conversations.",
    custom: {
      kind: "chat",
      tabs: ["Driver Chats", "Rider Chats", "Support Chats"],
      thread: DRIVER_CHAT,
    },
  },
  database: {
    title: "Database Management",
    subtitle: "Monitor database size, records and backups.",
    stats: [
      ["Total Size", "24.8 GB"],
      ["Drivers", "1,247"],
      ["Riders", "3,582"],
      ["Trips", "42,847"],
    ],
    table: {
      head: ["Table Name", "Records", "Size", "Last Updated", "Actions"],
      rows: [
        ["drivers", "1,247", "2.4 GB", "2023-11-21 14:32", "View · Export"],
        ["riders", "3,582", "1.8 GB", "2023-11-21 13:45", "View · Export"],
        ["trips", "42,847", "8.2 GB", "2023-11-21 14:15", "View · Export"],
      ],
    },
  },
  users: {
    title: "User Management",
    subtitle: "Manage drivers, riders and account status.",
    stats: [
      ["Driver's License", "Expires: 2024-06-15"],
      ["Vehicle Insurance", "Expires: 2024-03-20"],
      ["Account Status", "Active"],
      ["Zone", "Downtown"],
    ],
    cards: [
      [
        "John Driver",
        "Driver ID: D2847 • Zone: Downtown • Joined: 2023-01-15 • john.driver@example.com • +1 (555) 123-4567",
        "Suspend|Edit|Delete",
      ],
    ],
  },
  settings: {
    title: "System Settings",
    subtitle: "Configure general, security, notification and integration settings.",
    custom: {
      kind: "settings",
      tabs: ["General", "Security", "Notifications", "Integrations"],
      systemName: "RideShare Pro",
      currencies: ["USD ($)", "EUR (€)", "GBP (£)", "SEK (kr)", "TND (د.ت)"],
      timeZones: [
        "UTC-5 (Eastern Time)",
        "UTC-6 (Central Time)",
        "UTC-8 (Pacific Time)",
      ],
      sessionTimeout: "30",
      maxLoginAttempts: "5",
    },
  },
};

export function catalogFor(pageId: string): CatalogEntry {
  const entry = PAGE_CATALOG[pageId];
  if (!entry) {
    throw new Error(`Unknown admin page: ${pageId}`);
  }
  return entry;
}

export function isDedicatedPage(pageId: string): boolean {
  return (DEDICATED_PAGE_IDS as readonly string[]).includes(pageId);
}
