import { describe, expect, it } from 'vitest';
import { blockRect, placeDataBlocks, type BlockRequest } from './label-placement';

const block = (id: string, x: number, y: number, priority = 1): BlockRequest => ({
  id,
  x,
  y,
  width: 80,
  height: 45,
  priority,
});

const overlaps = (a: ReturnType<typeof blockRect>, b: ReturnType<typeof blockRect>) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('data block placement', () => {
  it('uses the default northeast spot when nothing is in the way', () => {
    expect(placeDataBlocks([block('a', 500, 500)], 20, new Map()).get('a')).toBe(1);
  });

  it('moves the less important of two close aircraft so their blocks do not overlap', () => {
    const previous = new Map();
    const requests = [block('mine', 500, 500, 2), block('other', 520, 505, 1)];
    const chosen = placeDataBlocks(requests, 20, previous);
    expect(chosen.get('mine')).toBe(1);
    const a = blockRect(500, 500, chosen.get('mine')!, 20, 80, 45);
    const b = blockRect(520, 505, chosen.get('other')!, 20, 80, 45);
    expect(overlaps(a, b)).toBe(false);
  });

  it('never moves a block the player placed', () => {
    const chosen = placeDataBlocks(
      [block('mine', 500, 500, 2), { ...block('fixed', 520, 505, 1), fixed: 1 }],
      20,
      new Map(),
    );
    expect(chosen.get('fixed')).toBe(1);
  });

  it('keeps a clear previous direction instead of flipping back', () => {
    const previous = new Map([['a', 5 as const]]);
    expect(placeDataBlocks([block('a', 500, 500)], 20, previous).get('a')).toBe(5);
  });
});
