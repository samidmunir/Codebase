import { destinationPoint, type AircraftState, type LatLon } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import {
  enrouteRadar,
  navigatingTo,
  radarHorizonNm,
  RadarTracker,
  terminalRadar,
  type RadarSensor,
} from './radar-tracker';

const ANTENNA = { lat: 40.6386, lon: -73.7698 };
const INTERVAL = 4;
const STEP = 0.05;

/** A radar that sees everything, for testing the sweep timing. */
const everywhere: RadarSensor = {
  id: 'R',
  antenna: ANTENNA,
  intervalSec: INTERVAL,
  phase: 0,
  covers: () => true,
};
const singleRadar = () => new RadarTracker([everywhere], everywhere);

/** A position `distanceNm` from the antenna on a true bearing. */
const at = (bearing: number, distanceNm = 20): LatLon =>
  destinationPoint(ANTENNA, bearing, distanceNm);

function aircraft(id: string, position: LatLon): AircraftState {
  return {
    id,
    callsign: `TST${id}`,
    aircraftType: 'A320',
    squawk: '1200',
    flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
    phase: 'arrival',
    owner: 'N90',
    position,
    altitudeFt: 5_000,
    headingDeg: 180,
    iasKts: 210,
    verticalSpeedFpm: 0,
    targets: {
      altitudeFt: 5_000,
      headingDeg: 180,
      turnDirection: 'shortest',
      iasKts: 210,
      speedMode: 'assigned',
    },
    navigation: { mode: 'heading' },
  };
}

/** Runs the radar from `from` to `to` seconds in small steps, returning update times per target. */
function run(radar: RadarTracker, planes: () => AircraftState[], from: number, to: number) {
  const updates: Record<string, number[]> = {};
  const lastSeen = new Map<string, LatLon>();
  for (let step = 0; from + step * STEP <= to + 1e-9; step++) {
    const t = from + step * STEP;
    radar.update(t, planes());
    for (const target of radar.list()) {
      if (lastSeen.get(target.id) !== target.position) {
        (updates[target.id] ??= []).push(Math.round(t * 100) / 100);
        lastSeen.set(target.id, target.position);
      }
    }
  }
  return updates;
}

describe('RadarTracker', () => {
  it('paints every aircraft on the first update so the scope starts full', () => {
    const radar = singleRadar();
    radar.update(1.3, [aircraft('1', at(10)), aircraft('2', at(200))]);
    expect(
      radar
        .list()
        .map((t) => t.id)
        .sort(),
    ).toEqual(['1', '2']);
  });

  it('updates each aircraft when the beam passes its bearing from the antenna', () => {
    const radar = singleRadar();
    const east = aircraft('east', at(90));
    const south = aircraft('south', at(180));
    const updates = run(radar, () => [east, south], 0, 8);

    // The beam turns once per 4 s from north: east (a quarter turn) at 1 s, south at 2 s.
    // Each update lands on the first step after the beam passes.
    const expectNear = (actual: number[] | undefined, expected: number[]) => {
      expect(actual).toHaveLength(expected.length);
      actual!.forEach((t, i) => {
        expect(t).toBeGreaterThanOrEqual(expected[i]!);
        expect(t).toBeLessThanOrEqual(expected[i]! + STEP + 1e-9);
      });
    };
    expectNear(updates.east, [0, 1, 5]);
    expectNear(updates.south, [0, 2, 6]);
  });

  it('updates each aircraft exactly once per rotation', () => {
    const radar = singleRadar();
    let position = at(45);
    const updates = run(
      radar,
      () => {
        position = { lat: position.lat + 0.0001, lon: position.lon };
        return [aircraft('1', position)];
      },
      0,
      40,
    );
    expect(updates['1']).toHaveLength(11); // first paint + 10 rotations
  });

  it('keeps previous returns as history, newest first', () => {
    const radar = singleRadar();
    const positions = [at(90, 20), at(90, 21), at(90, 22)];
    radar.update(0, [aircraft('1', positions[0]!)]);
    radar.update(1.1, [aircraft('1', positions[1]!)]);
    radar.update(5.1, [aircraft('1', positions[2]!)]);
    expect(radar.get('1')!.history).toEqual([positions[1], positions[0]]);
  });

  it('shows new aircraft only once the beam reaches them', () => {
    const radar = singleRadar();
    radar.update(0, []);
    const west = aircraft('west', at(270)); // three-quarters of a turn: 3 s
    radar.update(0.5, [west]);
    radar.update(2.9, [west]);
    expect(radar.get('west')).toBeUndefined();
    radar.update(3.05, [west]);
    expect(radar.get('west')).toBeDefined();
  });

  it('removes aircraft that are gone a few seconds later', () => {
    const radar = singleRadar();
    radar.update(0, [aircraft('1', at(180))]);
    radar.update(1, []);
    radar.update(5.5, []);
    expect(radar.get('1')).toBeDefined();
    radar.update(6.1, []);
    expect(radar.get('1')).toBeUndefined();
  });

  it('moves the sweep beam continuously', () => {
    const radar = singleRadar();
    expect(radar.sweepProgress(11)).toBe(0.75);
    expect(radar.sweepProgress(11.5)).toBe(0.875);
    expect(radar.sweepProgress(12)).toBe(0);
  });
});

