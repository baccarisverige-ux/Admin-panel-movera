import { useMemo } from "react";
import { useSlice } from "../api/hooks";
import { marketOfZone } from "../markets/markets";
import { ONBOARDING_KEY, emptyOnboardingRules, firstWarningDays, normalizeOnboardingRules, type OnboardingRules } from "./onboarding";

/** The first document warning for a driver's zone, from the country's onboarding rules (Q26). Documents turn orange from then. */
export function useDocWarnDays(): (zoneId: string | undefined) => number {
  const slice = useSlice<OnboardingRules>(ONBOARDING_KEY, emptyOnboardingRules());
  const rules = useMemo(() => normalizeOnboardingRules(slice.value), [slice.value]);
  return useMemo(() => (zoneId: string | undefined) => firstWarningDays(rules, marketOfZone(zoneId ?? "")?.id ?? "SE"), [rules]);
}
