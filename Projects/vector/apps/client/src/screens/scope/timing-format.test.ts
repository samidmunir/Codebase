import type { SimEngine } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { flightTiming, formatVsTarget } from './timing-format';

const engineAt = (tick: number, timer: { kind: 'arrival' | 'departure'; targetTick: number }) =>
  ({
    tick,
    config: { tickSeconds: 1 },
    flightTimer: () => ({ ...timer, startTick: 0 }),
  }) as unknown as SimEngine;
const utc = (tick: number) => new Date(Date.UTC(2026, 8, 30, 14, 0, tick));

describe('flight timing', () => {
  it('shows the target clock time and the time left, warning when it is close', () => {
    expect(
      flightTiming(engineAt(0, { kind: 'arrival', targetTick: 1_920 }), 'A', utc),
    ).toMatchObject({
      label: 'Land by 14:32Z',
      shortLabel: 'Land 14:32Z',
      status: '32:00 left',
      tone: 'good',
    });
    expect(
      flightTiming(engineAt(1_860, { kind: 'departure', targetTick: 1_920 }), 'A', utc),
    ).toMatchObject({ label: 'Hand off by 14:32Z', status: '1:00 left', tone: 'caution' });
    expect(
      flightTiming(engineAt(2_105, { kind: 'arrival', targetTick: 1_920 }), 'A', utc),
    ).toMatchObject({ status: '3:05 late', tone: 'late' });
  });

  it('formats the average against the target', () => {
    expect(formatVsTarget(-239)).toBe('−3:59');
    expect(formatVsTarget(80)).toBe('+1:20');
    expect(formatVsTarget(0)).toBe('0:00');
  });
});
