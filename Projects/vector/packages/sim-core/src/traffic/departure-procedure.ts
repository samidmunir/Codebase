import type { ResolvedLeg } from '../aircraft/aircraft';
import type { AirspacePack } from '../airspace/airspace-pack';
import type { ProcedureLeg, RouteSegment } from '../airspace/schema';
import { headingDifference } from '../math/angles';
import { bearingTrue } from '../math/geo';

export interface DepartureProcedure {
  /** Name as filed, e.g. 'TNNIS6', or 'Runway heading' for a radar-vector departure. */
  name: string;
  /** The coded SID, if one is flown. */
  sid: string | undefined;
  legs: ResolvedLeg[];
}

/** A SID is used only if it leaves within this angle of the departure gate. */
const MAX_SID_GATE_ANGLE_DEG = 60;
/** Radar-vector departures fly runway heading to this height above the field before expecting vectors. */
const VECTOR_DEPARTURE_CLIMB_FT = 500;

/** Resolves procedure legs to positions the aircraft can fly without airspace data. */
export function resolveLegs(
  pack: AirspacePack,
  airport: string,
  legs: readonly ProcedureLeg[],
): ResolvedLeg[] {
  const resolved: ResolvedLeg[] = [];
  for (const leg of legs) {
    const position = leg.fix
      ? pack.fix(leg.fix)?.position
      : leg.runway
        ? pack.runway(airport, leg.runway).threshold
        : undefined;
    // An initial fix repeating the previous leg's fix (segment joins) adds nothing.
    if (leg.pathTerminator === 'IF' && leg.fix && resolved.at(-1)?.fix === leg.fix) continue;
    const altitudeFt =
      leg.altitude?.type === 'at' || leg.altitude?.type === 'atOrAbove'
        ? leg.altitude.ft
        : undefined;
    const speedLimitKts =
      leg.speed && (leg.speed.type === 'atOrBelow' || leg.speed.type === 'at')
        ? leg.speed.kts
        : undefined;
    resolved.push({
      pathTerminator: leg.pathTerminator,
      ...(leg.fix ? { fix: leg.fix } : {}),
      ...(position ? { position } : {}),
      ...(leg.courseDeg !== undefined ? { courseDeg: leg.courseDeg } : {}),
      ...(leg.turnDirection ? { turnDirection: leg.turnDirection } : {}),
      ...(altitudeFt !== undefined ? { altitudeFt } : {}),
      ...(leg.distanceNm !== undefined ? { distanceNm: leg.distanceNm } : {}),
      ...(speedLimitKts !== undefined ? { speedLimitKts } : {}),
    });
  }
  return resolved;
}

/** Fly runway heading, then expect radar vectors (how New York's radar-vector SIDs work). */
export function runwayHeadingDeparture(
  pack: AirspacePack,
  airport: string,
  runwayId: string,
): DepartureProcedure {
  const runway = pack.runway(airport, runwayId);
  const heading = Math.round(runway.magneticHeadingDeg) % 360 || 360;
  return {
    name: 'Runway heading',
    sid: undefined,
    legs: [
      {
        pathTerminator: 'VA',
        courseDeg: heading,
        altitudeFt: runway.thresholdElevationFt + VECTOR_DEPARTURE_CLIMB_FT,
      },
      { pathTerminator: 'VM', courseDeg: heading },
    ],
  };
}

/**
 * The departure procedure for a runway and exit gate: the coded SID (and exit
 * transition) that leaves closest to the gate, or runway heading when no SID
 * serves the runway in that direction.
 */
export function departureProcedure(
  pack: AirspacePack,
  airport: string,
  runwayId: string,
  gateFix: string,
): DepartureProcedure {
  const origin = pack.airport(airport).position;
  const gate = pack.fix(gateFix);
  if (!gate) return runwayHeadingDeparture(pack, airport, runwayId);
  const gateBearing = bearingTrue(origin, gate.position);

  let best: { procedure: DepartureProcedure; angle: number } | undefined;
  for (const sid of pack.departures.filter((d) => d.airport === airport)) {
    const runwayTransition = sid.runwayTransitions.find((t) => t.runways?.includes(runwayId));
    if (!runwayTransition) continue;
    const exits: (RouteSegment | undefined)[] =
      sid.enrouteTransitions.length > 0 ? sid.enrouteTransitions : [undefined];

    for (const exit of exits) {
      const legs = resolveLegs(pack, airport, [
        ...runwayTransition.legs,
        ...sid.commonRoutes.flatMap((route) => route.legs),
        ...(exit?.legs ?? []),
      ]);
      const last = [...legs].reverse().find((leg) => leg.position && leg.fix);
      if (!last?.position) continue;
      const angle = Math.abs(headingDifference(gateBearing, bearingTrue(origin, last.position)));
      if (!best || angle < best.angle) {
        best = { procedure: { name: sid.id, sid: sid.id, legs }, angle };
      }
    }
  }
  return best && best.angle <= MAX_SID_GATE_ANGLE_DEG
    ? best.procedure
    : runwayHeadingDeparture(pack, airport, runwayId);
}
