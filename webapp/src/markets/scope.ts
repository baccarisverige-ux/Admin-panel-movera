import { DEFAULT_MARKET, MARKETS, isMarketId, marketOfZone, marketZoneIds, parseZoneList, type MarketId } from "./markets.ts";

/** The part of an agent's access that decides which countries and zones they can open. */
export type ScopeAccess = {
  zones: "all" | readonly string[];
  countries?: readonly MarketId[];
};

export function countryAllowed(access: ScopeAccess, id: MarketId): boolean {
  if (access.countries && !access.countries.includes(id)) return false;
  if (access.zones === "all") return true;
  const zones = new Set(marketZoneIds(id));
  return access.zones.some((zone) => zones.has(zone));
}

export function zoneAllowed(access: ScopeAccess, zoneId: string): boolean {
  const owner = marketOfZone(zoneId);
  if (access.countries && (!owner || !access.countries.includes(owner.id))) return false;
  return access.zones === "all" || access.zones.includes(zoneId);
}

export function allowedCountries(access: ScopeAccess): MarketId[] {
  return MARKETS.map((item) => item.id).filter((id) => countryAllowed(access, id));
}

export type ResolvedScope = {
  country: MarketId;
  /** Zones picked in the top bar; empty means every allowed zone in the country. */
  zones: string[];
  /** What the API should filter by. */
  effective: string | string[];
  denied: boolean;
};

/**
 * Turn the URL (`country`, `scope`) and the remembered country into what every screen reads.
 * Zones in the URL decide the country when they name one; otherwise the URL country, then the
 * remembered one, then the first country the agent may open.
 */
export function resolveScope(access: ScopeAccess, input: { country?: string | null; scope?: string | null; remembered?: string | null }): ResolvedScope {
  const allowed = allowedCountries(access);
  const fallback = allowed[0] ?? DEFAULT_MARKET;
  const zones = parseZoneList(input.scope);
  const fromZones = zones.map((zone) => marketOfZone(zone)?.id).find(isMarketId);
  const pick = (value: string | null | undefined) => (isMarketId(value) && allowed.includes(value) ? value : null);
  const country = fromZones ?? pick(input.country) ?? pick(input.remembered) ?? fallback;
  if (zones.length) {
    const denied = zones.some((zone) => !zoneAllowed(access, zone) || marketOfZone(zone)?.id !== country);
    if (denied) return { country, zones, effective: ["__scope-denied__"], denied: true };
    return { country, zones, effective: zones.length === 1 ? zones[0] : zones, denied: false };
  }
  if (!allowed.includes(country)) return { country, zones: [], effective: ["__scope-denied__"], denied: true };
  const effective = marketZoneIds(country).filter((zone) => zoneAllowed(access, zone));
  return { country, zones: [], effective, denied: false };
}
