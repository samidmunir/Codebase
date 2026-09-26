import { describe, expect, it } from 'vitest';
import { formatPosition, formatUtc } from './format';

describe('scope formatting', () => {
  it('formats UTC time', () => {
    expect(formatUtc(new Date('2026-09-26T14:03:09Z'))).toBe('14:03:09');
  });

  it('formats positions in degrees and decimal minutes', () => {
    expect(formatPosition({ lat: 40.6398, lon: -73.7789 })).toBe("N40°38.39' W073°46.73'");
    expect(formatPosition({ lat: -33.5, lon: 151.05 })).toBe("S33°30.00' E151°03.00'");
  });
});
