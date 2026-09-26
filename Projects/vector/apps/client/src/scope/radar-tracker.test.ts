import { destinationPoint, type AircraftState, type LatLon } from '@vector/sim-core';
import { describe, expect, it } from 'vitest';
import { navigatingTo, RadarTracker } from './radar-tracker';

const ANTENNA = { lat: 40.6386, lon: -73.7698 };
const INTERVAL = 4;
const STEP = 0.05;

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
    const radar = new RadarTracker(INTERVAL, ANTENNA);
    radar.update(1.3, [aircraft('1', at(10)), aircraft('2', at(200))]);
    expect(
      radar
        .list()
        .map((t) => t.id)
        .sort(),
    ).toEqual(['1', '2']);
  });

  it('updates each aircraft when the beam passes its bearing from the antenna', () => {
    const radar = new RadarTracker(INTERVAL, ANTENNA);
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
    const radar = new RadarTracker(INTERVAL, ANTENNA);
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
    const radar = new RadarTracker(INTERVAL, ANTENNA);
    const positions = [at(90, 20), at(90, 21), at(90, 22)];
    radar.update(0, [aircraft('1', positions[0]!)]);
    radar.update(1.1, [aircraft('1', positions[1]!)]);
    radar.update(5.1, [aircraft('1', positions[2]!)]);
    expect(radar.get('1')!.history).toEqual([positions[1], positions[0]]);
  });

  it('shows new aircraft only once the beam reaches them', () => {
    const radar = new RadarTracker(INTERVAL, ANTENNA);
    radar.update(0, []);
    const west = aircraft('west', at(270)); // three-quarters of a turn: 3 s
    radar.update(0.5, [west]);
    radar.update(2.9, [west]);
    expect(radar.get('west')).toBeUndefined();
    radar.update(3.05, [west]);
    expect(radar.get('west')).toBeDefined();
  });

  it('removes aircraft that are gone once the beam passes their last position', () => {
    const radar = new RadarTracker(INTERVAL, ANTENNA);
    radar.update(0, [aircraft('1', at(180))]);
    radar.update(1.9, []);
    expect(radar.get('1')).toBeDefined();
    radar.update(2.05, []);
    expect(radar.get('1')).toBeUndefined();
  });

  it('moves the sweep beam continuously', () => {
    const radar = new RadarTracker(INTERVAL, ANTENNA);
    expect(radar.sweepProgress(11)).toBe(0.75);
    expect(radar.sweepProgress(11.5)).toBe(0.875);
    expect(radar.sweepProgress(12)).toBe(0);
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
