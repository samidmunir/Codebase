import type { CareerTotals, ResultSummary, SessionDifficulty, Verification } from '@vector/shared';
import { findAirspace } from '../../airspaces/registry';
import { DIFFICULTY_LABELS } from '../../settings/difficulty';

// Wording for profiles and session results.

export const difficultyLabel = (difficulty: SessionDifficulty | null) =>
  difficulty === null ? '' : difficulty === 'custom' ? 'Custom' : DIFFICULTY_LABELS[difficulty];

export const airspaceLabel = (id: string) => {
  const entry = findAirspace(id);
  return entry ? `${entry.facility} ${entry.name}` : id;
};

/** '3 h 20 min', '45 min'. */
export function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

export const VERIFICATION: Record<Verification, { label: string; tone?: string; title: string }> = {
  pending: {
    label: 'Checking',
    title: 'The server will replay this session to verify its score.',
  },
  verified: {
    label: 'Verified',
    tone: 'ok',
    title: 'The server replayed this session and got the same score.',
  },
  mismatch: {
    label: 'Not verified',
    tone: 'alert',
    title: 'Replaying this session gave a different score, so it doesn’t count for records.',
  },
  unverifiable: {
    label: 'Unverified',
    title: 'Played before sessions could be replayed, or on an older version of Vector.',
  },
};

/** Flights finished: landed, and departures and overflights handed off. */
export const flightsOf = (stats: ResultSummary['stats']) =>
  stats.arrivals + stats.departures + stats.overflights;

/** Losses of separation per 100 flights, or undefined with no flights yet. */
export function lossesPer100(totals: Pick<CareerTotals, 'stats'>): number | undefined {
  const flights = flightsOf(totals.stats);
  if (flights === 0) return undefined;
  return ((totals.stats.separationLosses + totals.stats.nearMidAirs) / flights) * 100;
}

export function onTimeRate(stats: ResultSummary['stats']): number | undefined {
  return stats.timed > 0 ? Math.round((stats.onTime / stats.timed) * 100) : undefined;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
