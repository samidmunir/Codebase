import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AtcCommand } from '../commands/commands';
import { destinationPoint, magneticToTrue } from '../math/geo';
import { airlines, newYork, performance } from '../testing/fixtures';
import { SimEngine } from './sim-engine';

const variation = newYork.airspace.magneticVariationDeg;

function clearanceFor(airport: string, runwayId: string) {
  const runway = newYork.airport(airport).runways.find((r) => r.id === runwayId)!;
  const ils = runway.ils!;
  return {
    runway,
    clearance: {
      airport,
      runway: runwayId,
      approachId: newYork.ilsApproaches(airport, runwayId)[0]!.id,
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
describe('approach acceptance', () => {
  it('lands every approach the pilot accepts, and answers as the eligibility showed', () => {
    const outcomes: Record<string, number> = {};
    const failures: string[] = [];
    for (const [airport, runwayId] of [
      ['KJFK', '22L'],
      ['KLGA', '04'],
      ['KEWR', '04R'],
    ] as const) {
      const { runway, clearance } = clearanceFor(airport, runwayId);
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
                      airspace: newYork,
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
                      owner: 'N90',
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
});
