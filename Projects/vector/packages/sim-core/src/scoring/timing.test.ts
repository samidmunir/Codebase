import { describe, expect, it } from 'vitest';
import { performance } from '../testing/fixtures';
import {
  arrivalFlightTimeSec,
  climbingFlightTimeSec,
  formatDuration,
  levelFlightTimeSec,
  timingRp,
} from './timing';

const a320 = performance.get('A320');
const SETTINGS = { onTimeRp: 20, lateRpPerMin: 5, lateMaxRp: 60 };

describe('flight time estimates', () => {
  it('estimates an arrival from FL300, 120 NM out, at about 20 minutes', () => {
    const seconds = arrivalFlightTimeSec(120, 30_000, 13, a320);
    expect(seconds / 60).toBeGreaterThan(17);
    expect(seconds / 60).toBeLessThan(24);
    // Farther, or starting lower (slower), takes longer.
    expect(arrivalFlightTimeSec(150, 30_000, 13, a320)).toBeGreaterThan(seconds);
    expect(arrivalFlightTimeSec(120, 8_000, 13, a320)).toBeGreaterThan(seconds);
  });

  it('gives a climbing departure at least the time to reach the handoff altitude', () => {
    const short = climbingFlightTimeSec(5, 1_500, 30_000, 18_000, a320);
    const climbOnly = climbingFlightTimeSec(5, 1_500, 30_000, 0, a320);
    expect(short).toBeGreaterThan(climbOnly);
    expect(short / 60).toBeGreaterThan(5); // 16,500 ft at a few thousand feet a minute
    expect(climbingFlightTimeSec(60, 1_500, 30_000, 18_000, a320) / 60).toBeLessThan(15);
  });

  it('times level flight at the true airspeed', () => {
    // 280 kt indicated at FL350 is about 500 kt true: 45 NM in about 5.4 minutes.
    expect(levelFlightTimeSec(45, 35_000, 280) / 60).toBeCloseTo(5.4, 1);
  });
});

describe('timing RP', () => {
  it('rewards on time, takes RP per minute late, and caps it', () => {
    expect(timingRp(600, 600, SETTINGS)).toEqual({ onTime: true, lateSec: 0, rp: 20 });
    expect(timingRp(601, 600, SETTINGS)).toMatchObject({ onTime: false, rp: -5 });
    expect(timingRp(600 + 150, 600, SETTINGS)).toMatchObject({ lateSec: 150, rp: -15 });
    expect(timingRp(600 + 3_600, 600, SETTINGS)).toMatchObject({ rp: -60 });
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3_725)).toBe('1:02:05');
  });
});
