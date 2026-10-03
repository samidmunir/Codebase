import { defaultSettings, type SessionSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AircraftState, IlsClearance } from '../aircraft/aircraft';
import { ilsEligibility } from '../commands/ils-eligibility';
import { destinationPoint, distanceNm, magneticToTrue } from '../math/geo';
import { normalizeHeading } from '../math/angles';
import { airlines, newAircraft, newYork, performance } from '../testing/fixtures';
import type { SimEvent } from './events';
import { SimEngine } from './sim-engine';

const variation = newYork.airspace.magneticVariationDeg;
const runway22L = newYork.runway('KJFK', '22L');
const ILS_22L: IlsClearance = {
  airport: 'KJFK',
  runway: '22L',
  approachId: 'I22L',
  threshold: runway22L.threshold,
  thresholdElevationFt: runway22L.thresholdElevationFt,
  courseDeg: runway22L.ils!.courseDeg,
  glideslopeDeg: runway22L.ils!.glideslopeAngleDeg,
  thresholdCrossingHeightFt: runway22L.ils!.thresholdCrossingHeightFt ?? 50,
};
const outbound = normalizeHeading(magneticToTrue(ILS_22L.courseDeg, variation) + 180);

/** A position `along` NM out on final and `offset` NM to the pilot's left (negative: right). */
const onFinal = (along: number, offset = 0) =>
  destinationPoint(destinationPoint(ILS_22L.threshold, outbound, along), outbound + 90, offset);

function aircraftAt(overrides: Partial<AircraftState>): AircraftState {
  return {
    ...newAircraft(),
    id: 'AC1',
    verticalSpeedFpm: 0,
    flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
    phase: 'arrival',
    // 3 NM left of the centerline at 2,000 ft, on a 26° intercept from the left: it joins
    // the localizer about 6 NM out, just below the glideslope.
    targets: {
      altitudeFt: 2_000,
      headingDeg: 250,
      turnDirection: 'shortest',
      iasKts: 180,
      speedMode: 'assigned',
    },
    navigation: { mode: 'heading' },
    position: onFinal(12, 3),
    altitudeFt: 2_000,
    headingDeg: 250,
    iasKts: 180,
    ...overrides,
  } as AircraftState;
}

const context = (overrides: Partial<SessionSettings> = {}, mva?: number) => ({
  performance: performance.get('A320'),
  settings: { ...defaultSettings('session'), ...overrides },
  magneticVariationDeg: variation,
  minimumVectoringAltitudeFt: mva,
});

describe('ILS eligibility', () => {
  it('accepts a normal intercept', () => {
    expect(ilsEligibility(aircraftAt({}), ILS_22L, context())).toEqual({ ok: true });
  });

  it.each<[string, Partial<AircraftState>, RegExp]>([
    ['too far out', { position: onFinal(28, 2) }, /too far out/],
    ['too close in', { position: onFinal(3, 0.3) }, /too close/],
    ['beyond the runway', { position: onFinal(-4, 0) }, /not in position/],
    ['outside localizer coverage', { position: onFinal(22, 6) }, /not in position/],
    [
      'an intercept steeper than 60°',
      { targets: { ...aircraftAt({}).targets, headingDeg: 290 } },
      /intercept angle too steep/,
    ],
    [
      'a heading away from the localizer',
      { targets: { ...aircraftAt({}).targets, headingDeg: 200 } },
      /does not intercept/,
    ],
    ['too high', { altitudeFt: 6_000 }, /too high/],
    [
      'too fast to slow down in time',
      { position: onFinal(7, 0.5), altitudeFt: 1_800, iasKts: 250 },
      /slow down in time/,
    ],
    ['a join too close to the runway', { position: onFinal(8, 3) }, /join the localizer too close/],
    [
      'too high to get down to the glideslope from where it joins',
      { position: onFinal(14, 3), altitudeFt: 4_500 },
      /too high/,
    ],
  ])('rejects %s', (_name, overrides, reason) => {
    const result = ilsEligibility(aircraftAt(overrides), ILS_22L, context());
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(reason);
  });

  it('rejects an aircraft below the minimum vectoring altitude', () => {
    const result = ilsEligibility(aircraftAt({ altitudeFt: 1_800 }), ILS_22L, context({}, 2_000));
    expect(!result.ok && result.reason).toMatch(/minimum vectoring altitude/);
  });

  it('accepts intercepts up to 60° by default, and follows the setting', () => {
    // The final course is 223.8°: 283° is a 59° intercept from the left.
    const sixty = aircraftAt({ targets: { ...aircraftAt({}).targets, headingDeg: 283 } });
    expect(ilsEligibility(sixty, ILS_22L, context())).toEqual({ ok: true });
    expect(
      ilsEligibility(sixty, ILS_22L, context({ 'approaches.maxInterceptAngleDeg': 30 })).ok,
    ).toBe(false);
  });
});

