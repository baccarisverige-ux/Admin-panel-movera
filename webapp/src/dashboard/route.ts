/** Demo trip geometry: pickup, drop-off and a road-like curved path between them, per driver. */

export type LatLng = [lat: number, lng: number];

export type TripRoute = {
  pickup: LatLng;
  dropoff: LatLng;
  /** Pickup to drop-off. */
  path: LatLng[];
  /** Where the driver starts when heading to the pickup, to the pickup. */
  approach: LatLng[];
};

const STEPS = 28;

function polar(center: LatLng, distanceDeg: number, angleRad: number): LatLng {
  return [center[0] + Math.sin(angleRad) * distanceDeg, center[1] + (Math.cos(angleRad) * distanceDeg) / Math.cos((center[0] * Math.PI) / 180)];
}

/** A gentle S-curve with small kinks so the line reads as streets rather than a ruler. */
function curve(from: LatLng, to: LatLng, seed: number): LatLng[] {
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  const bend = 0.18 + (seed % 20) / 100;
  const sign = seed % 2 ? 1 : -1;
  const points: LatLng[] = [];
  for (let step = 0; step <= STEPS; step += 1) {
    const t = step / STEPS;
    const wave = Math.sin(t * Math.PI) * bend * sign + Math.sin(t * Math.PI * 3) * 0.04;
    const kink = step % 4 === 0 ? 0 : ((seed >>> step) % 3 - 1) * 0.00025;
    points.push([from[0] + dLat * t - dLng * wave * 0.5 + kink, from[1] + dLng * t + dLat * wave * 0.5 - kink]);
  }
  return points;
}

export function tripRoute(center: LatLng, seed: number, airport: boolean): TripRoute {
  const spread = airport ? 0.01 : 0.016;
  const heading = ((seed % 360) * Math.PI) / 180;
  const pickup = polar(center, spread * (0.3 + (seed % 40) / 100), heading);
  const dropoff = polar(center, spread * (1.2 + ((seed >>> 7) % 60) / 100), heading + Math.PI + (((seed >>> 3) % 70) - 35) * (Math.PI / 180));
  const start = polar(pickup, 0.008 + ((seed >>> 5) % 30) / 4000, heading + Math.PI / 2);
  return { pickup, dropoff, path: curve(pickup, dropoff, seed), approach: curve(start, pickup, seed >>> 4) };
}

/** Point a fraction of the way along a path, and the index of the segment it sits on. */
export function along(path: readonly LatLng[], fraction: number): { point: LatLng; index: number } {
  const clamped = Math.max(0, Math.min(1, fraction));
  const exact = clamped * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(exact));
  const t = exact - index;
  const a = path[index];
  const b = path[index + 1];
  return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], index };
}

export function lengthKm(path: readonly LatLng[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const [lat1, lng1] = path[index - 1];
    const [lat2, lng2] = path[index];
    const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    const y = lat2 - lat1;
    total += Math.sqrt(x * x + y * y) * 111.32;
  }
  return total * 1.18;
}
