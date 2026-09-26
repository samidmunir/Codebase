import { describe, expect, it } from 'vitest';
import { SeededRandom, seedFromString } from './seeded-random';

const sample = (rng: SeededRandom, count: number) =>
  Array.from({ length: count }, () => rng.next());

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sample(new SeededRandom(42), 20)).toEqual(sample(new SeededRandom(42), 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(sample(new SeededRandom(1), 5)).not.toEqual(sample(new SeededRandom(2), 5));
  });

  it('continues identically after restoring its state', () => {
    const original = new SeededRandom(1234);
    sample(original, 50);
    const restored = SeededRandom.fromState(original.getState());

    expect(sample(restored, 20)).toEqual(sample(original, 20));
  });

  it('keeps values in range', () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);

      const integer = rng.int(3, 5);
      expect([3, 4, 5]).toContain(integer);
    }
  });

  it('covers the full integer range', () => {
    const rng = new SeededRandom(99);
    const seen = new Set(Array.from({ length: 1_000 }, () => rng.int(1, 6)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('refuses to pick from an empty list', () => {
    expect(() => new SeededRandom(1).pick([])).toThrow();
  });
});

describe('seedFromString', () => {
  it('is stable and distinguishes inputs', () => {
    expect(seedFromString('new-york')).toBe(seedFromString('new-york'));
    expect(seedFromString('new-york')).not.toBe(seedFromString('new-yorK'));
  });
});
