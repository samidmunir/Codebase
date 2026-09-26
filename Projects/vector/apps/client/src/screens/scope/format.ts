import type { LatLon } from '@vector/sim-core';

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
