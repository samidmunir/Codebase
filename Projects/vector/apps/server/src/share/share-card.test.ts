import { describe, expect, it } from 'vitest';
import { drawable } from './share-card';

describe('names on cards', () => {
  it('draws Western European names, and falls back to the handle for the rest', () => {
    expect(drawable('Sami Munir')).toBe(true);
    expect(drawable('José Núñez-O’Brien')).toBe(true);
    expect(drawable('Zoë Ørsted')).toBe(true);
    expect(drawable('Łukasz')).toBe(false);
    expect(drawable('山田太郎')).toBe(false);
    expect(drawable('Ace ✈️')).toBe(false);
  });
});
