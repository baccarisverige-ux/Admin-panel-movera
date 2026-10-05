import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { can } from "./auth/permissions";
import { SessionProvider, useSession } from "./auth/SessionContext";
import { AppShell } from "./layout/AppShell";
import { menuItem, pageForPath, type MenuItem } from "./nav";
import { AuditPage } from "./pages/AuditPage";
import { ComingPage } from "./pages/ComingPage";
import { ChatPage } from "./pages/ChatPage";
import { ConfigPage } from "./pages/ConfigPage";
import { ConfirmPage } from "./pages/ConfirmPage";
import { ContentPage } from "./pages/ContentPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DesignPage } from "./pages/DesignPage";
import { DriverDetailPage } from "./pages/DriverDetailPage";
import { DriversPage } from "./pages/DriversPage";
import { FleetPage } from "./pages/FleetPage";
import { GatesPage } from "./pages/GatesPage";
import { GrowthPage } from "./pages/GrowthPage";
import { HandoverPage } from "./pages/HandoverPage";
import { LoginPage } from "./pages/LoginPage";
import { LivePage } from "./pages/LivePage";
import { MessagesPage } from "./pages/MessagesPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PayoutsPage } from "./pages/PayoutsPage";
import { PricingPage } from "./pages/PricingPage";
import { RecordPage } from "./pages/RecordPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { RiderDetailPage } from "./pages/RiderDetailPage";
import { RidersPage } from "./pages/RidersPage";
import { RiskPage } from "./pages/RiskPage";
import { SafetyPage } from "./pages/SafetyPage";
import { SupportPage } from "./pages/SupportPage";
import { SystemPage } from "./pages/SystemPage";
import { TeamPage } from "./pages/TeamPage";
import { TripsPage } from "./pages/TripsPage";
import { ZoneDetailPage } from "./pages/ZoneDetailPage";
import { ZonesPage } from "./pages/ZonesPage";

function Screen({ id }: { id: string }) {
  const item = menuItem(id);
  if (!item) return <NotFound />;
  if (item.coming) return <ComingPage title={item.label} order={item.coming} />;
  if (id === "audit") return <AuditPage />;
  if (id === "settings") return <ConfigPage />;
  if (id === "confirm") return <ConfirmPage />;
  if (id === "drivers") return <DriversPage />;
  if (id === "onboarding") return <OnboardingPage />;
  if (id === "dashboard") return <DashboardPage />;
  if (id === "zones") return <ZonesPage />;
  if (id === "payments") return <PaymentsPage />;
  if (id === "payouts") return <PayoutsPage />;
  if (id === "pricing") return <PricingPage />;
  if (id === "reservations") return <ReservationsPage />;
  if (id === "reports") return <ReportsPage />;
  if (id === "promotions" || id === "reviews") return <GrowthPage />;
  if (id === "content") return <ContentPage />;
  if (id === "messages") return <MessagesPage />;
  if (id === "handover") return <HandoverPage />;
  if (id === "gates") return <GatesPage />;
  if (id === "design") return <DesignPage />;
  if (id === "vehicles") return <FleetPage />;
  if (id === "support") return <SupportPage />;
  if (id === "chat") return <ChatPage />;
  if (id === "incidents") return <SafetyPage />;
  if (id === "risk") return <RiskPage />;
  if (id === "riders") return <RidersPage />;
  if (id === "trips") return <TripsPage />;
  if (id === "live") return <LivePage />;
  if (id === "team") return <TeamPage />;
  if (id === "system") return <SystemPage />;
  return <ComingPage title={item.label} order="a later work order" />;
}

export function routerBasename(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base === "" ? "/" : base;
}

function NotFound() {
  return (
    <div className="page-heading">
      <div>
        <h2>Page not found</h2>
        <p>That address is not an admin screen.</p>
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="page-heading">
      <div>
        <h2>No access</h2>
        <p>Your role cannot open this page. The attempt is refused here, not hidden as an empty screen.</p>
      </div>
    </div>
  );
}

function Shell({ page, children }: { page: MenuItem | undefined; children: ReactNode }) {
  const { agent } = useSession();
  const shown: MenuItem = page ?? {
    id: "not-found",
    path: "/404",
    label: "Page not found",
    group: "Overview",
    permission: "overview.read",
    icon: "LayoutDashboard",
  };
  return (
    <AppShell page={shown}>
      <section className="page active" data-page={shown.id}>
        {page && agent && !can(agent.role, page.permission) ? <NoAccess /> : children}
      </section>
    </AppShell>
  );
}

function Authed() {
  const { agent } = useSession();
  const location = useLocation();
  if (!agent) return <LoginPage />;
  const page = pageForPath(location.pathname);
  return (
    <Shell page={page}>
      <Routes>
        <Route index element={<Screen id="dashboard" />} />
        <Route path="reports" element={<Screen id="reports" />} />
        <Route path="handover" element={<Screen id="handover" />} />
        <Route path="trips" element={<Screen id="trips" />} />
        <Route path="trips/:tripId" element={<RecordPage kind="trips" label="Trip" list="/trips" />} />
        <Route path="reservations" element={<Screen id="reservations" />} />
        <Route path="reservations/:id" element={<RecordPage label="Reservation" list="/reservations" />} />
        <Route path="live" element={<Screen id="live" />} />
        <Route path="drivers" element={<Screen id="drivers" />} />
        <Route path="drivers/:driverId" element={<DriverDetailPage />} />
        <Route path="onboarding" element={<Screen id="onboarding" />} />
        <Route path="riders" element={<Screen id="riders" />} />
        <Route path="riders/:riderId" element={<RiderDetailPage />} />
        <Route path="vehicles" element={<Screen id="vehicles" />} />
        <Route path="vehicles/:id" element={<RecordPage label="Vehicle" list="/vehicles" />} />
        <Route path="payments" element={<Screen id="payments" />} />
        <Route path="payouts" element={<Screen id="payouts" />} />
        <Route path="payouts/:id" element={<RecordPage label="Payout" list="/payouts" />} />
        <Route path="zones" element={<Screen id="zones" />} />
        <Route path="zones/:zoneId" element={<ZoneDetailPage />} />
        <Route path="pricing" element={<Screen id="pricing" />} />
        <Route path="support" element={<Screen id="support" />} />
        <Route path="tickets/:id" element={<RecordPage label="Ticket" list="/support" />} />
        <Route path="chat" element={<Screen id="chat" />} />
        <Route path="incidents" element={<Screen id="incidents" />} />
        <Route path="incidents/:id" element={<RecordPage label="Incident" list="/incidents" />} />
        <Route path="risk" element={<Screen id="risk" />} />
        <Route path="messages" element={<Screen id="messages" />} />
        <Route path="content" element={<Screen id="content" />} />
        <Route path="promotions" element={<Screen id="promotions" />} />
        <Route path="reviews" element={<Screen id="reviews" />} />
        <Route path="team" element={<Screen id="team" />} />
        <Route path="audit" element={<Screen id="audit" />} />
        <Route path="settings" element={<Screen id="settings" />} />
        <Route path="confirm" element={<Screen id="confirm" />} />
        <Route path="system" element={<Screen id="system" />} />
        <Route path="gates" element={<Screen id="gates" />} />
        <Route path="design" element={<Screen id="design" />} />
        <Route path="users" element={<Navigate to="/drivers" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <SessionProvider>
        <Authed />
      </SessionProvider>
    </BrowserRouter>
  );
}
