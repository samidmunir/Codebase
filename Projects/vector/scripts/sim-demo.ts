// Runs the sim engine headlessly and prints a few aircraft flying their instructions.
//   npm run sim:demo
import {
  groundSpeedKts,
  parsePerformanceCatalog,
  SimEngine,
  type AircraftState,
  type SimEvent,
} from '@vector/sim-core';
import performanceData from '../data/aircraft-types/performance.json';

const engine = SimEngine.create({
  performance: parsePerformanceCatalog(performanceData),
  world: { magneticVariationDeg: -13 },
  seed: 2026,
  startTimeUtc: '2026-09-26T14:00:00Z',
});

engine.subscribe((event: SimEvent, tick) => {
  if (event.type === 'aircraftAdded' || event.type === 'aircraftRemoved') return;
  const callsign = engine.getAircraft(event.aircraftId)?.callsign ?? event.aircraftId;
  const detail =
    event.type === 'altitudeReached'
      ? `level at ${event.altitudeFt.toLocaleString()} ft`
      : event.type === 'headingReached'
        ? `on heading ${String(Math.round(event.headingDeg) || 360).padStart(3, '0')}`
        : `at ${Math.round(event.iasKts)} kts`;
  console.log(`  ${clock(tick)}  ▸ ${callsign} ${detail}`);
});

// A JFK departure climbing out east.
const jetblue = engine.addAircraft({
  callsign: 'JBU1024',
  aircraftType: 'A320',
  squawk: '4521',
  flightPlan: { origin: 'KJFK', destination: 'KBOS', route: [] },
  phase: 'enroute',
  owner: 'N90',
  position: { lat: 40.6602, lon: -73.7545 },
  altitudeFt: 2_500,
  headingDeg: 40,
  iasKts: 200,
});
engine.setTargets(jetblue.id, { headingDeg: 90, altitudeFt: 14_000, iasKts: 300 });

// A LaGuardia arrival descending, slowing and turning left.
const delta = engine.addAircraft({
  callsign: 'DAL412',
  aircraftType: 'B739',
  squawk: '3342',
  flightPlan: { origin: 'KATL', destination: 'KLGA', route: [] },
  phase: 'arrival',
  owner: 'N90',
  position: { lat: 40.95, lon: -73.45 },
  altitudeFt: 12_000,
  headingDeg: 250,
  iasKts: 280,
});
engine.setTargets(delta.id, {
  altitudeFt: 6_000,
  iasKts: 210,
  headingDeg: 200,
  turnDirection: 'left',
});

// A heavy JFK arrival slowing for the approach.
const speedbird = engine.addAircraft({
  callsign: 'BAW117',
  aircraftType: 'B77W',
  squawk: '2215',
  flightPlan: { origin: 'EGLL', destination: 'KJFK', route: [] },
  phase: 'arrival',
  owner: 'N90',
  position: { lat: 40.4, lon: -73.3 },
  altitudeFt: 8_000,
  headingDeg: 300,
  iasKts: 250,
});
engine.setTargets(speedbird.id, { headingDeg: 40, altitudeFt: 3_000, iasKts: 180 });

function clock(tick: number): string {
  const seconds = tick * engine.config.tickSeconds;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `T+${mm}:${ss}`;
}

function row(aircraft: Readonly<AircraftState>): string {
  const vs = aircraft.verticalSpeedFpm;
  const trend = vs > 0 ? '↑' : vs < 0 ? '↓' : ' ';
  return [
    aircraft.callsign.padEnd(8),
    aircraft.aircraftType.padEnd(5),
    `${aircraft.position.lat.toFixed(4)}N ${Math.abs(aircraft.position.lon).toFixed(4)}W`,
    `${String(Math.round(aircraft.altitudeFt / 100)).padStart(3, '0')}${trend}`,
    `${String(Math.round(vs)).padStart(5)} fpm`,
    `HDG ${String(Math.round(aircraft.headingDeg) || 360).padStart(3, '0')}`,
    `IAS ${String(Math.round(aircraft.iasKts)).padStart(3)}`,
    `GS ${String(Math.round(groundSpeedKts(aircraft))).padStart(3)}`,
  ].join('  ');
}

const DURATION_SEC = 5 * 60;
const REPORT_EVERY_SEC = 60;

for (let second = 0; second <= DURATION_SEC; second++) {
  if (second % REPORT_EVERY_SEC === 0) {
    console.log(`\n${clock(engine.tick)}  ${engine.utcTime.toISOString().slice(11, 19)}Z`);
    for (const aircraft of engine.listAircraft()) console.log(`  ${row(aircraft)}`);
    console.log('');
  }
  if (second < DURATION_SEC) engine.step();
}
