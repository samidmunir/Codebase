import { normalizeHeading, toDegrees, toRadians } from './angles';

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
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial true bearing from `a` to `b`, in degrees [0, 360). */
export function bearingTrue(a: LatLon, b: LatLon): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLon = toRadians(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeHeading(toDegrees(Math.atan2(y, x)));
}

/** The point reached by travelling `distance` NM from `origin` on a true bearing. */
export function destinationPoint(origin: LatLon, bearingTrueDeg: number, distance: number): LatLon {
  const angular = distance / EARTH_RADIUS_NM;
  const bearing = toRadians(bearingTrueDeg);
  const lat1 = toRadians(origin.lat);
  const lon1 = toRadians(origin.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
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
