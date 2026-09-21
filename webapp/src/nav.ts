export type AdminPage = {
  id: string;
  path: string;
  label: string;
  crumb: string;
  icon: string;
};

export const ADMIN_PAGES: AdminPage[] = [
  { id: "dashboard", path: "/", label: "Dashboard", crumb: "Dashboard Overview", icon: "▦" },
  { id: "zones", path: "/zones", label: "Zone Management", crumb: "Zone Management", icon: "⌖" },
  { id: "pricing", path: "/pricing", label: "Pricing & Categories", crumb: "Pricing & Categories", icon: "＄" },
  { id: "security", path: "/security", label: "Security & Alerts", crumb: "Security & Alerts", icon: "⚠" },
  { id: "communications", path: "/communications", label: "Communications", crumb: "Communications", icon: "✉" },
  { id: "trips", path: "/trips", label: "Trips & Live Map", crumb: "Trips & Live Map", icon: "⌁" },
  { id: "reports", path: "/reports", label: "Reports & Analytics", crumb: "Reports & Analytics", icon: "▥" },
  { id: "franchise", path: "/franchise", label: "Franchise Management", crumb: "Franchise Management", icon: "⌂" },
  { id: "onboarding", path: "/onboarding", label: "Driver Onboarding", crumb: "Driver Onboarding", icon: "✓" },
  { id: "payments", path: "/payments", label: "Payment Management", crumb: "Payment Management", icon: "▣" },
  { id: "support", path: "/support", label: "Support System", crumb: "Support System", icon: "?" },
  { id: "promotions", path: "/promotions", label: "Promotions", crumb: "Promotions", icon: "％" },
  { id: "vehicles", path: "/vehicles", label: "Vehicle Management", crumb: "Vehicle Management", icon: "▰" },
  { id: "reviews", path: "/reviews", label: "Reviews & Ratings", crumb: "Reviews & Ratings", icon: "★" },
  { id: "incidents", path: "/incidents", label: "Emergency & Incidents", crumb: "Emergency & Incidents", icon: "!" },
  { id: "audit", path: "/audit", label: "Audit & Compliance", crumb: "Audit & Compliance", icon: "☷" },
  { id: "notifications", path: "/notifications", label: "Notification System", crumb: "Notification System", icon: "◉" },
  { id: "api", path: "/api", label: "API & Integration", crumb: "API & Integration", icon: "⌘" },
  { id: "chat", path: "/chat", label: "Chat Management", crumb: "Chat Management", icon: "◌" },
  { id: "database", path: "/database", label: "Database", crumb: "Database", icon: "▤" },
  { id: "users", path: "/users", label: "User Management", crumb: "User Management", icon: "♙" },
  { id: "settings", path: "/settings", label: "Settings", crumb: "Settings", icon: "⚙" },
];

export function pageForPath(pathname: string): AdminPage {
  const exact = ADMIN_PAGES.find((page) => page.path === pathname);
  return exact ?? ADMIN_PAGES[0];
}
