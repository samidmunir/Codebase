import {
  assessHandoff,
  bearingTrue,
  destinationPoint,
  distanceNm,
  groundSpeedKts,
  headingDifference,
  isOnStar,
  magneticToTrue,
  trueToMagnetic,
  type AircraftState,
  type AtcCommand,
  type IlsClearance,
} from '@vector/sim-core';
import { centerHandoff, ilsClearance, isDeparting } from '../commands/command-options';
import type { ScopeSession } from '../sim/scope-session';

/** Arrivals are brought down this far from their airport, to this altitude and speed. */
const DESCEND_WITHIN_NM = 70;
const APPROACH_ALTITUDE_FT = 10_000;
const DESCENT_SPEED_KTS = 250;
/** Off a STAR farther out still, at least this low. */
const CRUISE_DESCENT_FT = 17_000;
/** The ILS is only tried this close in and this low (no pilot accepts it farther out). */
const ILS_WITHIN_NM = 30;
const ILS_BELOW_FT = 12_000;
/** Arrivals this close in are vectored to final rather than left on their STAR. */
const VECTOR_WITHIN_NM = 35;
/** The base point: this far out along the final, this far to the side of it. */
const BASE_ALONG_NM = 16;
const BASE_OFFSET_NM = 6;
const BASE_REACHED_NM = 2.5;
/** Where the intercept heading aims, on the final, from the threshold. */
const JOIN_ALONG_NM = 8;
const BASE_ALTITUDE_FT = 4_000;
const INTERCEPT_ALTITUDE_FT = 3_000;
const BASE_SPEED_KTS = 210;
const INTERCEPT_SPEED_KTS = 180;
/** Headings within this of the one wanted aren't worth another call. */
const HEADING_SLACK_DEG = 4;
/** Each aircraft's handoff is looked at no more often than this (sim seconds). */
const HANDOFF_CHECK_SEC = 20;

/** When each aircraft's handoff may next be looked at (tick), per session. */
const handoffChecks = new WeakMap<object, Map<string, number>>();

/**
 * A stand-in controller for the front page's live scope: it releases departures
 * and climbs them, brings arrivals down and clears them for the ILS when the pilot
 * would accept, and hands traffic to Center when Center would take it. Not a good
 * controller, just enough to keep traffic moving.
 */
export function runDemoController(
  session: ScopeSession,
  /** Aircraft a visitor is working (the landing page's try-it): left alone. */
  leaveAlone?: (aircraftId: string) => boolean,
): void {
  const { engine, pack } = session;
  const give = (id: string, commands: AtcCommand[]) => {
    if (leaveAlone?.(id)) return;
    if (engine.pendingInstructions(id).length > 0) return;
    // If the pilot can't take all of it (a speed, say), give what they can.
    const withoutSpeed = commands.filter((command) => command.type !== 'speed');
    for (const attempt of [commands, withoutSpeed])
      if (attempt.length > 0 && engine.checkInstruction(id, attempt).ok) {
        engine.issueInstruction(id, attempt);
        return;
      }
  };

  for (const entry of engine.departureQueue) {
    const runway = engine.activeRunways[entry.airport]?.departures[0];
    if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick && runway)
      engine.releaseDeparture(entry.id, runway);
  }

  // Whether Center will take an aircraft is costly to work out, and it never takes
  // one below its handoff altitudes: ask only once high enough, and not every time.
  const lowestHandoffFt = Math.min(
    engine.settings['center.handoffMinimumEastboundFt'],
    engine.settings['center.handoffMinimumWestboundFt'],
  );
  let nextCheck = handoffChecks.get(engine);
  if (!nextCheck) handoffChecks.set(engine, (nextCheck = new Map()));
  const checkEvery = Math.max(1, Math.round(HANDOFF_CHECK_SEC / engine.config.tickSeconds));

  for (const aircraft of engine.listAircraft()) {
    if (aircraft.owner !== engine.playerId) continue;
    if (isDeparting(pack, aircraft)) {
      const requested = aircraft.flightPlan.requestedAltitudeFt;
      const due =
        aircraft.altitudeFt >= lowestHandoffFt && (nextCheck.get(aircraft.id) ?? 0) <= engine.tick;
      const assessment = due ? assessHandoff(pack, aircraft, engine.settings) : undefined;
      if (assessment) {
        // Far from the boundary: look again about when it could be in the window.
        const outsideNm =
          (assessment.toBoundaryNm ?? 0) - engine.settings['center.handoffWindowNm'];
        const ticksAway =
          outsideNm > 0
            ? ((outsideNm / Math.max(groundSpeedKts(aircraft), 100)) * 3600 * 0.8) /
              engine.config.tickSeconds
            : 0;
        nextCheck.set(aircraft.id, engine.tick + Math.max(checkEvery, Math.round(ticksAway)));
      }
      const handoff = assessment?.ok ? centerHandoff(pack, aircraft, engine.settings) : undefined;
      if (handoff) give(aircraft.id, [handoff]);
      else if (
        requested &&
        aircraft.targets.altitudeFt < requested &&
        aircraft.verticalSpeedFpm === 0
      )
        give(aircraft.id, [{ type: 'altitude', altitudeFt: requested }]);
      continue;
    }
    if (aircraft.navigation.mode === 'approach') continue;
    const airport = aircraft.flightPlan.destination;
    if (!pack.airspace.airports.includes(airport)) continue;
    const fromAirport = distanceNm(aircraft.position, pack.airport(airport).position);
    const runways = (engine.activeRunways[airport]?.arrivals ?? [])
      .map((runway) => ilsClearance(pack, airport, runway))
      .filter((clearance) => clearance !== undefined);
    // Checking eligibility is costly, and only ever passes close in and low down.
    if (fromAirport < ILS_WITHIN_NM && aircraft.altitudeFt <= ILS_BELOW_FT) {
      const cleared = runways.find((clearance) => engine.ilsEligibility(aircraft.id, clearance).ok);
      if (cleared) {
        give(aircraft.id, [{ type: 'clearedIls', clearance: cleared }]);
        vectoring.get(engine)?.delete(aircraft.id);
        continue;
      }
    }
    // Close in: vectors to a base point beside the final, then onto the localizer.
    const clearance = runways[spread(aircraft.id) % Math.max(1, runways.length)];
    if (clearance && fromAirport < VECTOR_WITHIN_NM) {
      vectorToFinal(session, aircraft, clearance, give);
      continue;
    }
    // Farther out: down and slower in good time, so it reaches base ready to turn in.
    if (fromAirport < DESCEND_WITHIN_NM) {
      const commands: AtcCommand[] = [];
      if (aircraft.targets.altitudeFt > APPROACH_ALTITUDE_FT)
        commands.push({ type: 'altitude', altitudeFt: APPROACH_ALTITUDE_FT });
      if (aircraft.targets.iasKts > DESCENT_SPEED_KTS)
        commands.push({ type: 'speed', iasKts: DESCENT_SPEED_KTS });
      if (commands.length > 0) give(aircraft.id, commands);
    } else if (!isOnStar(aircraft) && fromAirport < DESCEND_WITHIN_NM * 1.5) {
      // Off its STAR (or never on one): at least start it down.
      if (aircraft.targets.altitudeFt > CRUISE_DESCENT_FT)
        give(aircraft.id, [{ type: 'altitude', altitudeFt: CRUISE_DESCENT_FT }]);
    }
  }
}

