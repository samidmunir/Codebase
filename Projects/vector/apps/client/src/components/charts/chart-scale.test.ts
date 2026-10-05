import { describe, expect, it } from 'vitest';
import { compact, labelledIndexes, niceTicks, shortDate } from './chart-scale';

describe('chart scales', () => {
  it('picks clean ticks that cover the data', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(1284)).toEqual([0, 500, 1000, 1500]);
    expect(niceTicks(0.9)).toEqual([0, 0.5, 1]);
  });

  it('writes numbers compactly', () => {
    expect(compact(1284)).toBe('1,284');
    expect(compact(12_900)).toBe('12.9K');
    expect(compact(4_200_000)).toBe('4.2M');
    expect(compact(2.25)).toBe('2.3');
  });

  it('labels a few dates, always the first and last', () => {
    expect(shortDate('2026-10-07')).toBe('Oct 7');
    const shown = [...labelledIndexes(30)].sort((a, b) => a - b);
    expect(shown[0]).toBe(0);
    expect(shown.at(-1)).toBe(29);
    expect(shown.length).toBeLessThanOrEqual(7);
    expect([...labelledIndexes(4)]).toEqual([0, 1, 2, 3]);
  });
});
