import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AtcCommand } from '../commands/commands';
import { destinationPoint, magneticToTrue } from '../math/geo';
import type { AirspacePack } from '../airspace/airspace-pack';
import { airlines, chicago, dallas, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

function clearanceFor(pack: AirspacePack, airport: string, runwayId: string) {
  const runway = pack.airport(airport).runways.find((r) => r.id === runwayId)!;
  const ils = runway.ils!;
  return {
    runway,
    clearance: {
      airport,
      runway: runwayId,
      approachId: pack.ilsApproaches(airport, runwayId)[0]!.id,
      threshold: runway.threshold,
      thresholdElevationFt: runway.thresholdElevationFt,
      courseDeg: ils.courseDeg,
      glideslopeDeg: ils.glideslopeAngleDeg,
      thresholdCrossingHeightFt: ils.thresholdCrossingHeightFt ?? 50,
    },
  };
}

/**
 * Clears approaches from many geometries (distance, offset, intercept, height,
 * speed, still turning or not, with the intercept heading in the same
 * transmission or not). The pilot's answer when cleared is what the scope
 * showed, and every approach the pilot accepts must end in a landing.
 */
/** Each airspace, with runways to clear approaches to (for each test). */
const AIRSPACES: [AirspacePack, [string, string][], [string, string][]][] = [
  [
    newYork,
    [
      ['KJFK', '22L'],
      ['KLGA', '04'],
      ['KEWR', '04R'],
    ],
    [
      ['KLGA', '22'],
      ['KJFK', '22L'],
    ],
  ],
  [
    chicago,
    [
      ['KORD', '27L'],
      ['KORD', '10C'],
      ['KMDW', '31R'],
    ],
    [
      ['KORD', '28C'],
      ['KMDW', '13L'],
    ],
  ],
  [
    dallas,
    [
      ['KDFW', '17C'],
      ['KDFW', '35R'],
      ['KDAL', '13L'],
    ],
    [
      ['KDFW', '18R'],
      ['KDAL', '31R'],
    ],
  ],
];

describe.each(AIRSPACES)('approach acceptance in %s', (pack, acceptanceRunways, afterRunways) => {
  const variation = pack.airspace.magneticVariationDeg;
  const facility = pack.airspace.controllers.approach.id;

  it('lands every approach the pilot accepts, and answers as the eligibility showed', () => {
    const outcomes: Record<string, number> = {};
    const failures: string[] = [];
    for (const [airport, runwayId] of acceptanceRunways) {
      const { runway, clearance } = clearanceFor(pack, airport, runwayId);
      const outbound = magneticToTrue(clearance.courseDeg, variation) + 180;
      for (const along of [8, 14, 22])
        for (const side of [-1, 1])
          for (const offset of [1, 4])
            for (const angle of [15, 45])
              for (const altitudeFt of [3_000, 6_000])
                for (const iasKts of [180, 250])
                  for (const mode of ['steady', 'turning', 'combined'] as const) {
                    const engine = SimEngine.create({
                      performance,
                      world: { magneticVariationDeg: variation },
                      seed: 1,
                      startTimeUtc: '2026-09-30T14:00:00Z',
                      settings: {
                        ...defaultSettings('session'),
                        'weather.windMode': 'random',
                        'traffic.arrivalRatePerHour': 0,
                        'traffic.departureRatePerHour': 0,
                        'traffic.transitRatePerHour': 0,
                        'pilots.responseDelaySec': [3, 3],
                      },
                      airspace: pack,
                      airlines,
                    });
                    const position = destinationPoint(
                      destinationPoint(runway.threshold, outbound, along),
                      outbound + 90 * side,
                      offset,
                    );
                    const intercept =
                      Math.round(clearance.courseDeg + (side > 0 ? angle : -angle) + 360) % 360 ||
                      360;
                    // 'combined': flying 40° off and given the intercept heading with the clearance.
                    const flying = mode === 'steady' ? intercept : (intercept + 40) % 360 || 360;
                    const aircraft = engine.addAircraft({
                      callsign: 'TST1',
                      aircraftType: 'A320',
                      squawk: '1234',
                      flightPlan: { origin: 'KBOS', destination: airport, route: [] },
                      phase: 'arrival',
                      owner: facility,
                      position,
                      altitudeFt,
                      headingDeg: flying,
                      iasKts,
                      targets: {
                        altitudeFt,
                        headingDeg: mode === 'combined' ? flying : intercept,
                        iasKts,
                        speedMode: 'assigned',
                      },
                    });
                    const commands: AtcCommand[] = [
                      ...(mode === 'combined'
                        ? [
                            {
                              type: 'heading' as const,
                              headingDeg: intercept,
                              turn: 'shortest' as const,
                            },
                          ]
                        : []),
                      { type: 'clearedIls', clearance },
                    ];
                    const shown = engine.ilsEligibility(
                      aircraft.id,
                      clearance,
                      commands.slice(0, -1),
                    );
                    let outcome = 'flying';
                    engine.subscribe((event) => {
                      if (event.type === 'landed') outcome = 'landed';
                      if (event.type === 'goAround') outcome = `go-around: ${event.reason}`;
                      if (event.type === 'ilsUnable') outcome = `unable: ${event.reason}`;
                    });
                    engine.issueInstruction(aircraft.id, commands);
                    for (let t = 0; t < 1_500 && outcome === 'flying'; t++) engine.step();
                    const label = `${airport} ${runwayId} ${along} NM ${side > 0 ? 'left' : 'right'} ${offset} NM, ${angle}°, ${altitudeFt} ft, ${iasKts} kt, ${mode}`;
                    if (shown.ok) {
                      outcomes.accepted = (outcomes.accepted ?? 0) + 1;
                      if (outcome !== 'landed') failures.push(`${label}: ${outcome}`);
                    } else if (!outcome.startsWith('unable')) {
                      failures.push(`${label}: shown unable, but ${outcome}`);
                    }
                  }
    }
    expect(outcomes.accepted).toBeGreaterThan(150);
    expect(failures).toEqual([]);
  });

  it('never goes around because of a heading or altitude given after the clearance: the pilot says unable first', () => {
    const failures: string[] = [];
    let cancelled = 0;
    for (const [airport, runwayId] of afterRunways) {
      const { runway, clearance } = clearanceFor(pack, airport, runwayId);
      const outbound = magneticToTrue(clearance.courseDeg, variation) + 180;
      for (const along of [8, 12, 16])
        for (const offset of [2, 3.5])
          for (const angle of [20, 30, 45])
            for (const altitudeFt of [2_000, 3_000, 4_000])
              for (const after of ['heading+25', 'heading-25', 'altitude+2000'] as const) {
                const engine = SimEngine.create({
                  performance,
                  world: { magneticVariationDeg: variation },
                  seed: 1,
                  startTimeUtc: '2026-10-02T14:00:00Z',
                  settings: {
                    ...defaultSettings('session'),
                    'weather.windMode': 'random',
                    'traffic.arrivalRatePerHour': 0,
                    'traffic.departureRatePerHour': 0,
                    'traffic.transitRatePerHour': 0,
                    'pilots.responseDelaySec': [3, 3],
                  },
                  airspace: pack,
                  airlines,
                });
                const position = destinationPoint(
                  destinationPoint(runway.threshold, outbound, along),
                  outbound - 90,
                  offset,
                );
                const heading = Math.round(clearance.courseDeg - angle + 360) % 360 || 360;
                const aircraft = engine.addAircraft({
                  callsign: 'TST1',
                  aircraftType: 'A320',
                  squawk: '1234',
                  flightPlan: { origin: 'KBOS', destination: airport, route: [] },
                  phase: 'arrival',
                  owner: facility,
                  position,
                  altitudeFt,
                  headingDeg: heading,
                  iasKts: 190,
                  targets: { altitudeFt, headingDeg: heading, iasKts: 190, speedMode: 'assigned' },
                });
                if (!engine.ilsEligibility(aircraft.id, clearance).ok) continue;
                let outcome = 'flying';
                engine.subscribe((event) => {
                  if (event.type === 'landed') outcome = 'landed';
                  if (event.type === 'goAround') outcome = `go-around: ${event.reason}`;
                  if (event.type === 'ilsUnable') outcome = 'unable';
                });
                engine.issueInstruction(aircraft.id, [{ type: 'clearedIls', clearance }]);
                for (let t = 0; t < 1_200 && outcome === 'flying'; t++) {
                  engine.step();
                  const now = engine.getAircraft(aircraft.id);
                  if (
                    t !== 8 ||
                    now?.navigation.mode !== 'approach' ||
                    now.navigation.localizerCaptured
                  )
                    continue;
                  engine.issueInstruction(
                    aircraft.id,
                    after === 'altitude+2000'
                      ? [{ type: 'altitude', altitudeFt: altitudeFt + 2_000 }]
                      : [
                          {
                            type: 'heading',
                            headingDeg:
                              Math.round(heading + (after === 'heading+25' ? 25 : -25) + 360) %
                                360 || 360,
                            turn: 'shortest',
                          },
                        ],
                  );
                }
                if (outcome === 'unable') cancelled++;
                const still = engine.getAircraft(aircraft.id)?.navigation.mode === 'approach';
                if (outcome.startsWith('go-around') || (outcome === 'flying' && still))
                  failures.push(
                    `${airport} ${runwayId} ${along} NM, ${offset} NM off, ${angle}°, ${altitudeFt} ft, ${after}: ${outcome}`,
                  );
              }
    }
    expect(cancelled).toBeGreaterThan(20);
    expect(failures).toEqual([]);
  });
});
