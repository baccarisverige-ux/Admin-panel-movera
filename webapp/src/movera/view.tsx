import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { LoginScreen } from "./login";
import { PaymentsScreen, PricingScreen } from "./money";
import { DriverScreen, DriversScreen, FleetScreen, OnboardingScreen, RiderScreen, RidersScreen } from "./people";
import { ReservationsScreen, TripScreen, TripsScreen, ZonesScreen } from "./rides";
import { Shell } from "./shell";
import { useAdmin } from "./store";
import { AuditScreen, ContentScreen, DashboardScreen, IncidentScreen, MessagesScreen, ReportsScreen, SettingsScreen, SupportScreen, TeamScreen } from "./desk";
import { A, Boot, Panel, Toasts } from "./ui";
import {
  AirportsScreen,
  BankScreen,
  BannersScreen,
  BonusesScreen,
  BoostScreen,
  CategoriesScreen,
  ChatScreen,
  DispatchScreen,
  DriverHomeScreen,
  DrivingScreen,
  EventsScreen,
  FeaturesScreen,
  HelpScreen,
  LegalScreen,
  LiveMapScreen,
  MethodsScreen,
  PayoutsScreen,
  PickupsScreen,
  PromosScreen,
  PublishScreen,
  ApprovalsScreen,
  ReasonsScreen,
  ReconcileScreen,
  ReferralScreen,
  RefundsScreen,
  RequirementsScreen,
  ReservationRulesScreen,
  ReviewsScreen,
  RiskScreen,
  SafetySettingsScreen,
  SearchScreen,
  SystemScreen,
  VehiclesScreen,
  VersionsScreen,
  WalletScreen,
} from "./workspaces";

function screenFor(pathname: string): ReactNode {
  const parts = pathname.split("/").filter(Boolean);
  const [head, id] = parts;
  if (!head) return <DashboardScreen />;
  if (head === "drivers" && id) return <DriverScreen id={decodeURIComponent(id)} />;
  if (head === "drivers") return <DriversScreen />;
  if (head === "onboarding") return <OnboardingScreen />;
  if (head === "riders" && id) return <RiderScreen id={decodeURIComponent(id)} />;
  if (head === "riders") return <RidersScreen />;
  if (head === "fleet") return <FleetScreen />;
  if (head === "trips" && id) return <TripScreen id={decodeURIComponent(id)} />;
  if (head === "trips") return <TripsScreen />;
  if (head === "reservations") return <ReservationsScreen />;
  if (head === "zones") return <ZonesScreen />;
  if (head === "pricing") return <PricingScreen />;
  if (head === "payments") return <PaymentsScreen />;
  if (head === "messages") return <MessagesScreen />;
  if (head === "content") return <ContentScreen />;
  if (head === "support") return <SupportScreen ticketId={id ? decodeURIComponent(id) : undefined} />;
  if (head === "incidents") return <IncidentScreen id={id ? decodeURIComponent(id) : undefined} />;
  if (head === "reports") return <ReportsScreen />;
  if (head === "team") return <TeamScreen />;
  if (head === "audit") return <AuditScreen />;
  if (head === "settings") return <SettingsScreen />;
  if (head === "map") return <LiveMapScreen />;
  if (head === "search") return <SearchScreen />;
  if (head === "dispatch") return <DispatchScreen />;
  if (head === "risk") return <RiskScreen />;
  if (head === "vehicles") return <VehiclesScreen />;
  if (head === "reviews") return <ReviewsScreen />;
  if (head === "refunds") return <RefundsScreen />;
  if (head === "payouts") return <PayoutsScreen />;
  if (head === "wallet") return <WalletScreen />;
  if (head === "bank") return <BankScreen />;
  if (head === "methods") return <MethodsScreen />;
  if (head === "reconcile") return <ReconcileScreen />;
  if (head === "airports") return <AirportsScreen />;
  if (head === "pickups") return <PickupsScreen />;
  if (head === "categories") return <CategoriesScreen />;
  if (head === "boost") return <BoostScreen />;
  if (head === "chat") return <ChatScreen />;
  if (head === "help") return <HelpScreen />;
  if (head === "driver-home") return <DriverHomeScreen />;
  if (head === "banners") return <BannersScreen />;
  if (head === "events") return <EventsScreen />;
  if (head === "bonuses") return <BonusesScreen />;
  if (head === "promotions") return <PromosScreen />;
  if (head === "referral") return <ReferralScreen />;
  if (head === "legal") return <LegalScreen />;
  if (head === "reasons") return <ReasonsScreen />;
  if (head === "features") return <FeaturesScreen />;
  if (head === "versions") return <VersionsScreen />;
  if (head === "reservation-rules") return <ReservationRulesScreen />;
  if (head === "safety") return <SafetySettingsScreen />;
  if (head === "driving") return <DrivingScreen />;
  if (head === "requirements") return <RequirementsScreen />;
  if (head === "publish") return <PublishScreen />;
  if (head === "approvals") return <ApprovalsScreen />;
  if (head === "system") return <SystemScreen />;
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="mt-1 text-sm text-muted">That address is not an admin screen.</p>
      <A href="/" className="mt-3 inline-block text-sm underline-offset-2 hover:underline">Back to today</A>
    </Panel>
  );
}

export function AdminApp() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { ready, agent } = useAdmin();
  if (!ready) return <Boot />;
  if (!agent) return <><LoginScreen /><Toasts /></>;
  return (
    <>
      <Shell>{screenFor(pathname)}</Shell>
      <Toasts />
    </>
  );
}