describe('RadarTracker with several radars', () => {
  const east = destinationPoint(ANTENNA, 90, 80); // a second antenna 80 NM east
  const jfk = terminalRadar({
    id: 'JFK',
    position: ANTENNA,
    antennaElevationFt: 63,
    rangeNm: 60,
    intervalSec: 4,
  });
  const other = terminalRadar({
    id: 'EAST',
    position: east,
    antennaElevationFt: 50,
    rangeNm: 60,
    intervalSec: 5,
  });

  it('limits a terminal radar to its range and to line of sight for low aircraft', () => {
    expect(radarHorizonNm(50, 0)).toBeCloseTo(8.7, 1);
    expect(radarHorizonNm(50, 10_000)).toBeGreaterThan(120);
    const at5000 = (nm: number) => ({ ...aircraft('1', at(0, nm)), altitudeFt: 5_000 });
    expect(jfk.covers(at5000(55))).toBe(true);
    expect(jfk.covers(at5000(65))).toBe(false); // beyond its 60 NM range
    const low = { ...aircraft('2', at(0, 35)), altitudeFt: 400 };
    expect(jfk.covers(low)).toBe(false); // below the radar horizon at 35 NM
  });

  it('updates an aircraft on each covering radar’s sweep', () => {
    const radar = new RadarTracker([jfk, other], jfk);
    // Between the two antennas, covered by both.
    const between = { ...aircraft('1', destinationPoint(ANTENNA, 90, 40)), altitudeFt: 10_000 };
    const updates = run(radar, () => [between], 0, 20);
    // 5 JFK rotations and 4 of the other radar's in 20 s, plus the first paint (a sweep can coincide).
    expect(updates['1']!.length).toBeGreaterThanOrEqual(8);
    expect(updates['1']!.length).toBeLessThanOrEqual(10);
  });

  it('coasts an aircraft outside coverage, then picks it up again', () => {
    const lrr = enrouteRadar(ANTENNA, 6_000, 12);
    const radar = new RadarTracker([jfk, lrr], jfk);
    const far = (altitudeFt: number) => ({ ...aircraft('1', at(0, 100)), altitudeFt });
    radar.update(0, [far(8_000)]);
    expect(radar.get('1')).toMatchObject({ coasting: false, altitudeFt: 8_000 });
    // Descends below the long-range floor, 100 NM out: no radar sees it.
    radar.update(1, [far(5_000)]);
    expect(radar.get('1')).toMatchObject({ coasting: true, altitudeFt: 8_000 });
    radar.update(30, [far(5_000)]);
    expect(radar.get('1')!.altitudeFt).toBe(8_000);
    // Climbs back into coverage: repainted on the next long-range sweep.
    radar.update(31, [far(7_000)]);
    radar.update(44, [far(7_000)]);
    expect(radar.get('1')).toMatchObject({ coasting: false, altitudeFt: 7_000 });
  });

  it('never shows aircraft no radar has covered yet', () => {
    const radar = new RadarTracker([jfk], jfk);
    const low = { ...aircraft('1', at(0, 100)), altitudeFt: 3_000 };
    radar.update(0, [low]);
    radar.update(10, [low]);
    expect(radar.get('1')).toBeUndefined();
  });
});

describe('navigatingTo', () => {
  const base = aircraft('1', { lat: 40.8, lon: -73.8 });
  it('is the fix for direct-to, the ILS for approaches, and nothing on a heading', () => {
    expect(navigatingTo(base)).toBeUndefined();
    expect(
      navigatingTo({
        ...base,
        navigation: { mode: 'direct', fix: 'CAMRN', position: base.position },
      }),
    ).toBe('CAMRN');
    expect(
      navigatingTo({
        ...base,
        navigation: {
          mode: 'approach',
          clearance: {
            airport: 'KJFK',
            runway: '22L',
            approachId: 'I22L',
            threshold: base.position,
            thresholdElevationFt: 13,
            courseDeg: 224,
            glideslopeDeg: 3,
            thresholdCrossingHeightFt: 55,
          },
          localizerCaptured: false,
          glideslopeCaptured: false,
          gatePassed: false,
        },
      }),
    ).toBe('ILS22L');
  });

  it('is the next fix on a procedure, skipping heading legs, and nothing on a from-fix heading', () => {
    const procedure = (
      legs: Extract<AircraftState['navigation'], { mode: 'procedure' }>['legs'],
      legIndex = 0,
    ) =>
      navigatingTo({
        ...base,
        navigation: { mode: 'procedure', name: 'TNNIS6', legs, legIndex, legStart: base.position },
      });
    expect(
      procedure([
        { pathTerminator: 'VI', courseDeg: 134 },
        { pathTerminator: 'CF', fix: 'JUTES', position: base.position, courseDeg: 91 },
      ]),
    ).toBe('JUTES');
    expect(
      procedure([{ pathTerminator: 'FM', fix: 'WATJA', position: base.position, courseDeg: 61 }]),
    ).toBeUndefined();
  });
});

describe('radar sweeps', () => {
  it('draws a sweep for each terminal radar, turning independently', () => {
    const a = terminalRadar({
      id: 'JFK',
      position: ANTENNA,
      antennaElevationFt: 63,
      rangeNm: 60,
      intervalSec: 4.8,
    });
    const b = terminalRadar({
      id: 'EWR',
      position: destinationPoint(ANTENNA, 280, 20),
      antennaElevationFt: 60,
      rangeNm: 60,
      intervalSec: 4.8,
    });
    const lrr = enrouteRadar(ANTENNA, 6_000, 12);
    const radar = new RadarTracker([a, b, lrr], a);
    const sweeps = radar.sweeps(10);
    // Long-range coverage is modeled, not a drawn antenna.
    expect(sweeps.map((s) => s.id)).toEqual(['JFK', 'EWR']);
    expect(sweeps.every((s) => s.radiusNm === 60)).toBe(true);
    expect(sweeps[0]!.progress).not.toBeCloseTo(sweeps[1]!.progress, 2);
  });
});
