import { describe, expect, it } from 'vitest';
import { machToIas, speedOfSoundKts } from '../atmosphere/isa';
import { SeededRandom } from '../random/seeded-random';
import { isHemisphericLevel, requestedCruiseAltitude } from './cruise-levels';

describe('cruise levels', () => {
  it('follows the hemispheric rule', () => {
    expect(isHemisphericLevel(35_000, 90)).toBe(true); // eastbound, odd
    expect(isHemisphericLevel(36_000, 90)).toBe(false);
    expect(isHemisphericLevel(36_000, 270)).toBe(true); // westbound, even
    expect(isHemisphericLevel(17_000, 0)).toBe(true);
  });

  it('picks levels that suit the trip length and direction', () => {
    const random = new SeededRandom(4);
    for (let i = 0; i < 50; i++) {
      const shortHop = requestedCruiseAltitude(random, 160, 45, 41_000); // JFK–BOS
      expect(shortHop).toBeGreaterThanOrEqual(23_000);
      expect(shortHop).toBeLessThanOrEqual(32_000);
      expect(isHemisphericLevel(shortHop, 45)).toBe(true);

      const longHaul = requestedCruiseAltitude(random, 2_150, 280, 43_000); // JFK–LAX
      expect(longHaul).toBeGreaterThanOrEqual(34_000);
      expect(longHaul).toBeLessThanOrEqual(40_000);
      expect(isHemisphericLevel(longHaul, 280)).toBe(true);
    }
  });

  it('stays below the aircraft ceiling', () => {
    const random = new SeededRandom(9);
    for (let i = 0; i < 30; i++) {
      expect(requestedCruiseAltitude(random, 3_000, 90, 39_000)).toBeLessThanOrEqual(37_000);
    }
  });

  it('converts Mach to indicated airspeed', () => {
    expect(speedOfSoundKts(0)).toBeCloseTo(661.5, 0);
    expect(speedOfSoundKts(40_000)).toBeCloseTo(573.6, 0);
    // M0.78 at FL350 is about 265 KIAS (within the simple density model's error).
    expect(machToIas(0.78, 35_000)).toBeGreaterThan(250);
    expect(machToIas(0.78, 35_000)).toBeLessThan(280);
  });
});
