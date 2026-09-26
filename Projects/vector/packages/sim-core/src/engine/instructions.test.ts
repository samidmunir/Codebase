import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { IlsClearance } from '../aircraft/aircraft';
import { finalApproachGeometry } from '../aircraft/navigation';
import type { AtcCommand } from '../commands/commands';
import { destinationPoint, distanceNm } from '../math/geo';
import { NEW_YORK_WORLD, newAircraft, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

/** JFK runway 22L (from the New York airspace pack). */
const ILS_22L: IlsClearance = {
  airport: 'KJFK',
  runway: '22L',
  approachId: 'I22L',
  threshold: { lat: 40.645236, lon: -73.754861 },
  thresholdElevationFt: 13,
  courseDeg: 223.8,
  glideslopeDeg: 3,
  thresholdCrossingHeightFt: 55,
};

function createEngine(delaySec: [number, number] = [2, 2]) {
  return SimEngine.create({
    performance,
    world: NEW_YORK_WORLD,
    seed: 7,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: { ...defaultSettings('session'), 'pilots.responseDelaySec': delaySec },
  });
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

describe('issuing instructions', () => {
  it('transmits immediately and has the pilot read back and act after the response delay', () => {
    const engine = createEngine([3, 3]);
    const aircraft = engine.addAircraft({
      ...newAircraft({ headingDeg: 360 }),
      telephony: 'JetBlue',
    });

    const result = engine.issueInstruction(aircraft.id, [
      { type: 'altitude', altitudeFt: 4_000 },
      { type: 'heading', headingDeg: 270, turn: 'left' },
    ]);
    expect(result).toEqual({ ok: true });
    // Spoken in controller order: heading before altitude.
    expect(engine.comms.at(-1)).toMatchObject({
      speaker: 'controller',
      callsign: 'JBU1024',
      text: 'JetBlue ten twenty-four, turn left heading two seven zero, descend and maintain four thousand.',
    });

    run(engine, 2);
    expect(engine.getAircraft(aircraft.id)!.targets.headingDeg).toBe(0);
    expect(engine.pendingInstructions(aircraft.id)).toHaveLength(1);

    run(engine, 1);
    expect(engine.comms.at(-1)).toMatchObject({
      speaker: 'pilot',
      text: 'Left heading two seven zero, descend and maintain four thousand, JetBlue ten twenty-four.',
    });
    expect(engine.getAircraft(aircraft.id)!.targets).toMatchObject({
      headingDeg: 270,
      turnDirection: 'left',
      altitudeFt: 4_000,
    });
    expect(engine.pendingInstructions(aircraft.id)).toHaveLength(0);
  });

  it('uses brief readbacks when set', () => {
    const engine = SimEngine.create({
      performance,
      world: NEW_YORK_WORLD,
      seed: 1,
      startTimeUtc: '2026-09-26T14:00:00Z',
      settings: {
        ...defaultSettings('session'),
        'pilots.responseDelaySec': [1, 1],
        'pilots.readbackDetail': 'brief',
      },
    });
    const aircraft = engine.addAircraft({ ...newAircraft(), telephony: 'JetBlue' });
    engine.issueInstruction(aircraft.id, [{ type: 'speed', iasKts: 210 }]);
    run(engine, 1);
    expect(engine.comms.at(-1)!.text).toBe('Two one zero knots, JetBlue ten twenty-four.');
  });

  it.each<[string, AtcCommand[], RegExp]>([
    ['a speed off the 10-knot steps', [{ type: 'speed', iasKts: 215 }], /10-knot/],
    ['a speed below final approach speed', [{ type: 'speed', iasKts: 120 }], /final approach/],
    ['more than 250 kt below 10,000 ft', [{ type: 'speed', iasKts: 280 }], /250 knots/],
    ['an altitude above the ceiling', [{ type: 'altitude', altitudeFt: 45_000 }], /ceiling/],
    [
      'a heading and a direct-to together',
      [
        { type: 'heading', headingDeg: 90, turn: 'shortest' },
        { type: 'directTo', fix: 'CAMRN', position: { lat: 40.02, lon: -73.86 } },
      ],
      /heading or a direct-to/,
    ],
    [
      'an ILS at another airport',
      [{ type: 'clearedIls', clearance: ILS_22L }],
      /not landing at KJFK/,
    ],
  ])('rejects %s', (_name, commands, reason) => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft());
    const result = engine.issueInstruction(aircraft.id, commands);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(reason);
    expect(engine.comms).toHaveLength(0);
  });

  it('allows more than 250 kt when also climbing above 10,000 ft', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft());
    expect(
      engine.checkInstruction(aircraft.id, [
        { type: 'altitude', altitudeFt: 14_000 },
        { type: 'speed', iasKts: 280 },
      ]),
    ).toEqual({ ok: true });
  });

  it('only accepts instructions for aircraft on the player frequency', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft(newAircraft({ owner: 'KJFK_TWR' }));
    const result = engine.issueInstruction(aircraft.id, [{ type: 'altitude', altitudeFt: 3_000 }]);
    expect(result).toEqual({ ok: false, reason: 'JBU1024 is not on your frequency' });
  });

  it('draws pilot delays from the session setting range, deterministically', () => {
    const delays = (seed: number) => {
      const engine = SimEngine.create({
        performance,
        world: NEW_YORK_WORLD,
        seed,
        startTimeUtc: '2026-09-26T14:00:00Z',
        settings: { ...defaultSettings('session'), 'pilots.responseDelaySec': [2, 6] },
      });
      const aircraft = engine.addAircraft(newAircraft());
      const ticks: number[] = [];
      engine.subscribe((event, tick) => event.type === 'instructionExecuted' && ticks.push(tick));
      for (let i = 0; i < 5; i++) {
        engine.issueInstruction(aircraft.id, [{ type: 'altitude', altitudeFt: 5_000 + i * 1000 }]);
        const issuedAt = engine.tick;
        run(engine, 8);
        ticks[i] = ticks[i]! - issuedAt;
      }
      return ticks;
    };
    const first = delays(3);
    expect(first.every((delay) => delay >= 2 && delay <= 6)).toBe(true);
    expect(delays(3)).toEqual(first);
  });

  it('hands aircraft off to another controller', () => {
    const engine = createEngine([1, 1]);
    const aircraft = engine.addAircraft({ ...newAircraft(), telephony: 'JetBlue' });
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    engine.issueInstruction(aircraft.id, [
      { type: 'handoff', to: 'ZNY', facility: 'New York Center', frequencyMhz: 132.6 },
    ]);
    expect(engine.comms.at(-1)!.text).toBe(
      'JetBlue ten twenty-four, contact New York Center one three two point six.',
    );
    run(engine, 1);
    expect(engine.getAircraft(aircraft.id)!.owner).toBe('ZNY');
    expect(events).toContainEqual({
      type: 'ownerChanged',
      aircraftId: aircraft.id,
      from: 'N90',
      to: 'ZNY',
    });
    expect(engine.comms.at(-1)!.text).toBe(
      'New York Center one three two point six, good day, JetBlue ten twenty-four.',
    );
  });

  it('resumes normal speed: 250 below 10,000 ft, climb speed above', () => {
    const engine = createEngine([1, 1]);
    const aircraft = engine.addAircraft(newAircraft({ altitudeFt: 8_000, iasKts: 210 }));
    engine.issueInstruction(aircraft.id, [
      { type: 'resumeNormalSpeed' },
      { type: 'altitude', altitudeFt: 14_000 },
    ]);
    run(engine, 40);
    expect(engine.getAircraft(aircraft.id)!.iasKts).toBe(250);
    run(engine, 300);
    expect(engine.getAircraft(aircraft.id)!.iasKts).toBe(performance.get('A320').speeds.climb);
  });
});

