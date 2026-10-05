import { distanceNm, isOnStar, type AtcCommand } from '@vector/sim-core';
import { centerHandoff, ilsClearance, isDeparting } from '../commands/command-options';
import type { ScopeSession } from '../sim/scope-session';

/** Arrivals are brought down this far from their airport, to this altitude. */
const DESCEND_WITHIN_NM = 45;
const APPROACH_ALTITUDE_FT = 5_000;

/**
 * A stand-in controller for the front page's live scope: it releases departures
 * and climbs them, brings arrivals down and clears them for the ILS when the pilot
 * would accept, and hands traffic to Center when Center would take it. Not a good
 * controller, just enough to keep traffic moving.
 */
export function runDemoController(session: ScopeSession): void {
  const { engine, pack } = session;
  const give = (id: string, commands: AtcCommand[]) => {
    if (engine.pendingInstructions(id).length === 0 && engine.checkInstruction(id, commands).ok)
      engine.issueInstruction(id, commands);
  };

  for (const entry of engine.departureQueue) {
    const runway = engine.activeRunways[entry.airport]?.departures[0];
    if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick && runway)
      engine.releaseDeparture(entry.id, runway);
  }

  for (const aircraft of engine.listAircraft()) {
    if (aircraft.owner !== engine.playerId) continue;
    const handoff = centerHandoff(pack, aircraft, engine.settings);
    if (isDeparting(pack, aircraft)) {
      const requested = aircraft.flightPlan.requestedAltitudeFt;
      if (handoff && engine.checkInstruction(aircraft.id, [handoff]).ok)
        give(aircraft.id, [handoff]);
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
    for (const runway of engine.activeRunways[airport]?.arrivals ?? []) {
      const clearance = ilsClearance(pack, airport, runway);
      if (clearance && engine.ilsEligibility(aircraft.id, clearance).ok) {
        give(aircraft.id, [{ type: 'clearedIls', clearance }]);
        break;
      }
    }
    const near = distanceNm(aircraft.position, pack.airport(airport).position) < DESCEND_WITHIN_NM;
    if (near && !isOnStar(aircraft) && aircraft.targets.altitudeFt > APPROACH_ALTITUDE_FT)
      give(aircraft.id, [{ type: 'altitude', altitudeFt: APPROACH_ALTITUDE_FT }]);
  }
}
