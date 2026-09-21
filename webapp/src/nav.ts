export type AdminPage = {
  id: string;
  path: string;
  label: string;
  crumb: string;
};

export const ADMIN_PAGES: AdminPage[] = [
  { id: "dashboard", path: "/", label: "Dashboard", crumb: "Dashboard Overview" },
  { id: "users", path: "/users", label: "Users", crumb: "Drivers and riders" },
  { id: "trips", path: "/trips", label: "Trips", crumb: "Live and history" },
  { id: "vehicles", path: "/vehicles", label: "Vehicles", crumb: "Fleet" },
  { id: "onboarding", path: "/onboarding", label: "Onboarding", crumb: "Driver documents" },
  { id: "zones", path: "/zones", label: "Zones", crumb: "Operating areas" },
  { id: "pricing", path: "/pricing", label: "Pricing", crumb: "Categories and fares" },
  { id: "promotions", path: "/promotions", label: "Promotions", crumb: "Campaigns" },
  { id: "payments", path: "/payments", label: "Payments", crumb: "Payouts" },
  { id: "support", path: "/support", label: "Support", crumb: "Tickets" },
  { id: "incidents", path: "/incidents", label: "Safety", crumb: "Incidents" },
  { id: "communications", path: "/communications", label: "Communications", crumb: "Messages" },
  { id: "chat", path: "/chat", label: "Chat", crumb: "Live chat" },
  { id: "reviews", path: "/reviews", label: "Reviews", crumb: "Ratings" },
  { id: "reports", path: "/reports", label: "Reports", crumb: "Exports" },
  { id: "franchise", path: "/franchise", label: "Franchise", crumb: "Partners" },
  { id: "notifications", path: "/notifications", label: "Notifications", crumb: "Push and email" },
  { id: "audit", path: "/audit", label: "Audit", crumb: "Activity log" },
  { id: "security", path: "/security", label: "Security", crumb: "Access" },
  { id: "api", path: "/api", label: "API", crumb: "Integrations" },
  { id: "database", path: "/database", label: "Database", crumb: "Stores" },
  { id: "settings", path: "/settings", label: "Settings", crumb: "System config" },
];

export function pageForPath(pathname: string): AdminPage {
  const exact = ADMIN_PAGES.find((page) => page.path === pathname);
  return exact ?? ADMIN_PAGES[0];
}
