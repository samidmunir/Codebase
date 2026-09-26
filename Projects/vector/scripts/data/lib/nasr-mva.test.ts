import { describe, expect, it } from 'vitest';
import { parseMva } from './mva';
import {
  parseArtccBoundaries,
  parseCenterSites,
  parseDmsCoordinate,
  parseFrequencies,
} from './nasr';

describe('parseFrequencies', () => {
  it('reads quoted CSV fields by column name', () => {
    const csv = [
      '"FACILITY","SERVICED_FACILITY","TOWER_OR_COMM_CALL","FREQ","SECTORIZATION","FREQ_USE"',
      '"JFK","JFK","KENNEDY","119.1","RWY 04R/22L, 13L/31R","LCL/P"',
    ].join('\n');
    expect(parseFrequencies(csv)).toEqual([
      {
        facility: 'JFK',
        servicedFacility: 'JFK',
        callsign: 'KENNEDY',
        frequencyMhz: 119.1,
        sectorization: 'RWY 04R/22L, 13L/31R',
        use: 'LCL/P',
      },
    ]);
  });
});

describe('parseCenterSites', () => {
  const pad = (value: string, width: number) => value.padEnd(width);
  const aff1 =
    pad('AFF1ZNY NEW YORK', 48) +
    pad('COLTS NECK', 80) +
    'RCAG 09/03/2026NEW JERSEY                    NJ40-18-42.000N 145122.000N074-09-37.000W266977.000WKZNY';
  const aff3 = (frequency: string, altitude: string) =>
    pad('AFF3ZNY COLTS NECK', 38) + 'RCAG ' + pad(frequency, 8) + pad(altitude, 10);

  it('joins site positions with their VHF frequencies', () => {
    const content = [
      aff1,
      aff3('118.975', 'LOW'),
      aff3('125.325', 'HIGH'),
      aff3('282.3', 'HIGH'),
    ].join('\n');
    const [site] = parseCenterSites(content, 'ZNY');

    expect(site!.site).toBe('COLTS NECK');
    expect(site!.position.lat).toBeCloseTo(40.3117, 3);
    expect(site!.position.lon).toBeCloseTo(-74.1603, 3);
    // 282.3 is a military UHF frequency and is left out.
    expect(site!.frequencies).toEqual([
      { frequencyMhz: 118.975, altitude: 'low' },
      { frequencyMhz: 125.325, altitude: 'high' },
    ]);
  });
});

describe('parseMva', () => {
  it('reads sector altitudes and rings (longitude first)', () => {
    const xml = `<m:Msg><m:hasMember a:type="simple"><x:Airspace><x:name>A</x:name>
      <x:minimumLimit uom="FT">2000</x:minimumLimit>
      <g:exterior><g:LinearRing><g:posList>-74 40 -73 40 -73 41 -74 40</g:posList></g:LinearRing></g:exterior>
      <g:interior><g:LinearRing><g:posList>-73.8 40.2 -73.6 40.2 -73.6 40.4 -73.8 40.2</g:posList></g:LinearRing></g:interior>
      </x:Airspace></m:hasMember></m:Msg>`;
    expect(parseMva(xml)).toEqual([
      {
        name: 'A',
        minimumAltitudeFt: 2000,
        exterior: [
          [-74, 40],
          [-73, 40],
          [-73, 41],
          [-74, 40],
        ],
        holes: [
          [
            [-73.8, 40.2],
            [-73.6, 40.2],
            [-73.6, 40.4],
            [-73.8, 40.2],
          ],
        ],
      },
    ]);
  });
});

describe('parseArtccBoundaries', () => {
  const record = (artcc: string, level: string, lat: string, lon: string, text = 'TO') =>
    `${artcc} *${level[0]}*00001${'NEW YORK'.padEnd(40)}${level.padEnd(10)}${lat.padEnd(14)}${lon.padEnd(14)}${text}`;

  it('reads DMS coordinates', () => {
    expect(parseDmsCoordinate('39-41-00.0N')).toBeCloseTo(39.68333, 5);
    expect(parseDmsCoordinate('073-10-30.0W')).toBeCloseTo(-73.175, 5);
  });

  it('builds closed rings per center and stratum', () => {
    const content = [
      record('ZNY', 'HIGH', '39-00-00.0N', '073-00-00.0W'),
      record('ZNY', 'HIGH', '40-00-00.0N', '073-00-00.0W'),
      record('ZNY', 'HIGH', '40-00-00.0N', '074-00-00.0W', 'TO POINT OF BEGINNING'),
      record('ZNY', 'LOW', '39-00-00.0N', '073-00-00.0W'),
      record('ZNY', 'LOW', '40-00-00.0N', '073-00-00.0W'),
      record('ZNY', 'LOW', '40-00-00.0N', '074-00-00.0W', 'TO POINT OF BEGINNING'),
      record('ZAB', 'HIGH', '35-00-00.0N', '111-00-00.0W'),
    ].join('\n');
    const boundaries = parseArtccBoundaries(content, ['ZNY']);
    expect(boundaries.map((b) => [b.artcc, b.level, b.ring.length])).toEqual([
      ['ZNY', 'high', 4],
      ['ZNY', 'low', 4],
    ]);
    expect(boundaries[0]!.ring[0]).toEqual([-73, 39]);
    expect(boundaries[0]!.ring.at(-1)).toEqual([-73, 39]);
  });
});
