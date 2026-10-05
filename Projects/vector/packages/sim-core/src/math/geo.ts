import { normalizeHeading, toDegrees, toRadians } from './angles';
import * as dmath from './dmath';

/** Mean Earth radius in nautical miles. */
export const EARTH_RADIUS_NM = 3440.065;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance between two points, in nautical miles (haversine). */
export function distanceNm(a: LatLon, b: LatLon): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b.lon - a.lon);
  const h =
    dmath.sin(dLat / 2) * dmath.sin(dLat / 2) +
    dmath.cos(lat1) * dmath.cos(lat2) * dmath.sin(dLon / 2) * dmath.sin(dLon / 2);
  return 2 * EARTH_RADIUS_NM * dmath.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial true bearing from `a` to `b`, in degrees [0, 360). */
export function bearingTrue(a: LatLon, b: LatLon): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLon = toRadians(b.lon - a.lon);
  const y = dmath.sin(dLon) * dmath.cos(lat2);
  const x = dmath.cos(lat1) * dmath.sin(lat2) - dmath.sin(lat1) * dmath.cos(lat2) * dmath.cos(dLon);
  return normalizeHeading(toDegrees(dmath.atan2(y, x)));
}

/** The point reached by travelling `distance` NM from `origin` on a true bearing. */
export function destinationPoint(origin: LatLon, bearingTrueDeg: number, distance: number): LatLon {
  const angular = distance / EARTH_RADIUS_NM;
  const bearing = toRadians(bearingTrueDeg);
  const lat1 = toRadians(origin.lat);
  const lon1 = toRadians(origin.lon);

  const lat2 = dmath.asin(
    dmath.sin(lat1) * dmath.cos(angular) +
      dmath.cos(lat1) * dmath.sin(angular) * dmath.cos(bearing),
  );
  const lon2 =
    lon1 +
    dmath.atan2(
      dmath.sin(bearing) * dmath.sin(angular) * dmath.cos(lat1),
      dmath.cos(angular) - dmath.sin(lat1) * dmath.sin(lat2),
    );

  return { lat: toDegrees(lat2), lon: normalizeLongitude(toDegrees(lon2)) };
}

/** Normalizes a longitude to [-180, 180). */
export function normalizeLongitude(lon: number): number {
  return normalizeHeading(lon + 180) - 180;
}

/**
 * Magnetic variation convention: east is positive, west is negative
 * (New York is roughly 13° west, i.e. -13).
 */
export function magneticToTrue(magneticDeg: number, variationDeg: number): number {
  return normalizeHeading(magneticDeg + variationDeg);
}

export function trueToMagnetic(trueDeg: number, variationDeg: number): number {
  return normalizeHeading(trueDeg - variationDeg);
}
