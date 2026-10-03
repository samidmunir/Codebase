import { formatDuration, type FlightKind, type SimEngine } from '@vector/sim-core';
import { formatUtc } from './format';

export const FLIGHT_KIND_LABELS: Record<FlightKind, string> = {
  arrival: 'Arrivals',
  departure: 'Departures',
  transit: 'Overflights',
};

/** What a flight's target means, for its kind. */
const TARGET_VERB: Record<FlightKind, string> = {
  arrival: 'Land by',
  departure: 'Hand off by',
  transit: 'Hand off by',
};

/** Warn this long before a flight's target time. */
const DUE_SOON_SEC = 120;

export interface FlightTiming {
  kind: FlightKind;
  /** 'Land by 14:32Z'. */
  label: string;
  /** For lists: 'Land 14:32Z', 'H/O 14:32Z'. */
  shortLabel: string;
  /** Seconds to the target (negative once late). */
  remainingSec: number;
  /** '6:12 left', '3:05 late'. */
  status: string;
  tone: 'good' | 'caution' | 'late';
}

/** A flight's target time and how it stands, if it has one. */
export function flightTiming(
  engine: SimEngine,
  aircraftId: string,
  utcAtTick: (tick: number) => Date,
): FlightTiming | undefined {
  const timer = engine.flightTimer(aircraftId);
  if (!timer) return undefined;
  const remainingSec = (timer.targetTick - engine.tick) * engine.config.tickSeconds;
  const at = `${formatUtc(utcAtTick(timer.targetTick)).slice(0, 5)}Z`;
  return {
    kind: timer.kind,
    label: `${TARGET_VERB[timer.kind]} ${at}`,
    shortLabel: `${timer.kind === 'arrival' ? 'Land' : 'H/O'} ${at}`,
    remainingSec,
    status:
      remainingSec >= 0
        ? `${formatDuration(remainingSec)} left`
        : `${formatDuration(-remainingSec)} late`,
    tone: remainingSec < 0 ? 'late' : remainingSec <= DUE_SOON_SEC ? 'caution' : 'good',
  };
}

/** '+1:20' behind or '−2:05' ahead of target on average (true minus sign). */
export function formatVsTarget(seconds: number): string {
  return `${seconds > 0 ? '+' : seconds < 0 ? '−' : ''}${formatDuration(Math.abs(seconds))}`;
}
