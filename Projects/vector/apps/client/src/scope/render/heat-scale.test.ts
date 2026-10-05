import { describe, expect, it } from 'vitest';
import { HEAT_AGE_RANGE_SEC, HEAT_FADE_SHARE, heatColor, heatFade, heatValue } from './heat-scale';

describe('heat scale', () => {
  it('maps age, altitude and speed from cool to hot', () => {
    const point = { ageSec: 0, altitudeFt: 20_000, groundSpeedKts: 325 };
    expect(heatValue('age', point)).toBe(1);
    expect(heatValue('age', { ...point, ageSec: HEAT_AGE_RANGE_SEC * 2 })).toBe(0);
    expect(heatValue('altitude', point)).toBeCloseTo(0.5);
    expect(heatValue('altitude', { ...point, altitudeFt: 45_000 })).toBe(0);
    expect(heatValue('speed', point)).toBeCloseTo(0.5);
  });

  it('runs from blue to red', () => {
    expect(heatColor(0)).toBe('rgb(59, 76, 192)');
    expect(heatColor(1)).toBe('rgb(255, 77, 61)');
    expect(heatColor(0.5)).toBe('rgb(89, 217, 142)');
    expect(heatColor(-1)).toBe(heatColor(0));
  });

  it('fades the oldest part of a limited trail', () => {
    expect(heatFade(60, 600)).toBe(1);
    expect(heatFade(600, 600)).toBe(0);
    expect(heatFade(900, 600)).toBe(0);
    const midFade = heatFade(600 * (1 - HEAT_FADE_SHARE / 2), 600);
    expect(midFade).toBeCloseTo(0.5);
    // Whole path: never fades.
    expect(heatFade(10_000, 0)).toBe(1);
  });
});
