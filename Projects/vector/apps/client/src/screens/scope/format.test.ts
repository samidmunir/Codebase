import { describe, expect, it } from 'vitest';
import { formatAltitudeLabel, formatPosition, formatUtc } from './format';

describe('scope formatting', () => {
  it('formats UTC time', () => {
    expect(formatUtc(new Date('2026-09-26T14:03:09Z'))).toBe('14:03:09');
  });

  it('formats positions in degrees and decimal minutes', () => {
    expect(formatPosition({ lat: 40.6398, lon: -73.7789 })).toBe("N40°38.39' W073°46.73'");
    expect(formatPosition({ lat: -33.5, lon: 151.05 })).toBe("S33°30.00' E151°03.00'");
  });
});

describe('formatAltitudeLabel', () => {
  it('uses flight levels at and above the transition altitude', () => {
    expect(formatAltitudeLabel(13_000)).toBe('13,000');
    expect(formatAltitudeLabel(17_900)).toBe('17,900');
    expect(formatAltitudeLabel(18_000)).toBe('FL180');
    expect(formatAltitudeLabel(35_040)).toBe('FL350');
    expect(formatAltitudeLabel(5_000, 6_000)).toBe('5,000');
  });
});
