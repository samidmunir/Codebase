import { describe, expect, it } from 'vitest';
import { parseMva } from './mva';
import { parseCenterSites, parseFrequencies } from './nasr';

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
