// TEMPORARY demo traffic so the radar scope has something to show before real
// traffic generation (Milestones 7 and 8) and aircraft commands (Milestone 6).
// Arrivals fly toward a point on an ILS final and turn onto the localizer;
// departures climb out and head for the boundary. Remove once real traffic lands.
import {
  altitudeWords,
  bearingTrue,
  destinationPoint,
  distanceNm,
  magneticToTrue,
  normalizeHeading,
  spokenCallsign,
  trueToMagnetic,
  type AircraftState,
  type AirspacePack,
  type LatLon,
  type SimEngine,
} from '@vector/sim-core';
import airlineData from '../../../../data/airlines/airlines.json';

const TELEPHONY = new Map(airlineData.airlines.map((airline) => [airline.icao, airline.telephony]));

const AIRLINES = [
  { code: 'JBU', types: ['A320', 'A321'] },
  { code: 'DAL', types: ['B739', 'A321', 'B752', 'A333'] },
  { code: 'AAL', types: ['A321', 'B738', 'B77W', 'B789'] },
  { code: 'UAL', types: ['B738', 'B739', 'B752', 'B763', 'B789'] },
  { code: 'BAW', types: ['B77W', 'B789'] },
  { code: 'RPA', types: ['E175'] },
  { code: 'EDV', types: ['CRJ9'] },
] as const;

const WIDEBODIES = new Set<string>(['B77W', 'B789', 'B763', 'A333']);

const ORIGINS = [
  'KATL',
  'KORD',
  'KMIA',
  'KBOS',
  'KLAX',
  'KDFW',
  'KCLT',
  'KDCA',
  'EGLL',
  'KSFO',
  'KDEN',
  'KMCO',
];

/** Demo flow: arrivals land on these runways, departures leave from these. */
const DEMO_FLOW: Record<string, { arrival: string; departure: string }> = {
  KJFK: { arrival: '22L', departure: '22R' },
  KLGA: { arrival: '22', departure: '13' },
  KEWR: { arrival: '22L', departure: '22R' },
};

const APPROACH = 'N90';
const FINAL_GATE_NM = 12;
const TARGET_AIRCRAFT = 16;

interface DemoPlan {
  kind: 'arrival' | 'departure';
  airport: string;
  runway: string;
  stage: 'inbound' | 'final' | 'climb' | 'outbound';
  exit?: LatLon;
  /** The player has given this aircraft an instruction: the demo stops flying it. */
  manual?: boolean;
}

export class DemoTraffic {
  private readonly plans = new Map<string, DemoPlan>();
  private nextSpawnSec = 0;

  constructor(
    private readonly engine: SimEngine,
    private readonly pack: AirspacePack,
  ) {
    engine.subscribe((event) => {
      if (event.type === 'instructionIssued') {
        const plan = this.plans.get(event.aircraftId);
        if (plan) plan.manual = true;
      }
      if (event.type === 'aircraftRemoved') this.plans.delete(event.aircraftId);
    });
  }

  private checkIn(aircraftId: string, facility: string) {
    const aircraft = this.engine.getAircraft(aircraftId)!;
    const altitude = altitudeWords(Math.round(aircraft.altitudeFt / 100) * 100);
    const target = aircraft.targets.altitudeFt;
    const trend =
      target > aircraft.altitudeFt + 100
        ? ` climbing ${altitudeWords(target)}`
        : target < aircraft.altitudeFt - 100
          ? ` descending ${altitudeWords(target)}`
          : '';
    this.engine.transmit(
      'pilot',
      aircraftId,
      `${facility}, ${spokenCallsign(aircraft.callsign, aircraft.telephony)}, ${altitude}${trend}.`,
    );
  }

  private get variation() {
    return this.pack.airspace.magneticVariationDeg;
  }

  private headingTo(from: LatLon, to: LatLon): number {
    return Math.round(trueToMagnetic(bearingTrue(from, to), this.variation)) % 360;
  }