describe('navigation', () => {
  it('flies direct to a fix and reports passing it', () => {
    const engine = createEngine([1, 1]);
    const start = { lat: 40.5, lon: -73.5 };
    const fix = destinationPoint(start, 200, 12);
    const aircraft = engine.addAircraft(newAircraft({ position: start, headingDeg: 20 }));
    const passed: string[] = [];
    engine.subscribe((event) => event.type === 'fixPassed' && passed.push(event.fix));

    engine.issueInstruction(aircraft.id, [{ type: 'directTo', fix: 'TESTX', position: fix }]);
    run(engine, 400);

    expect(passed).toEqual(['TESTX']);
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
  });

  it('intercepts the localizer, descends on the glideslope, slows down and lands', () => {
    const engine = createEngine([1, 1]);
    // 14 NM out on final, 3 NM left of the centerline (as the pilot sees it), on a 26° intercept.
    const outbound = 223.8 - 13 + 180;
    const onCourse = destinationPoint(ILS_22L.threshold, outbound, 14);
    const start = destinationPoint(onCourse, outbound + 90, 3);
    const aircraft = engine.addAircraft(
      newAircraft({
        position: start,
        headingDeg: 250,
        altitudeFt: 2_000,
        iasKts: 210,
        flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
        phase: 'arrival',
      }),
    );
    const events: string[] = [];
    engine.subscribe((event) => {
      if (['localizerCaptured', 'glideslopeCaptured', 'landed'].includes(event.type))
        events.push(event.type);
    });

    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    expect(engine.comms.at(-1)!.text).toContain('cleared ILS runway two two left approach');

    let maxCrossTrackAfterCapture = 0;
    let lowestSpeed = Infinity;
    for (let i = 0; i < 900 && engine.getAircraft(aircraft.id); i++) {
      engine.step();
      const plane = engine.getAircraft(aircraft.id);
      if (!plane) break;
      lowestSpeed = Math.min(lowestSpeed, plane.iasKts);
      if (plane.navigation.mode === 'approach' && plane.navigation.glideslopeCaptured) {
        const { crossTrackNm, alongTrackNm } = finalApproachGeometry(
          plane.position,
          ILS_22L,
          NEW_YORK_WORLD.magneticVariationDeg,
        );
        // The intercept turn starts before the centerline (lead turn); check tracking once settled.
        if (alongTrackNm < 7)
          maxCrossTrackAfterCapture = Math.max(maxCrossTrackAfterCapture, Math.abs(crossTrackNm));
      }
    }

    expect(events).toEqual(['localizerCaptured', 'glideslopeCaptured', 'landed']);
    expect(engine.getAircraft(aircraft.id)).toBeUndefined();
    // Holds the centerline inside 7 NM.
    expect(maxCrossTrackAfterCapture).toBeLessThan(0.05);
    expect(lowestSpeed).toBe(performance.get('A320').speeds.final);
  });

  it('replies unable when too high for the approach, and stays on vectors', () => {
    const engine = createEngine([1, 1]);
    const start = destinationPoint(ILS_22L.threshold, 223.8 - 13 + 180, 8);
    const aircraft = engine.addAircraft({
      ...newAircraft({
        position: start,
        headingDeg: 224,
        altitudeFt: 6_000, // glidepath at 8 NM is ~2,600 ft
        iasKts: 180,
        flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      }),
      telephony: 'JetBlue',
    });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    run(engine, 2);
    expect(engine.comms.at(-1)!.text).toBe(
      'Unable ILS runway two two left, too high for the approach, JetBlue ten twenty-four.',
    );
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
  });

  it('breaks off the approach when vectored after capturing the localizer', () => {
    const engine = createEngine([1, 1]);
    const start = destinationPoint(ILS_22L.threshold, 223.8 - 13 + 180, 12);
    const aircraft = engine.addAircraft(
      newAircraft({
        position: start,
        headingDeg: 224,
        altitudeFt: 3_000,
        iasKts: 180,
        flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      }),
    );
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    run(engine, 5);
    expect(engine.getAircraft(aircraft.id)!.navigation).toMatchObject({ localizerCaptured: true });

    engine.issueInstruction(aircraft.id, [{ type: 'heading', headingDeg: 130, turn: 'left' }]);
    run(engine, 2);
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
    expect(engine.getAircraft(aircraft.id)!.phase).toBe('arrival');
  });
});

