import type { AirspaceBuildConfig } from '../lib/build-airspace';

/** Chicago TRACON (C90): O'Hare and Midway. */
export const chicago: AirspaceBuildConfig = {
  id: 'chicago',
  name: 'Chicago',
  facility: 'C90',
  description:
    'Chicago TRACON and the surrounding Center airspace: arrivals, departures and overflights for O’Hare and Midway.',
  approachCallsign: 'Chicago Approach',
  departureCallsign: 'Chicago Departure',
  airports: ['KORD', 'KMDW'],
  center: { lat: 41.88, lon: -87.83 },
  boundaryRadiusNm: 150,
  boundaryCeilingFt: 45_000,
  mapRadiusNm: 165,
  detailedShorelineRadiusNm: 60,
  homeCenter: 'ZAU',
  adjacentCenters: ['ZMP', 'ZKC', 'ZID', 'ZOB'],
  centerNames: {
    ZAU: 'Chicago Center',
    ZMP: 'Minneapolis Center',
    ZKC: 'Kansas City Center',
    ZID: 'Indianapolis Center',
    ZOB: 'Cleveland Center',
  },
  mvaCharts: ['C90_MVA_FUS3', 'MKE_MVA_FUS3', 'RFD_MVA_FUS3', 'SBN_MVA_FUS3', 'CMI_MVA_FUS3'],
  miaCharts: ['ZAU_TAV', 'ZMP_TAV', 'ZKC_TAV', 'ZID_TAV', 'ZOB_TAV'],
  // The Chicago TRACON's own sites (O'Hare and DuPage) plus Milwaukee, Rockford and South Bend.
  mainRadars: ['ORD', 'DPA', 'MKE', 'RFD', 'SBN'],
  primaryRadarAirport: 'ORD',
  towerNames: { 'O HARE': 'O’Hare' },
};
