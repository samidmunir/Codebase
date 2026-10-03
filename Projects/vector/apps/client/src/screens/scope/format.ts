import type { LatLon, Wind } from '@vector/sim-core';

/** '14:32:07' */
export function formatUtc(time: Date): string {
  return time.toISOString().slice(11, 19);
}

/** Degrees and decimal minutes, as on aviation charts: "N40°38.39' W073°46.73'" */
export function formatPosition({ lat, lon }: LatLon): string {
  const part = (value: number, positive: string, negative: string, width: number) => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    return `${value >= 0 ? positive : negative}${String(degrees).padStart(width, '0')}°${minutes.toFixed(2).padStart(5, '0')}'`;
  };
  return `${part(lat, 'N', 'S', 2)} ${part(lon, 'E', 'W', 3)}`;
}

/** An altitude as controllers write it: 'FL240' at and above the transition altitude, else '13,000'. */
export function formatAltitudeLabel(altitudeFt: number, transitionAltitudeFt = 18_000): string {
  const rounded = Math.round(altitudeFt / 100) * 100;
  return rounded >= transitionAltitudeFt
    ? `FL${String(rounded / 100).padStart(3, '0')}`
    : rounded.toLocaleString('en-US');
}

/** '220° 12 kt', '220° 14G26 kt', or 'Calm'. */
export const formatWind = (wind: Wind) =>
  wind.directionDeg === 0 || wind.speedKts <= 2
    ? 'Calm'
    : `${String(wind.directionDeg).padStart(3, '0')}° ${wind.speedKts}${wind.gustKts !== undefined ? `G${wind.gustKts}` : ''} kt`;