  private callsign(): string {
    const random = this.engine.random;
    for (;;) {
      const airline = random.pick(AIRLINES);
      const callsign = `${airline.code}${random.int(100, 2999)}`;
      if (!this.engine.listAircraft().some((a) => a.callsign === callsign)) {
        return callsign;
      }
    }
  }

  private newFlight(airport: string) {
    const random = this.engine.random;
    // LaGuardia has no widebody service.
    const types = (airline: (typeof AIRLINES)[number]) =>
      airport === 'KLGA'
        ? airline.types.filter((type) => !WIDEBODIES.has(type))
        : [...airline.types];
    for (;;) {
      const callsign = this.callsign();
      const airline = AIRLINES.find((a) => callsign.startsWith(a.code))!;
      const candidates = types(airline);
      if (candidates.length === 0) continue;
      const squawk = Array.from({ length: 4 }, () => random.int(0, 7)).join('');
      return {
        callsign,
        ...(TELEPHONY.has(airline.code) ? { telephony: TELEPHONY.get(airline.code)! } : {}),
        aircraftType: random.pick(candidates),
        squawk: squawk.startsWith('7') ? `2${squawk.slice(1)}` : squawk,
      };
    }
  }

  /** Where the arrival should join final: FINAL_GATE_NM out on the extended centerline. */
  private finalGate(airport: string, runway: string): LatLon {
    const rwy = this.pack.runway(airport, runway);
    const outbound = normalizeHeading(magneticToTrue(rwy.ils!.courseDeg, this.variation) + 180);
    return destinationPoint(rwy.threshold, outbound, FINAL_GATE_NM);
  }

  spawnArrival(): void {
    const random = this.engine.random;
    const airport = random.pick(Object.keys(DEMO_FLOW));
    const runway = DEMO_FLOW[airport]!.arrival;
    const { center, boundary } = this.pack.airspace;

    // Enter from the direction of one of the airport's real arrival routes.
    const routes = this.pack.arrivals.filter((a) => a.airport === airport);
    const route = random.pick(routes);
    const firstFix = [...route.commonRoutes, ...route.enrouteTransitions]
      .flatMap((segment) => segment.legs)
      .map((leg) => (leg.fix ? this.pack.fix(leg.fix) : undefined))
      .find(Boolean);
    const bearing = firstFix ? bearingTrue(center, firstFix.position) : random.range(0, 360);
    const radius =
      (boundary.ring[0]
        ? distanceNm(center, { lon: boundary.ring[0][0], lat: boundary.ring[0][1] })
        : 45) - 1;
    const position = destinationPoint(center, bearing + random.range(-6, 6), radius);
    const gate = this.finalGate(airport, runway);

    const aircraft = this.engine.addAircraft({
      ...this.newFlight(airport),
      flightPlan: { origin: random.pick(ORIGINS), destination: airport, route: [route.id] },
      phase: 'arrival',
      owner: APPROACH,
      position,
      altitudeFt: random.pick([11_000, 12_000, 13_000, 14_000]),
      headingDeg: this.headingTo(position, gate),
      iasKts: 250,
      targets: { altitudeFt: random.pick([4_000, 5_000]), iasKts: 220 },
    });
    this.plans.set(aircraft.id, { kind: 'arrival', airport, runway, stage: 'inbound' });
    this.checkIn(aircraft.id, this.pack.airspace.controllers.approach.approachCallsign);
  }

  spawnDeparture(): void {
    const random = this.engine.random;
    const airport = random.pick(Object.keys(DEMO_FLOW));
    const runway = this.pack.runway(airport, DEMO_FLOW[airport]!.departure);
    const opposite = this.pack.runway(airport, runway.oppositeId);
    const exit = destinationPoint(this.pack.airspace.center, random.range(0, 360), 50);

    const aircraft = this.engine.addAircraft({
      ...this.newFlight(airport),
      flightPlan: { origin: airport, destination: random.pick(ORIGINS), route: [] },
      phase: 'departure',
      owner: `${airport}_TWR`,
      // Just airborne past the departure end of the runway.
      position: destinationPoint(opposite.threshold, runway.trueHeadingDeg, 0.5),
      altitudeFt: 600,
      headingDeg: Math.round(runway.magneticHeadingDeg) % 360,
      iasKts: 170,
      targets: { altitudeFt: 5_000, iasKts: 250 },
    });
    this.plans.set(aircraft.id, {
      kind: 'departure',
      airport,
      runway: runway.id,
      stage: 'climb',
      exit,
    });
  }

