import { createContext, useContext, type ReactNode } from "react";
import { useAlerts } from "./useAlerts";

type AlertsData = ReturnType<typeof useAlerts>;

const Context = createContext<AlertsData | null>(null);

/** Worked out once for the whole panel, so the bell, the Alerts page, the Dashboard and Dispatch show the same alerts. */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const data = useAlerts();
  return <Context.Provider value={data}>{children}</Context.Provider>;
}

export function useAlertsData(): AlertsData {
  const data = useContext(Context);
  if (!data) throw new Error("useAlertsData needs AlertsProvider");
  return data;
}

/** For places that may render outside the panel shell, such as tests of a single page. */
export function useAlertsMaybe(): AlertsData | null {
  return useContext(Context);
}
