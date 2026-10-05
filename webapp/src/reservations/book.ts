export type Reservation = {
  id: string;
  pickupAt: string;
  driverId: string | null;
  policyVersion: string;
  status: "booked" | "cancelled";
};

export const GIVE_UP_MINUTES = 5;

export function minutesUntil(pickupAt: string, nowIso: string): number {
  return (Date.parse(pickupAt) - Date.parse(nowIso)) / 60000;
}

export function needsDriverSoon(reservation: Reservation, nowIso: string): boolean {
  return reservation.status === "booked" && !reservation.driverId && minutesUntil(reservation.pickupAt, nowIso) < 60;
}

export function assignReservation(reservation: Reservation, driverId: string): Reservation {
  return { ...reservation, driverId };
}

export function cancelReservation(reservation: Reservation): Reservation {
  return { ...reservation, status: "cancelled", driverId: reservation.driverId };
}