function createEngine(overrides: Partial<SessionSettings> = {}, withAirspace = true) {
  return SimEngine.create({
    performance,
    world: { magneticVariationDeg: variation },
    seed: 5,
    startTimeUtc: '2026-09-26T14:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'pilots.responseDelaySec': [1, 1],
      'traffic.arrivalRatePerHour': 0,
      'traffic.departureRatePerHour': 0,
      'traffic.transitRatePerHour': 0,
      ...overrides,
    },
    ...(withAirspace ? { airspace: newYork, airlines } : {}),
  });
}

const run = (engine: SimEngine, seconds: number) => {
  for (let i = 0; i < seconds; i++) engine.step();
};

describe('approaches with the New York airspace', () => {
  it('hands the aircraft to Tower once established, then lands', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: onFinal(12, 3), headingDeg: 250, altitudeFt: 2_000, iasKts: 180 }),
      flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      telephony: 'JetBlue',
    });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    for (let i = 0; i < 400 && engine.getAircraft(aircraft.id)?.owner === 'N90'; i++) engine.step();

    expect(engine.getAircraft(aircraft.id)!.owner).toBe('KJFK_TWR');
    expect(engine.comms.map((c) => c.text)).toContain(
      'JetBlue ten twenty-four, contact Kennedy Tower one one niner point one.',
    );
    run(engine, 600);
    expect(events.some((e) => e.type === 'landed' && e.aircraftId === aircraft.id)).toBe(true);
    // Landing earns RP.
    expect(engine.score.tally.landing).toEqual({ count: 1, rp: 100 });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'scored',
        event: expect.objectContaining({
          rp: 100,
          callsigns: ['JBU1024'],
          detail: 'landed JFK 22L',
        }),
      }),
    );
  });

  it('captures the localizer cleanly from a 60° intercept and lands', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: onFinal(14, 4), headingDeg: 283, altitudeFt: 3_000, iasKts: 180 }),
      flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
    });
    engine.setTargets(aircraft.id, { headingDeg: 283, altitudeFt: 3_000, iasKts: 180 });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    let worstOvershootNm = 0;
    for (let i = 0; i < 900 && engine.getAircraft(aircraft.id); i++) {
      engine.step();
      const plane = engine.getAircraft(aircraft.id);
      if (plane) {
        const along = distanceNm(plane.position, runway22L.threshold);
        // After capture, the worst distance from the final course (an overshoot would show here).
        const captured = events.some((e) => e.type === 'localizerCaptured');
        if (captured && along > 2) {
          const bearingFromThreshold = normalizeHeading(
            magneticToTrue(ILS_22L.courseDeg, variation) + 180,
          );
          const onCourse = destinationPoint(runway22L.threshold, bearingFromThreshold, along);
          worstOvershootNm = Math.max(worstOvershootNm, distanceNm(onCourse, plane.position));
        }
      }
    }
    expect(events.some((e) => e.type === 'goAround')).toBe(false);
    expect(events.some((e) => e.type === 'landed' && e.aircraftId === aircraft.id)).toBe(true);
    // Rolls out close to the centerline instead of flying through it.
    expect(worstOvershootNm).toBeLessThan(0.6);
  });

  it('captures the glideslope from above after a late localizer join (KLGA ILS 22)', () => {
    // Cleared 470 ft below the glidepath, 12 NM out on a 30° intercept: it joins the localizer
    // at about 8.5 NM, by which time the glidepath is 500 ft below it.
    const runway = newYork.runway('KLGA', '22');
    const clearance: IlsClearance = {
      airport: 'KLGA',
      runway: '22',
      approachId: 'I22',
      threshold: runway.threshold,
      thresholdElevationFt: runway.thresholdElevationFt,
      courseDeg: runway.ils!.courseDeg,
      glideslopeDeg: runway.ils!.glideslopeAngleDeg,
      thresholdCrossingHeightFt: runway.ils!.thresholdCrossingHeightFt ?? 50,
    };
    const lgaOutbound = normalizeHeading(magneticToTrue(clearance.courseDeg, variation) + 180);
    const start = destinationPoint(
      destinationPoint(clearance.threshold, lgaOutbound, 12),
      lgaOutbound + 90,
      2,
    );
    const heading = normalizeHeading(clearance.courseDeg + 30);
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: start, headingDeg: heading, altitudeFt: 3_400, iasKts: 180 }),
      flightPlan: { origin: 'KATL', destination: 'KLGA', route: [] },
    });
    engine.setTargets(aircraft.id, { headingDeg: heading, altitudeFt: 3_400, iasKts: 180 });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance }]);
    for (let i = 0; i < 900 && engine.getAircraft(aircraft.id); i++) engine.step();

    expect(events.some((e) => e.type === 'ilsUnable')).toBe(false);
    expect(events.some((e) => e.type === 'glideslopeCaptured')).toBe(true);
    expect(events.some((e) => e.type === 'goAround')).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'landed', airport: 'KLGA', runway: '22' }),
    );
  });

  it('cancels the approach, with the pilot saying why, when a later heading means it can no longer work', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    // Cleared on a good 26° intercept, 12 NM out, below the glidepath...
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: onFinal(12, 3), headingDeg: 250, altitudeFt: 2_000, iasKts: 160 }),
      flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      telephony: 'JetBlue',
    });
    engine.setTargets(aircraft.id, { headingDeg: 250, altitudeFt: 2_000, iasKts: 160 });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    run(engine, 5);
    // ...then turned onto a 6° intercept, which can't reach the localizer before the gate.
    const check = engine.approachEffectOf(aircraft.id, [
      { type: 'heading', headingDeg: 230, turn: 'left' },
    ]);
    expect(check).toMatchObject({ ok: false });
    engine.issueInstruction(aircraft.id, [{ type: 'heading', headingDeg: 230, turn: 'left' }]);
    run(engine, 240);

    expect(events.some((e) => e.type === 'goAround')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'ilsUnable' }));
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
    expect(
      engine.comms.some((c) =>
        /two three zero, unable ILS runway two two left from there, /.test(c.text),
      ),
    ).toBe(true);
    expect(engine.score.tally.goAround).toBeUndefined();
  });

  it('goes around when not established at the stabilized-approach gate, says why, and comes back to the player', () => {
    const engine = createEngine();
    const events: SimEvent[] = [];
    engine.subscribe((event) => events.push(event));
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: onFinal(12, 3), headingDeg: 250, altitudeFt: 2_000, iasKts: 160 }),
      flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      telephony: 'JetBlue',
    });
    engine.setTargets(aircraft.id, { headingDeg: 250, altitudeFt: 2_000, iasKts: 160 });
    engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance: ILS_22L }]);
    run(engine, 5);
    // Set straight onto a 6° intercept (bypassing the radio, so no one re-checks it).
    engine.setTargets(aircraft.id, { headingDeg: 230, turnDirection: 'left' });
    run(engine, 240);

    const goAround = events.find((e) => e.type === 'goAround');
    expect(goAround).toMatchObject({
      airport: 'KJFK',
      runway: '22L',
      reason: 'not established on the localizer',
    });
    expect(engine.score.tally.goAround).toEqual({ count: 1, rp: -25 });
    const plane = engine.getAircraft(aircraft.id)!;
    expect(plane).toMatchObject({ phase: 'goAround', owner: 'N90' });
    expect(plane.targets.altitudeFt).toBe(3_000);
    expect(plane.navigation.mode === 'procedure' || plane.navigation.mode === 'heading').toBe(true);
    expect(
      engine.comms.some((c) =>
        /going around, not established on the localizer, climbing three thousand/.test(c.text),
      ),
    ).toBe(true);
  });

  it('replies unable to the approach but follows the rest of the instruction', () => {
    const engine = createEngine();
    const aircraft = engine.addAircraft({
      ...newAircraft({ position: onFinal(16, 3), headingDeg: 250, altitudeFt: 7_000, iasKts: 210 }),
      flightPlan: { origin: 'KBOS', destination: 'KJFK', route: [] },
      telephony: 'JetBlue',
    });
    engine.issueInstruction(aircraft.id, [
      { type: 'heading', headingDeg: 245, turn: 'left' },
      { type: 'clearedIls', clearance: ILS_22L },
    ]);
    run(engine, 1);
    expect(engine.comms.at(-1)!.text).toBe(
      'Left heading two four five, unable ILS runway two two left, too high for the approach, JetBlue ten twenty-four.',
    );
    expect(engine.getAircraft(aircraft.id)!.targets.headingDeg).toBe(245);
    expect(engine.getAircraft(aircraft.id)!.navigation.mode).toBe('heading');
  });
});

