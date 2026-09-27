import type { ScoreKind } from '@vector/sim-core';

export const SCORE_KIND_LABELS: Record<ScoreKind, string> = {
  landing: 'Landings',
  departureHandoff: 'Departures handed off',
  transitHandoff: 'Overflights handed off',
  separationLoss: 'Losses of separation',
  wakeLoss: 'Wake spacing lost',
  nearMidAir: 'Near midair collisions',
  goAround: 'Go-arounds',
  leftWithoutHandoff: 'Left without a handoff',
};

/** Earning kinds first, then penalties, for the breakdown. */
export const SCORE_KIND_ORDER: ScoreKind[] = [
  'landing',
  'departureHandoff',
  'transitHandoff',
  'goAround',
  'leftWithoutHandoff',
  'separationLoss',
  'wakeLoss',
  'nearMidAir',
];

/** '+100 RP', '−225 RP' (true minus sign), '1,240 RP'. */
export function formatRp(rp: number, signed = false): string {
  const magnitude = Math.abs(rp).toLocaleString('en-US');
  const sign = rp < 0 ? '−' : signed && rp > 0 ? '+' : '';
  return `${sign}${magnitude} RP`;
}
