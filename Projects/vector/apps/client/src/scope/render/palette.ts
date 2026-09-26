import type { UserSettings } from '@vector/shared';

/** Colors for the scope. User-adjustable colors come from display settings. */
export interface ScopePalette {
  mapLines: string;
  targets: string;
  dataBlocks: string;
  unowned: string;
  unownedText: string;
  runway: string;
  airportLabel: string;
  classB: string;
  boundary: string;
  rangeRing: string;
  finalCourse: string;
  mva: string;
  fix: string;
  vor: string;
  sweep: string;
  measure: string;
  hover: string;
  route: string;
  alert: string;
  caution: string;
}

export function scopePalette(settings: UserSettings): ScopePalette {
  return {
    mapLines: settings['display.color.mapLines'],
    targets: settings['display.color.targets'],
    dataBlocks: settings['display.color.dataBlocks'],
    unowned: '#58786c',
    unownedText: '#6f8f83',
    runway: '#d7ece2',
    airportLabel: '#9fc4b4',
    classB: '#4b4380',
    boundary: '#2f4f9e',
    rangeRing: 'rgba(120, 190, 160, 0.10)',
    finalCourse: 'rgba(120, 200, 170, 0.35)',
    mva: 'rgba(214, 160, 70, 0.30)',
    fix: '#4f6b62',
    vor: '#4d8fb3',
    sweep: '76, 242, 160',
    measure: '#ffd27a',
    hover: '#ffffff',
    route: '#5ac8ff',
    alert: '#ff4d57',
    caution: '#ffb547',
  };
}

/** '#rrggbb' -> 'rgba(r, g, b, alpha)' */
export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