describe('arrivals', () => {
  it('enter at the boundary on their STARs, check in, and fly the route', () => {
    const engine = createEngine({
      'traffic.arrivalRatePerHour': 12,
      'traffic.transitRatePerHour': 0,
    });
    const entered: SimEvent[] = [];
    engine.subscribe((event) => event.type === 'arrivalEntered' && entered.push(event));
    run(engine, 1_800);

    expect(entered.length).toBeGreaterThan(6);
    const arrivals = engine.listAircraft().filter((a) => a.phase === 'arrival');
    expect(arrivals.length).toBeGreaterThan(0);
    for (const arrival of arrivals) {
      expect(newYork.airspace.airports).toContain(arrival.flightPlan.destination);
      expect(arrival.owner).toBe('N90');
      expect(distanceNm(newYork.airspace.center, arrival.position)).toBeLessThan(
        newYork.boundaryRadiusNm,
      );
    }
    const checkIns = engine.comms.filter((c) => /^New York (Center|Approach),/.test(c.text));
    expect(checkIns.length).toBe(entered.length);
    expect(checkIns[0]!.text).toMatch(
      /, [A-Z]+ (one|two|three|four|five|six|seven|eight|niner) arrival, information [A-Z][a-z-]+\.$/,
    );
  });

  it('enter far out at the flight levels, for the player to descend', () => {
    const engine = createEngine({
      'traffic.arrivalRatePerHour': 20,
      'traffic.transitRatePerHour': 0,
    });
    const entries: { altitudeFt: number; distanceNm: number }[] = [];
    engine.subscribe((event) => {
      if (event.type !== 'arrivalEntered') return;
      const arrival = engine.getAircraft(event.aircraftId)!;
      entries.push({
        altitudeFt: arrival.altitudeFt,
        distanceNm: distanceNm(newYork.airspace.center, arrival.position),
      });
    });
    run(engine, 1_800);
    expect(entries.length).toBeGreaterThan(10);
    for (const entry of entries) expect(entry.distanceNm).toBeGreaterThan(140);
    const high = entries.filter((entry) => entry.altitudeFt >= 18_000);
    expect(high.length / entries.length).toBeGreaterThan(0.7);
    // Checking in at a flight level, with Center.
    expect(engine.comms.some((c) => /^New York Center, .*, flight level/.test(c.text))).toBe(true);
  });

  it('never brings widebodies into LaGuardia', () => {
    const engine = createEngine({ 'traffic.arrivalRatePerHour': 30 });
    run(engine, 3_600);
    const lga = engine.listAircraft().filter((a) => a.flightPlan.destination === 'KLGA');
    expect(lga.some((a) => ['B77W', 'B789', 'B763', 'A333'].includes(a.aircraftType))).toBe(false);
  });

  it('follows the arrival rate setting', () => {
    const count = (rate: number) => {
      const engine = createEngine({ 'traffic.arrivalRatePerHour': rate });
      let entered = 0;
      engine.subscribe((event) => event.type === 'arrivalEntered' && entered++);
      run(engine, 3_600);
      return entered;
    };
    expect(count(0)).toBe(0);
    expect(count(6)).toBeLessThan(count(20));
  });
});