describe('snapshots with instructions', () => {
  it('resumes pending instructions and the comms log exactly', () => {
    const scenario = (engine: SimEngine) => {
      const aircraft = engine.addAircraft({ ...newAircraft(), telephony: 'JetBlue' });
      engine.issueInstruction(aircraft.id, [{ type: 'heading', headingDeg: 90, turn: 'right' }]);
      return aircraft.id;
    };

    const continuous = createEngine([2, 6]);
    scenario(continuous);
    run(continuous, 30);

    const first = createEngine([2, 6]);
    const id = scenario(first);
    expect(first.pendingInstructions(id)).toHaveLength(1);
    const saved = JSON.parse(JSON.stringify(first.toSnapshot())) as unknown;
    const resumed = SimEngine.fromSnapshot(saved, performance);
    run(resumed, 30);

    expect(resumed.toSnapshot()).toEqual(continuous.toSnapshot());
    expect(resumed.comms.map((entry) => entry.speaker)).toEqual(['controller', 'pilot']);
  });

  it('keeps the comms log bounded', () => {
    const engine = createEngine();
    for (let i = 0; i < 350; i++) engine.transmit('pilot', undefined, `Message ${i}`);
    expect(engine.comms).toHaveLength(300);
    expect(engine.comms[0]!.text).toBe('Message 50');
  });
});

describe('distance helper sanity', () => {
  it('places the 22L test threshold at JFK', () => {
    expect(distanceNm(ILS_22L.threshold, { lat: 40.6398, lon: -73.7789 })).toBeLessThan(2);
  });
});
