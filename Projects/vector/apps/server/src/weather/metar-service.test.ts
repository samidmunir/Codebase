import { describe, expect, it, vi } from 'vitest';
import { metarService, toObservation, WeatherUnavailableError } from './metar-service';

/** Records as aviationweather.gov returns them (trimmed). */
const KJFK = {
  icaoId: 'KJFK',
  obsTime: 1790560260,
  rawOb: 'METAR KJFK 280151Z 03016KT 7SM -DZ OVC011 17/16 A2974',
  wdir: 30,
  wspd: 16,
  visib: 7,
  altim: 1007.2,
  temp: 16.7,
  dewp: 15.6,
  fltCat: 'MVFR',
  clouds: [{ cover: 'OVC', base: 1100 }],
};
const KLGA = {
  icaoId: 'KLGA',
  obsTime: 1790560260,
  rawOb: 'METAR KLGA 280151Z 04014G23KT 5SM -RA BR FEW007 BKN010 OVC015 17/16 A2975',
  wdir: 40,
  wspd: 14,
  wgst: 23,
  visib: '10+',
  clouds: [
    { cover: 'FEW', base: 700 },
    { cover: 'BKN', base: 1000 },
    { cover: 'OVC', base: 1500 },
  ],
};

const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('toObservation', () => {
  it('converts a METAR record', () => {
    expect(toObservation(KJFK)).toEqual({
      icao: 'KJFK',
      observedAt: '2026-09-28T01:51:00.000Z',
      raw: KJFK.rawOb,
      windDirectionTrueDeg: 30,
      windSpeedKts: 16,
      visibilitySm: 7,
      ceilingFt: 1100,
      altimeterInHg: 29.74,
      temperatureC: 16.7,
      dewpointC: 15.6,
      flightCategory: 'MVFR',
    });
  });

  it('reads gusts, 10+ visibility and the lowest broken layer', () => {
    expect(toObservation(KLGA)).toMatchObject({
      gustKts: 23,
      visibilitySm: 10,
      ceilingFt: 1000,
    });
  });

  it('treats variable and calm winds as having no direction, and skips unusable records', () => {
    expect(toObservation({ ...KJFK, wdir: 'VRB', wspd: 3 })!.windDirectionTrueDeg).toBeNull();
    expect(toObservation({ ...KJFK, wdir: 0, wspd: 0 })!.windDirectionTrueDeg).toBeNull();
    expect(toObservation({ ...KJFK, wspd: undefined })).toBeUndefined();
    expect(toObservation({ icaoId: 'KJFK' })).toBeUndefined();
  });
});

describe('metarService', () => {
  it('fetches the stations once and serves repeats from the cache until it is stale', async () => {
    let now = 0;
    const fetch = vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
      respond([KJFK, KLGA]),
    );
    const service = metarService({ fetch, cacheSeconds: 120, now: () => now });
    const first = await service.latest(['KJFK', 'KLGA']);
    expect(first.observations.map((o) => o.icao)).toEqual(['KJFK', 'KLGA']);
    expect(String(fetch.mock.calls[0]![0])).toContain('ids=KJFK,KLGA&format=json');
    now = 60_000;
    await service.latest(['KLGA', 'KJFK']);
    expect(fetch).toHaveBeenCalledTimes(1);
    now = 121_000;
    await service.latest(['KJFK', 'KLGA']);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shares one request among concurrent callers', async () => {
    const fetch = vi.fn(() => respond([KJFK]));
    const service = metarService({ fetch });
    await Promise.all([service.latest(['KJFK']), service.latest(['KJFK'])]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports the source failing, and an empty list when it has no reports', async () => {
    await expect(
      metarService({ fetch: () => respond({ error: 'down' }, 502) }).latest(['KJFK']),
    ).rejects.toBeInstanceOf(WeatherUnavailableError);
    await expect(
      metarService({ fetch: () => Promise.reject(new Error('offline')) }).latest(['KJFK']),
    ).rejects.toBeInstanceOf(WeatherUnavailableError);
    const empty = await metarService({
      fetch: () => Promise.resolve(new Response(null, { status: 204 })),
    }).latest(['KJFK']);
    expect(empty.observations).toEqual([]);
  });
});
