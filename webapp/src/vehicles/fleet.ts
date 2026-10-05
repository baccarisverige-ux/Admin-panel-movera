import { vehicleBlock, type Vehicle } from "../drivers/gate.ts";

export type FleetCar = Vehicle & { id: string; plate: string; driverName: string };

export function fleetStatus(car: FleetCar): { eligible: boolean; reason: string | null } {
  const reason = vehicleBlock(car);
  return { eligible: reason === null, reason };
}
