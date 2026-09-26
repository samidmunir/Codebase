import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCifp, parseLatitude, parseLongitude, parseVariation } from './cifp';

// Real records from FAA CIFP cycle 2609 (public domain).
const sample = readFileSync(new URL('./fixtures/cifp-sample.txt', import.meta.url), 'latin1');
const data = parseCifp(sample, ['KJFK', 'KLGA']);

const legsOf = (id: string, transition: string) =>
  data.procedures.filter((p) => p.id === id && p.transition === transition).map((p) => p.leg);

describe('coordinates', () => {
  it('parses degrees, minutes and hundredths of seconds', () => {
    expect(parseLatitude('N40372318')).toBeCloseTo(40 + 37 / 60 + 23.18 / 3600, 9);
    expect(parseLongitude('W073470505')).toBeCloseTo(-(73 + 47 / 60 + 5.05 / 3600), 9);
    expect(parseLatitude('S33565000')).toBeLessThan(0);
  });

  it('parses magnetic variation with west negative', () => {
    expect(parseVariation('W0130')).toBe(-13);
    expect(parseVariation('E0025')).toBe(2.5);
  });
});

describe('airport, runway and localizer records', () => {
  it('parses the JFK reference point', () => {
    expect(data.airports).toEqual([
      {
        icao: 'KJFK',
        name: 'JOHN F KENNEDY INTL',
        position: { lat: expect.closeTo(40.6399, 4), lon: expect.closeTo(-73.7787, 4) },
        magneticVariationDeg: -13,
        elevationFt: 13,
      },
    ]);
  });

  it('parses runway 4L', () => {
    expect(data.runways.find((r) => r.id === '04L')).toEqual({
      airport: 'KJFK',
      id: '04L',
      lengthFt: 12079,
      magneticBearingDeg: 44,
      threshold: { lat: expect.closeTo(40.6231, 4), lon: expect.closeTo(-73.7847, 4) },
      thresholdElevationFt: 12,
      displacedThresholdFt: 460,
      thresholdCrossingHeightFt: 57,
      widthFt: 200,
      localizer: 'IHIQ',
    });
  });

  it('parses the runway 22L localizer and glideslope', () => {
    expect(data.localizers).toEqual([
      expect.objectContaining({
        ident: 'IIWY',
        runway: '22L',
        frequencyMhz: 110.9,
        courseDeg: 223.8,
        glideslope: expect.objectContaining({ angleDeg: 3 }),
      }),
    ]);
  });
});

describe('fixes', () => {
  it('parses terminal waypoints, enroute waypoints and VORs', () => {
    expect(data.fixes.map((f) => [f.ident, f.section, f.kind])).toEqual([
      ['ROSLY', 'PC', 'waypoint'],
      ['CAMRN', 'EA', 'waypoint'],
      ['DPK', 'D ', 'vor'],
    ]);
    expect(data.fixes.find((f) => f.ident === 'DPK')).toMatchObject({
      frequencyMhz: 117.7,
      name: 'DEER PARK',
    });
  });
});

describe('procedures', () => {
  it('parses the CAMRN5 STAR route', () => {
    const legs = legsOf('CAMRN5', 'ALL');
    expect(legs.map((leg) => leg.fix)).toEqual([
      'SIE',
      'BOTON',
      'HOGGS',
      'PANZE',
      'KARRS',
      'CAMRN',
    ]);
    expect(legs.map((leg) => leg.pathTerminator)).toEqual(['IF', 'TF', 'TF', 'TF', 'TF', 'TF']);
    // The 18000 on the first record is the transition altitude, not a constraint.
    expect(legs[0]!.altitude).toBeUndefined();
  });

  it('parses the ILS 22L final approach and missed approach', () => {
    const [intermediate, faf, map, climb, chant, hold] = legsOf('I22L', '');

    expect(intermediate).toMatchObject({
      fix: 'ROSLY',
      role: 'if',
      altitude: { type: 'atOrAbove', ft: 3000 },
      glideslopeInterceptFt: 1800,
    });
    expect(faf).toMatchObject({ fix: 'ZALPO', role: 'faf', courseDeg: 224, distanceNm: 5.2 });
    expect(map).toMatchObject({
      fix: 'RW22L',
      fixSection: 'PG',
      role: 'map',
      verticalAngleDeg: -3,
    });
    expect(climb).toMatchObject({
      pathTerminator: 'CA',
      startsMissedApproach: true,
      courseDeg: 223.8,
      altitude: { type: 'atOrAbove', ft: 500 },
    });
    expect(chant).toMatchObject({
      fix: 'CHANT',
      pathTerminator: 'CF',
      startsMissedApproach: false,
    });
    expect(hold).toMatchObject({ pathTerminator: 'HM', turnDirection: 'right', holdMinutes: 1 });
  });

  it('parses the TNNIS6 runway 13 departure with speed and altitude limits', () => {
    const [intercept, jutes, tnnis, manual] = legsOf('TNNIS6', 'RW13');

    expect(intercept).toMatchObject({ pathTerminator: 'VI', courseDeg: 134.1 });
    expect(jutes).toMatchObject({
      fix: 'JUTES',
      altitude: { type: 'atOrAbove', ft: 3000 },
      speed: { type: 'atOrBelow', kts: 220 },
    });
    expect(tnnis).toMatchObject({ fix: 'TNNIS', altitude: { type: 'atOrAbove', ft: 5000 } });
    expect(manual).toMatchObject({ pathTerminator: 'FM', courseDeg: 45 });
  });
});
