import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AircraftState } from '../aircraft/aircraft';
import { requiredLateralNm } from './separation';
import type { SimEvent } from '../engine/events';
import { SimEngine } from '../engine/sim-engine';
import { destinationPoint } from '../math/geo';
import { NEW_YORK_WORLD, newAircraft, performance } from '../testing/fixtures';

const CENTER = { lat: 40.4, lon: -73.3 };

function createEngine(overrides: Partial<SessionSettings> = {}) {
  return SimEngine.create({
    performance,
    world: NEW_YORK_WORLD,
    seed: 1,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: { ...defaultSettings('session'), ...overrides },
  });
}

/** Two aircraft on reciprocal headings, `apartNm` apart on an east-west line. */
function headOn(
  engine: SimEngine,
  apartNm: number,
  altitudes: [number, number] = [8_000, 8_000],
  owners: [string, string] = ['N90', 'N90'],
) {
  // Magnetic headings 103/283 are true 090/270 with 13° west variation.
  const west = engine.addAircraft(
    newAircraft({
      callsign: 'JBU1',
      position: destinationPoint(CENTER, 270, apartNm / 2),
      headingDeg: 103,
      altitudeFt: altitudes[0],
      iasKts: 250,
      owner: owners[0],
    }),
  );
  const east = engine.addAircraft(
    newAircraft({
      callsign: 'DAL2',
      position: destinationPoint(CENTER, 90, apartNm / 2),
      headingDeg: 283,
      altitudeFt: altitudes[1],
      iasKts: 250,
      owner: owners[1],
    }),
  );
  return [west, east] as const;
}

describe('separation', () => {
  it('predicts a conflict, then logs the loss of separation with the closest approach', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    headOn(engine, 12);

    // Closing at ~570 kt: the 40 s look-ahead sees the conflict before separation is lost.
    const kinds: string[] = [];
    for (let i = 0; i < 100; i++) {
      engine.step();
      const kind = engine.conflicts[0]?.kind;
      if (kind && kinds.at(-1) !== kind) kinds.push(kind);
    }
    expect(kinds.slice(0, 2)).toEqual(['predicted', 'loss']);
    expect(events.some((e) => e.type === 'separationLost')).toBe(true);
    const [violation] = engine.violations;
    expect(violation).toMatchObject({
      callsigns: ['JBU1', 'DAL2'],
      requiredLateralNm: 3,
      requiredVerticalFt: 1_000,
    });
    expect(violation!.closestLateralNm).toBeLessThan(1);
    expect(violation!.closestVerticalFt).toBe(0);
  });

  it('ends the violation once separation is restored', () => {
    const engine = createEngine();
    headOn(engine, 12);
    for (let i = 0; i < 200; i++) engine.step();
    expect(engine.violations).toHaveLength(1);
    expect(engine.violations[0]!.endTick).toBeDefined();
    expect(engine.conflicts).toHaveLength(0);
  });

  it('treats 1,000 ft of vertical separation as separated', () => {
    const engine = createEngine();
    headOn(engine, 12, [8_000, 9_000]);
    for (let i = 0; i < 200; i++) engine.step();
    expect(engine.violations).toHaveLength(0);
  });

  it('follows the separation minima settings', () => {
    const engine = createEngine({ 'separation.verticalFt': 2_000 });
    headOn(engine, 12, [8_000, 9_000]);
    for (let i = 0; i < 200; i++) engine.step();
    expect(engine.violations).toHaveLength(1);
  });

  it("ignores pairs that don't involve the player's traffic", () => {
    const engine = createEngine();
    headOn(engine, 12, [8_000, 8_000], ['ZNY', 'KJFK_TWR']);
    for (let i = 0; i < 200; i++) engine.step();
    expect(engine.violations).toHaveLength(0);
  });

  it('uses no prediction when the look-ahead is zero', () => {
    const engine = createEngine({ 'separation.conflictAlertLookaheadSec': 0 });
    headOn(engine, 12);
    engine.step();
    expect(engine.conflicts).toHaveLength(0);
  });

  it('saves conflicts and violations with the session', () => {
    const continuous = createEngine();
    headOn(continuous, 12);
    for (let i = 0; i < 120; i++) continuous.step();

    const first = createEngine();
    headOn(first, 12);
    for (let i = 0; i < 20; i++) first.step();
    const resumed = SimEngine.fromSnapshot(
      JSON.parse(JSON.stringify(first.toSnapshot())) as unknown,
      performance,
    );
    for (let i = 0; i < 100; i++) resumed.step();

    expect(resumed.toSnapshot()).toEqual(continuous.toSnapshot());
    expect(resumed.violations).toHaveLength(1);
  });
});

describe('in-trail separation on final', () => {
  const clearance = {
    airport: 'KJFK',
    runway: '22L',
    approachId: 'I22L',
    threshold: { lat: 40.645236, lon: -73.754861 },
    thresholdElevationFt: 13,
    courseDeg: 223.8,
    glideslopeDeg: 3,
    thresholdCrossingHeightFt: 55,
  };
  const outbound = 223.8 - 13 + 180;
  const onFinal = (along: number, runway = '22L'): AircraftState =>
    ({
      ...newAircraft({ position: destinationPoint(clearance.threshold, outbound, along) }),
      id: `A${along}`,
      verticalSpeedFpm: 0,
      targets: {
        altitudeFt: 2_000,
        headingDeg: 224,
        turnDirection: 'shortest',
        iasKts: 150,
        speedMode: 'assigned',
      },
      navigation: {
        mode: 'approach',
        clearance: { ...clearance, runway },
        localizerCaptured: true,
        glideslopeCaptured: true,
        gatePassed: false,
      },
    }) as AircraftState;
  const settings = {
    lateralNm: 3,
    verticalFt: 1_000,
    lookaheadSec: 40,
    playerId: 'N90',
    magneticVariationDeg: -13,
  };

  it('allows 2.5 NM between aircraft established on the same final inside 10 NM', () => {
    expect(requiredLateralNm(onFinal(6), onFinal(8.7), settings)).toBe(2.5);
  });

  it('requires the full minimum farther out or on different runways', () => {
    expect(requiredLateralNm(onFinal(9), onFinal(12), settings)).toBe(3);
    expect(requiredLateralNm(onFinal(6), onFinal(8.7, '22R'), settings)).toBe(3);
  });
});