  /** Seeds traffic at several stages so the scope isn't empty at start. */
  seed(): void {
    // Run ~12 minutes of traffic so aircraft start spread along their routes.
    for (let t = 0; t < 720; t++) {
      this.engine.step();
      this.update();
    }
  }

  /** Call after each engine advance. */
  update(): void {
    const now = this.engine.simTimeSec;
    // Copy: fly() can remove aircraft.
    for (const aircraft of [...this.engine.listAircraft()]) {
      const plan = this.plans.get(aircraft.id);
      if (plan) this.fly(aircraft, plan);
    }
    if (now >= this.nextSpawnSec && this.engine.listAircraft().length < TARGET_AIRCRAFT) {
      if (this.engine.random.chance(0.65)) this.spawnArrival();
      else this.spawnDeparture();
      this.nextSpawnSec = now + this.engine.random.range(35, 70);
    }
  }

  private remove(id: string) {
    this.engine.removeAircraft(id);
    this.plans.delete(id);
  }

  private fly(aircraft: Readonly<AircraftState>, plan: DemoPlan): void {
    const { engine } = this;
    if (plan.manual) {
      // Under player control: only clean up aircraft that have left the airspace.
      if (distanceNm(this.pack.airspace.center, aircraft.position) > 55) this.remove(aircraft.id);
      return;
    }
    if (plan.kind === 'arrival') {
      const runway = this.pack.runway(plan.airport, plan.runway);
      if (plan.stage === 'inbound') {
        const gate = this.finalGate(plan.airport, plan.runway);
        if (distanceNm(aircraft.position, gate) < 2) {
          plan.stage = 'final';
          engine.setTargets(aircraft.id, {
            headingDeg: Math.round(runway.ils!.courseDeg) % 360,
            altitudeFt: 0,
            iasKts: 150,
          });
          engine.setOwner(aircraft.id, `${plan.airport}_TWR`);
          engine.setPhase(aircraft.id, 'approach');
        } else if (engine.tick % 10 === 0) {
          engine.setTargets(aircraft.id, { headingDeg: this.headingTo(aircraft.position, gate) });
        }
      } else if (
        distanceNm(aircraft.position, runway.threshold) < 0.3 ||
        aircraft.altitudeFt <= runway.thresholdElevationFt + 50
      ) {
        this.remove(aircraft.id);
      } else if (engine.tick % 5 === 0) {
        // Stay on the extended centerline and descend on a ~3° path.
        const toThreshold = this.headingTo(aircraft.position, runway.threshold);
        const glidepath = distanceNm(aircraft.position, runway.threshold) * 318;
        engine.setTargets(aircraft.id, {
          headingDeg: toThreshold,
          altitudeFt: Math.max(0, Math.round(glidepath)),
        });
      }
      return;
    }

    if (plan.stage === 'climb' && aircraft.altitudeFt >= 1_500) {
      plan.stage = 'outbound';
      engine.setOwner(aircraft.id, APPROACH);
      engine.setPhase(aircraft.id, 'enroute');
      engine.setTargets(aircraft.id, {
        altitudeFt: 13_000,
        headingDeg: this.headingTo(aircraft.position, plan.exit!),
      });
      this.checkIn(aircraft.id, this.pack.airspace.controllers.approach.departureCallsign);
    } else if (plan.stage === 'outbound') {
      if (distanceNm(this.pack.airspace.center, aircraft.position) > 46) this.remove(aircraft.id);
      else if (engine.tick % 15 === 0)
        engine.setTargets(aircraft.id, {
          headingDeg: this.headingTo(aircraft.position, plan.exit!),
        });
    }
  }
}
