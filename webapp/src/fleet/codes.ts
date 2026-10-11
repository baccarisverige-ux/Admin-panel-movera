import { marketOfZone } from "../markets/markets.ts";

/** Short code a driver can read out on the phone: MV, country, four digits (MV-SE-0002). */
export function driverCode(driver: { id: string; zoneId: string }): string {
  const country = marketOfZone(driver.zoneId)?.id ?? "SE";
  const digits = driver.id.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `MV-${country}-${digits}`;
}

/** Fleet owner code: FO, country, two digits (FO-SE-01). */
export function ownerCode(owner: { id: string; zoneId: string }): string {
  const country = marketOfZone(owner.zoneId)?.id ?? "SE";
  return `FO-${country}-${owner.id.replace(/\D/g, "").padStart(2, "0")}`;
}
