import { describe, expect, it } from 'vitest';
import { bearingTrue, distanceNm } from '../math/geo';
import { JFK, newAircraft, performance } from '../testing/fixtures';
import type { AircraftState, AircraftTargets } from './aircraft';
import {
  DEFAULT_FLIGHT_MODEL_CONFIG as config,
  stepAircraft,
  turnRateDegPerSec,
} from './flight-model';

function makeAircraft(
  overrides: Partial<Omit<AircraftState, 'targets'>> = {},
  targets: Partial<AircraftTargets> = {},
): AircraftState {
  const base = { ...newAircraft(), id: 'AC1', verticalSpeedFpm: 0, ...overrides };
  return {
    ...base,
    targets: {
      altitudeFt: base.altitudeFt,
      headingDeg: base.headingDeg % 360,
      turnDirection: 'shortest',
      iasKts: base.iasKts,
      ...targets,
    },
  } as AircraftState;
}

const a320 = performance.get('A320');

/** Steps until `done` is true, returning the number of 1-second steps taken. */
function stepUntil(aircraft: AircraftState, done: () => boolean, variation = 0, limit = 3_600) {
  for (let seconds = 1; seconds <= limit; seconds++) {
    stepAircraft(aircraft, a320, 1, variation, config);
    if (done()) return seconds;
  }
  throw new Error('Condition never met');
}

describe('turnRateDegPerSec', () => {
  it('uses standard rate (3°/s) at approach speeds', () => {
    expect(turnRateDegPerSec(150, config)).toBe(3);
  });

  it('is limited by the 25° bank angle at higher speeds', () => {
    expect(turnRateDegPerSec(250, config)).toBeCloseTo(2.04, 2);
    expect(turnRateDegPerSec(450, config)).toBeCloseTo(1.13, 2);
  });
});

describe('heading', () => {
  it('turns 90° in 30 seconds at standard rate', () => {
    const aircraft = makeAircraft(
      { altitudeFt: 0, iasKts: 150, headingDeg: 0 },
      { headingDeg: 90 },
    );

    expect(stepUntil(aircraft, () => aircraft.headingDeg === 90)).toBe(30);
  });

  it('takes the long way round when told to turn left', () => {
    const aircraft = makeAircraft(
      { altitudeFt: 0, iasKts: 150, headingDeg: 0 },
      { headingDeg: 90, turnDirection: 'left' },
    );
    for (let i = 0; i < 10; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.headingDeg).toBe(330);
  });

  it('resets the turn direction once on heading', () => {
    const aircraft = makeAircraft(
      { altitudeFt: 0, iasKts: 150, headingDeg: 0 },
      { headingDeg: 10, turnDirection: 'right' },
    );
    stepUntil(aircraft, () => aircraft.headingDeg === 10);

    expect(aircraft.targets.turnDirection).toBe('shortest');
  });
});

describe('speed', () => {
  it('holds 250 kts below 10,000 ft even when assigned more', () => {
    const aircraft = makeAircraft({ altitudeFt: 8_000, iasKts: 220 }, { iasKts: 300 });
    for (let i = 0; i < 120; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.iasKts).toBe(250);
  });

  it('allows more than 250 kts above 10,000 ft', () => {
    const aircraft = makeAircraft({ altitudeFt: 14_000, iasKts: 250 }, { iasKts: 300 });
    for (let i = 0; i < 120; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.iasKts).toBe(300);
  });

  it('accelerates at the type rate', () => {
    const aircraft = makeAircraft({ altitudeFt: 5_000, iasKts: 200 }, { iasKts: 250 });
    stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.iasKts).toBeCloseTo(200 + a320.accelerationKtPerSec);
  });

  it('never flies slower than final approach speed', () => {
    const aircraft = makeAircraft({ altitudeFt: 3_000, iasKts: 160 }, { iasKts: 100 });
    for (let i = 0; i < 120; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.iasKts).toBe(a320.speeds.final);
  });
});

describe('altitude', () => {
  it('climbs to and levels at the assigned altitude without overshooting', () => {
    const aircraft = makeAircraft({ altitudeFt: 5_000 }, { altitudeFt: 10_000 });
    let highest = aircraft.altitudeFt;
    const seconds = stepUntil(aircraft, () => {
      highest = Math.max(highest, aircraft.altitudeFt);
      return aircraft.altitudeFt === 10_000;
    });

    expect(highest).toBe(10_000);
    expect(aircraft.verticalSpeedFpm).toBe(0);
    // ~2,600 fpm with a level-off: a bit over two minutes.
    expect(seconds).toBeGreaterThan(110);
    expect(seconds).toBeLessThan(160);
  });

  it('reduces vertical speed approaching the level-off altitude', () => {
    const aircraft = makeAircraft({ altitudeFt: 9_000 }, { altitudeFt: 5_000 });
    stepAircraft(aircraft, a320, 1, 0, config);
    const earlyRate = Math.abs(aircraft.verticalSpeedFpm);
    stepUntil(aircraft, () => aircraft.altitudeFt <= 5_300);
    stepAircraft(aircraft, a320, 1, 0, config);

    expect(Math.abs(aircraft.verticalSpeedFpm)).toBeLessThan(earlyRate);
    expect(Math.abs(aircraft.verticalSpeedFpm)).toBeLessThanOrEqual(1_000);
  });

  it('does not climb above the service ceiling', () => {
    const aircraft = makeAircraft({ altitudeFt: 35_000, iasKts: 280 }, { altitudeFt: 50_000 });
    for (let i = 0; i < 1_200; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(aircraft.altitudeFt).toBe(a320.ceilingFt);
  });
});

describe('position', () => {
  it('covers 4 NM in one minute at 240 kts at sea level', () => {
    const aircraft = makeAircraft({ altitudeFt: 0, iasKts: 240, headingDeg: 0 });
    const start = aircraft.position;
    for (let i = 0; i < 60; i++) stepAircraft(aircraft, a320, 1, 0, config);

    expect(distanceNm(start, aircraft.position)).toBeCloseTo(4, 6);
    expect(bearingTrue(start, aircraft.position)).toBeCloseTo(0, 6);
  });

  it('flies a magnetic heading, corrected for variation', () => {
    const aircraft = makeAircraft({ altitudeFt: 0, iasKts: 240, headingDeg: 0 });
    const start = aircraft.position;
    for (let i = 0; i < 60; i++) stepAircraft(aircraft, a320, 1, -13, config);

    // Constant heading is a rhumb line, so the great-circle bearing differs very slightly.
    expect(bearingTrue(start, aircraft.position)).toBeCloseTo(347, 1);
  });

  it('moves faster over the ground at altitude for the same indicated speed', () => {
    const low = makeAircraft({ altitudeFt: 0, iasKts: 250 });
    const high = makeAircraft({ altitudeFt: 20_000, iasKts: 250 });
    for (let i = 0; i < 60; i++) {
      stepAircraft(low, a320, 1, 0, config);
      stepAircraft(high, a320, 1, 0, config);
    }

    expect(distanceNm(JFK, high.position)).toBeGreaterThan(distanceNm(JFK, low.position) * 1.3);
  });
});
