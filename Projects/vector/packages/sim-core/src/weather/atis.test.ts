import { describe, expect, it } from 'vitest';
import { atisOutdated, atisText, metarBody, nextAtisLetter, type Atis } from './atis';

const RAW = 'METAR KJFK 280151Z 03016KT 7SM -DZ OVC011 17/16 A2974 RMK AO2 SLP070 T01670156 $';
const current: Atis = {
  letter: 'B',
  issuedTick: 0,
  wind: { directionDeg: 40, speedKts: 16 },
  configId: '4s-dual',
  text: '',
};
const unchanged = { wind: { directionDeg: 40, speedKts: 16 }, configId: '4s-dual' };

describe('ATIS', () => {
  it('moves to the next letter, Zulu back to Alfa', () => {
    expect(nextAtisLetter('B')).toBe('C');
    expect(nextAtisLetter('Z')).toBe('A');
  });

  it('takes the weather part of a METAR', () => {
    expect(metarBody(RAW)).toBe('03016KT 7SM -DZ OVC011 17/16 A2974');
    expect(metarBody('SPECI KLGA 280215Z AUTO 04014G23KT 5SM BR OVC010 17/16 A2975')).toBe(
      '04014G23KT 5SM BR OVC010 17/16 A2975',
    );
  });

  it('reads like a digital ATIS', () => {
    expect(
      atisText({
        airport: 'JFK',
        letter: 'B',
        timeZ: '0151',
        wind: { directionDeg: 40, speedKts: 16 },
        report: {
          icao: 'KJFK',
          observedAt: '2026-09-28T01:51:00.000Z',
          raw: RAW,
          windDirectionTrueDeg: 30,
          windSpeedKts: 16,
        },
        arrivals: ['04R', '04L'],
        departures: ['04L'],
        ilsRunways: ['04R', '04L'],
      }),
    ).toBe(
      'JFK ATIS INFO B 0151Z. 03016KT 7SM -DZ OVC011 17/16 A2974. ILS RUNWAYS 4R AND 4L APPROACHES IN USE. ' +
        'LANDING RUNWAYS 4R, 4L. DEPARTING RUNWAY 4L. ADVISE ON INITIAL CONTACT YOU HAVE INFO B.',
    );
    // Without a weather report: the wind it is using.
    expect(
      atisText({
        airport: 'LGA',
        letter: 'K',
        timeZ: '1400',
        wind: { directionDeg: 220, speedKts: 14, gustKts: 26 },
        arrivals: ['22'],
        departures: ['13'],
        ilsRunways: ['22'],
      }),
    ).toContain('WIND 220 AT 14 GUSTS 26. ILS RUNWAY 22 APPROACH IN USE. LANDING RUNWAY 22.');
  });

  it('is reissued for new runways, a new report, a big wind change or after an hour', () => {
    expect(atisOutdated(undefined, unchanged, 0, 1)).toBe(true);
    expect(atisOutdated(current, unchanged, 600, 1)).toBe(false);
    expect(atisOutdated(current, { ...unchanged, configId: '22s' }, 600, 1)).toBe(true);
    expect(
      atisOutdated(current, { ...unchanged, wind: { directionDeg: 60, speedKts: 18 } }, 600, 1),
    ).toBe(false);
    expect(
      atisOutdated(current, { ...unchanged, wind: { directionDeg: 70, speedKts: 16 } }, 600, 1),
    ).toBe(true);
    expect(
      atisOutdated(current, { ...unchanged, wind: { directionDeg: 40, speedKts: 22 } }, 600, 1),
    ).toBe(true);
    expect(atisOutdated(current, unchanged, 3_600, 1)).toBe(true);
    const report = {
      icao: 'KJFK',
      observedAt: '2026-09-28T02:51:00.000Z',
      raw: RAW,
      windDirectionTrueDeg: 30,
      windSpeedKts: 16,
    };
    expect(
      atisOutdated(
        { ...current, reportObservedAt: report.observedAt },
        { ...unchanged, report },
        600,
        1,
      ),
    ).toBe(false);
    expect(
      atisOutdated(
        { ...current, reportObservedAt: '2026-09-28T01:51:00.000Z' },
        { ...unchanged, report },
        600,
        1,
      ),
    ).toBe(true);
  });
});
