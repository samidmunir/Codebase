import type { AirspaceBuildConfig } from '../lib/build-airspace';

/** New York TRACON (N90): Kennedy, LaGuardia and Newark. */
export const newYork: AirspaceBuildConfig = {
  id: 'new-york',
  name: 'New York',
  facility: 'N90',
  description:
    'New York TRACON and the surrounding Center airspace: arrivals, departures and overflights for Kennedy, LaGuardia and Newark.',
  approachCallsign: 'New York Approach',
  departureCallsign: 'New York Departure',
  airports: ['KJFK', 'KLGA', 'KEWR'],
  center: { lat: 40.72, lon: -73.95 },
  boundaryRadiusNm: 150,
  boundaryCeilingFt: 45_000,
  mapRadiusNm: 165,
  detailedShorelineRadiusNm: 60,
  homeCenter: 'ZNY',
  adjacentCenters: ['ZBW', 'ZDC', 'ZOB'],
  centerNames: {
    ZNY: 'New York Center',
    ZBW: 'Boston Center',
    ZDC: 'Washington Center',
    ZOB: 'Cleveland Center',
  },
  mvaCharts: ['N90_MVA_FUS3', 'PHL_MVA_FUS3'],
  miaCharts: ['ZNY_TAV', 'ZBW_TAV', 'ZDC_TAV', 'ZOB_TAV'],
  // The New York TRACON's own sites plus Philadelphia.
  mainRadars: ['JFK', 'EWR', 'ISP', 'HPN', 'PHL'],
  primaryRadarAirport: 'JFK',
  towerNames: { LAGUARDIA: 'LaGuardia' },
};
