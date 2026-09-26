import { describe, expect, it } from 'vitest';
import airports from '../../../../data/airspaces/new-york/airports.json';
import airspace from '../../../../data/airspaces/new-york/airspace.json';
import navdata from '../../../../data/airspaces/new-york/navdata.json';
import procedures from '../../../../data/airspaces/new-york/procedures.json';
import traffic from '../../../../data/airspaces/new-york/traffic.json';
import videoMap from '../../../../data/airspaces/new-york/video-map.json';
import { cloneJson } from '../snapshot/clone';
import { distanceNm } from '../math/geo';
import { AirspaceDataError, AirspacePack, type AirspacePackFiles } from './airspace-pack';

const files: AirspacePackFiles = { airspace, airports, navdata, procedures, videoMap, traffic };
const pack = AirspacePack.parse(files);

describe('New York airspace pack', () => {
  it('validates and cross-checks', () => {
    expect(pack.airspace.id).toBe('new-york');
    expect(pack.airspace.airports).toEqual(['KJFK', 'KLGA', 'KEWR']);
  });

  it.each([
    // Airport reference points, from the FAA Chart Supplement.
    ['KJFK', { lat: 40.6399, lon: -73.7787 }],
    ['KLGA', { lat: 40.7772, lon: -73.8726 }],
    ['KEWR', { lat: 40.6925, lon: -74.1687 }],
  ])('places %s at its real position', (icao, position) => {
    expect(distanceNm(pack.airport(icao).position, position)).toBeLessThan(0.1);
  });

  it('has every runway at each airport', () => {
    const ids = (icao: string) => pack.airport(icao).runways.map((r) => r.id);
    expect(ids('KJFK')).toEqual(['04L', '04R', '13L', '13R', '22L', '22R', '31L', '31R']);
    expect(ids('KLGA')).toEqual(['04', '13', '22', '31']);
    expect(ids('KEWR')).toEqual(['04L', '04R', '11', '22L', '22R', '29']);
  });

  it('matches published runway data', () => {
    expect(pack.runway('KJFK', '13R').lengthFt).toBe(14511);
    expect(pack.runway('KJFK', '04L').lengthFt).toBe(12079);
    expect(pack.runway('KJFK', '04L').oppositeId).toBe('22R');
  });

  it('assigns tower frequencies by runway where the tower splits them', () => {
    expect(pack.runway('KJFK', '22L').towerFrequencyMhz).toBe(119.1);
    expect(pack.runway('KJFK', '22R').towerFrequencyMhz).toBe(123.9);
    expect(pack.runway('KLGA', '22').towerFrequencyMhz).toBe(118.7);
    expect(pack.runway('KEWR', '22L').towerFrequencyMhz).toBe(118.3);
    expect(pack.airport('KLGA').towerCallsign).toBe('LaGuardia Tower');
  });

  it('has 3° glideslopes and localizers aligned with their runways', () => {
    const ils = pack.airports.flatMap((a) => a.runways.flatMap((r) => (r.ils ? [r.ils] : [])));
    expect(ils.length).toBeGreaterThanOrEqual(15);
    for (const localizer of ils) {
      expect(localizer.glideslopeAngleDeg).toBeGreaterThanOrEqual(2.5);
      expect(localizer.glideslopeAngleDeg).toBeLessThanOrEqual(3.5);
    }
  });

  it('includes real arrival procedures with resolvable fixes', () => {
    const camrn = pack.arrivals.find((a) => a.id === 'CAMRN5');
    expect(camrn?.airport).toBe('KJFK');
    const fixes = camrn!.commonRoutes[0]!.legs.map((leg) => leg.fix);
    expect(fixes).toEqual(['SIE', 'BOTON', 'HOGGS', 'PANZE', 'KARRS', 'CAMRN']);
    expect(fixes.every((ident) => pack.fix(ident!))).toBe(true);
  });

  it('includes ILS approaches with missed approaches', () => {
    const [ils22l] = pack.ilsApproaches('KJFK', '22L');
    expect(ils22l).toMatchObject({ id: 'I22L', localizer: 'IIWY' });
    expect(ils22l!.final.at(-1)).toMatchObject({ runway: '22L', role: 'map' });
    expect(ils22l!.missedApproach.length).toBeGreaterThan(0);
  });

  it('includes the video map layers', () => {
    expect(pack.videoMap.shoreline.length).toBeGreaterThan(100);
    expect(pack.videoMap.classB).toHaveLength(16);
    expect(pack.videoMap.minimumVectoringAltitudes.length).toBeGreaterThan(40);
  });
});

describe('traffic profile', () => {
  it('has a traffic profile and runway configurations for every airport', () => {
    for (const icao of pack.airspace.airports) {
      expect(pack.traffic.airports[icao]!.runwayConfigs.length).toBeGreaterThan(0);
    }
  });

  it('keeps widebodies out of LaGuardia', () => {
    const types = pack.traffic.airports.KLGA!.airlines.flatMap((airline) => airline.types);
    expect(types.some((type) => ['B77W', 'B789', 'B763', 'A333'].includes(type))).toBe(false);
  });

  it('rejects a configuration landing on a runway without an ILS', () => {
    const broken = cloneJson(files) as { traffic: typeof traffic } & AirspacePackFiles;
    broken.traffic.airports.KLGA!.runwayConfigs[0]!.arrivals = ['31'];
    expect(() => AirspacePack.parse(broken)).toThrow(/arrival runway 31 has no ILS/);
  });
});

describe('AirspacePack cross-checks', () => {
  it('rejects procedures that reference unknown fixes', () => {
    const broken = cloneJson(files) as { procedures: typeof procedures } & AirspacePackFiles;
    broken.procedures.arrivals[0]!.commonRoutes[0]!.legs[0]!.fix = 'NOWHR';
    expect(() => AirspacePack.parse(broken)).toThrow(/unknown fix NOWHR/);
  });

  it('rejects a misaligned ILS', () => {
    const broken = cloneJson(files) as { airports: typeof airports } & AirspacePackFiles;
    const runway = broken.airports.airports[0]!.runways.find((r) => r.ils)!;
    runway.ils!.courseDeg = (runway.magneticHeadingDeg + 20) % 360;
    expect(() => AirspacePack.parse(broken)).toThrow(AirspaceDataError);
  });

  it('rejects an airport missing from airspace.json', () => {
    const broken = cloneJson(files) as { airspace: typeof airspace } & AirspacePackFiles;
    broken.airspace.airports = ['KJFK', 'KLGA'];
    expect(() => AirspacePack.parse(broken)).toThrow(/KEWR is not declared/);
  });
});
