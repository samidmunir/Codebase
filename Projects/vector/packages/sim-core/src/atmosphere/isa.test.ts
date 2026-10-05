import { describe, expect, it } from 'vitest';
import { densityRatio, iasToTas, tasToIas } from './isa';

describe('ISA', () => {
  it('has a density ratio of 1 at sea level', () => {
    expect(densityRatio(0)).toBe(1);
  });

  it('matches the ISA density ratio at 10,000 ft (0.7385)', () => {
    expect(densityRatio(10_000)).toBeCloseTo(0.7385, 3);
  });

  it('gives about 291 kts TAS for 250 kts IAS at 10,000 ft', () => {
    expect(iasToTas(250, 10_000)).toBeCloseTo(290.9, 0);
  });

  it('is continuous at the tropopause', () => {
    expect(densityRatio(36_089.001)).toBeCloseTo(densityRatio(36_089), 6);
  });

  it('round-trips IAS and TAS', () => {
    expect(tasToIas(iasToTas(210, 17_000), 17_000)).toBeCloseTo(210, 9);
  });
});
