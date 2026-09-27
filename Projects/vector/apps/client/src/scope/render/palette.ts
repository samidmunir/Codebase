import type { UserSettings } from '@vector/shared';
import type { TrafficCategory } from '../traffic-category';

/** Data block text is a light tint of the target color, easier to read than the full color. */
const DATA_BLOCK_TINT = 0.6;

const trafficColors = (target: string) => ({ target, text: tint(target, DATA_BLOCK_TINT) });

/** Colors for the scope. User-adjustable colors come from display settings. */
export interface ScopePalette {
  mapLines: string;
  /** Target and data block colors for the player's traffic, by category. */
  traffic: Record<TrafficCategory, { target: string; text: string }>;
  unowned: string;
  unownedText: string;
  runway: string;
  airportLabel: string;
  classB: string;
  classC: string;
  airwayHigh: string;
  airwayLow: string;
  otherAirport: string;
  artccBoundary: string;
  tracon: string;
  mia: string;
  radarSite: string;
  radarPrimary: string;
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
    traffic: {
      arrival: trafficColors(settings['display.color.arrivals']),
      departure: trafficColors(settings['display.color.departures']),
      transit: trafficColors(settings['display.color.transits']),
    },
    unowned: '#58786c',
    unownedText: '#6f8f83',
    runway: '#d7ece2',
    airportLabel: '#9fc4b4',
    classB: '#4b4380',
    classC: '#5a3f6e',
    airwayHigh: 'rgba(90, 140, 200, 0.28)',
    airwayLow: 'rgba(110, 160, 140, 0.22)',
    otherAirport: '#5f7d72',
    artccBoundary: 'rgba(140, 150, 200, 0.45)',
    tracon: 'rgba(120, 220, 255, 0.55)',
    mia: 'rgba(190, 130, 90, 0.22)',
    radarSite: 'rgba(120, 200, 230, 0.35)',
    radarPrimary: 'rgba(76, 242, 160, 0.55)',
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

/** Mixes a '#rrggbb' color toward white by `amount` (0–1). */
export function tint(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(mix);
  return `#${[r, g, b].map((c) => c!.toString(16).padStart(2, '0')).join('')}`;
}