/** Arrivals turned onto final ("intercept"), per session; the rest are heading for base. */
const vectoring = new WeakMap<object, Map<string, 'intercept'>>();

/** A steady number per aircraft, to share arrivals between runways. */
const spread = (id: string) => [...id].reduce((n, c) => n + c.charCodeAt(0), 0);

/**
 * Two legs, like a controller's base and intercept: fly to a point off to the side
 * of the final, then head for the localizer well out from the runway, at an angle
 * the pilot will accept the approach from.
 */
function vectorToFinal(
  session: ScopeSession,
  aircraft: Readonly<AircraftState>,
  clearance: IlsClearance,
  give: (id: string, commands: AtcCommand[]) => void,
) {
  const { engine, pack } = session;
  const variation = pack.airspace.magneticVariationDeg;
  const outbound = (magneticToTrue(clearance.courseDeg, variation) + 180) % 360;
  const abeam = destinationPoint(clearance.threshold, outbound, BASE_ALONG_NM);
  const sides = [90, 270].map((turn) =>
    destinationPoint(abeam, (outbound + turn) % 360, BASE_OFFSET_NM),
  );
  const base =
    distanceNm(aircraft.position, sides[0]!) <= distanceNm(aircraft.position, sides[1]!)
      ? sides[0]!
      : sides[1]!;
  const join = destinationPoint(clearance.threshold, outbound, JOIN_ALONG_NM);

  let stages = vectoring.get(engine);
  if (!stages) vectoring.set(engine, (stages = new Map()));
  if (!stages.has(aircraft.id) && distanceNm(aircraft.position, base) < BASE_REACHED_NM)
    stages.set(aircraft.id, 'intercept');
  const intercepting = stages.has(aircraft.id);

  const target = intercepting ? join : base;
  const magnetic = Math.round(trueToMagnetic(bearingTrue(aircraft.position, target), variation));
  const headingDeg = ((magnetic + 359) % 360) + 1;
  const altitudeFt = intercepting ? INTERCEPT_ALTITUDE_FT : BASE_ALTITUDE_FT;
  const iasKts = intercepting ? INTERCEPT_SPEED_KTS : BASE_SPEED_KTS;
  const commands: AtcCommand[] = [];
  if (Math.abs(headingDifference(aircraft.targets.headingDeg, headingDeg)) > HEADING_SLACK_DEG)
    commands.push({ type: 'heading', headingDeg, turn: 'shortest' });
  if (aircraft.targets.altitudeFt > altitudeFt) commands.push({ type: 'altitude', altitudeFt });
  if (aircraft.targets.iasKts > iasKts) commands.push({ type: 'speed', iasKts });
  if (commands.length > 0) give(aircraft.id, commands);
}
