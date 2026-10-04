import type { AirspaceBuildConfig } from '../lib/build-airspace';

/** Dallas/Fort Worth TRACON (D10): DFW and Love Field. */
export const dallas: AirspaceBuildConfig = {
  id: 'dallas',
  name: 'Dallas–Fort Worth',
  facility: 'D10',
  description:
    'Dallas/Fort Worth TRACON and the surrounding Center airspace: arrivals, departures and overflights for DFW and Love Field.',
  approachCallsign: 'Regional Approach',
  departureCallsign: 'Regional Departure',
  airports: ['KDFW', 'KDAL'],
  center: { lat: 32.87, lon: -96.95 },
  boundaryRadiusNm: 150,
  boundaryCeilingFt: 45_000,
  mapRadiusNm: 165,
  detailedShorelineRadiusNm: 60,
  homeCenter: 'ZFW',
  adjacentCenters: ['ZHU', 'ZKC', 'ZME', 'ZAB'],
  centerNames: {
    ZFW: 'Fort Worth Center',
    ZHU: 'Houston Center',
    ZKC: 'Kansas City Center',
    ZME: 'Memphis Center',
    ZAB: 'Albuquerque Center',
  },
  mvaCharts: [
    'D10_MVA_FUS3',
    'ACT_MVA_FUS3',
    'GGG_MVA_FUS3',
    'ABI_MVA_FUS3',
    'OKC_MVA_FUS3',
    'SHV_MVA_FUS3',
  ],
  miaCharts: ['ZFW_TAV', 'ZHU_TAV', 'ZKC_TAV', 'ZME_TAV', 'ZAB_TAV'],
  // D10's own sites (DFW, the Fort Worth naval air station and Greenville) plus Waco and Longview.
  mainRadars: ['DFW', 'NFW', 'GVT', 'ACT', 'GGG'],
  primaryRadarAirport: 'DFW',
  towerNames: { DFW: 'DFW', LOVE: 'Love' },
  towerSectors: {
    KDFW: {
      EAST: ['13L', '31R', '17C', '35C', '17L', '35R'],
      WEST: ['13R', '31L', '18L', '36R', '18R', '36L', '17R', '35L'],
    },
  },
};
