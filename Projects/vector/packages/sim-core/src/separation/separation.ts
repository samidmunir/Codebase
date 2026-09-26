import { z } from 'zod';
import { groundSpeedKts, type AircraftState } from '../aircraft/aircraft';
import { finalApproachGeometry } from '../aircraft/navigation';
import { toRadians } from '../math/angles';
import { magneticToTrue } from '../math/geo';

// Separation monitoring and Conflict Alert. Aircraft pairs that involve the
// player's traffic are checked against the lateral and vertical minima; pairs
// predicted to lose separation within the look-ahead time raise a predicted
// alert. Losses of separation are logged as violations.

export const conflictSchema = z.object({
  /** Stable pair key: the two aircraft ids, sorted, joined with '|'. */
  id: z.string(),
  aircraftIds: z.tuple([z.string(), z.string()]),
  /** 'predicted': separation will be lost within the look-ahead; 'loss': it is lost now. */
  kind: z.enum(['predicted', 'loss']),
  sinceTick: z.number().int().min(0),
  lateralNm: z.number().min(0),
  verticalFt: z.number().min(0),
});

export type Conflict = z.infer<typeof conflictSchema>;

export const violationSchema = z.object({
  id: z.string(),
  callsigns: z.tuple([z.string(), z.string()]),
  aircraftIds: z.tuple([z.string(), z.string()]),
  startTick: z.number().int().min(0),
  endTick: z.number().int().min(0).optional(),
  /** Closest approach while separation was lost. */
  closestLateralNm: z.number().min(0),
  closestVerticalFt: z.number().min(0),
  /** The minima that applied. */
  requiredLateralNm: z.number().positive(),
  requiredVerticalFt: z.number().positive(),
});

export type Violation = z.infer<typeof violationSchema>;

export const separationStateSchema = z.object({
  conflicts: z.array(conflictSchema),
  violations: z.array(violationSchema),
  nextViolationNumber: z.number().int().positive(),
});

export type SeparationState = z.infer<typeof separationStateSchema>;

export const emptySeparationState = (): SeparationState => ({
  conflicts: [],
  violations: [],
  nextViolationNumber: 1,
});

export interface SeparationSettings {
  lateralNm: number;
  verticalFt: number;
  lookaheadSec: number;
  playerId: string;
  magneticVariationDeg: number;
}

/** Reduced in-trail minimum on the same final approach course, inside this distance of the runway. */
export const IN_TRAIL_ON_FINAL_NM = 2.5;
export const IN_TRAIL_RANGE_NM = 10;
/** Prediction step through the look-ahead window. */
const PREDICTION_STEP_SEC = 5;
/** Aircraft this low are on the runway or about to be; runway separation is Tower's job. */
const MIN_MONITORED_HEIGHT_FT = 400;

const NM_PER_DEG_LAT = 60;

interface Track {
  aircraft: Readonly<AircraftState>;
  /** Local position in NM (east, north). */
  x: number;
  y: number;
  /** Velocity in NM/s and ft/s. */
  vx: number;
  vy: number;
  vz: number;
}

function track(aircraft: Readonly<AircraftState>, referenceLat: number, variation: number): Track {
  const kx = NM_PER_DEG_LAT * Math.cos(toRadians(referenceLat));
  const speed = groundSpeedKts(aircraft) / 3600;
  const course = toRadians(magneticToTrue(aircraft.headingDeg, variation));
  return {
    aircraft,
    x: aircraft.position.lon * kx,
    y: aircraft.position.lat * NM_PER_DEG_LAT,
    vx: speed * Math.sin(course),
    vy: speed * Math.cos(course),
    vz: aircraft.verticalSpeedFpm / 60,
  };
}

/** The lateral minimum for a pair: 2.5 NM in trail on the same final inside 10 NM, otherwise the setting. */
export function requiredLateralNm(
  a: Readonly<AircraftState>,
  b: Readonly<AircraftState>,
  settings: SeparationSettings,
): number {
  const na = a.navigation;
  const nb = b.navigation;
  if (
    na.mode === 'approach' &&
    nb.mode === 'approach' &&
    na.localizerCaptured &&
    nb.localizerCaptured &&
    na.clearance.airport === nb.clearance.airport &&
    na.clearance.runway === nb.clearance.runway
  ) {
    const alongA = finalApproachGeometry(
      a.position,
      na.clearance,
      settings.magneticVariationDeg,
    ).alongTrackNm;
    const alongB = finalApproachGeometry(
      b.position,
      nb.clearance,
      settings.magneticVariationDeg,
    ).alongTrackNm;
    if (alongA <= IN_TRAIL_RANGE_NM && alongB <= IN_TRAIL_RANGE_NM) {
      return Math.min(settings.lateralNm, IN_TRAIL_ON_FINAL_NM);
    }
  }
  return settings.lateralNm;
}

const pairKey = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

/**
 * Checks all monitored pairs and updates conflicts and violations. Returns
 * the conflicts that started and ended this tick (for events and alerts).
 */
export function updateSeparation(
  state: SeparationState,
  aircraft: readonly Readonly<AircraftState>[],
  settings: SeparationSettings,
  tick: number,
  groundElevationFt: (aircraft: Readonly<AircraftState>) => number,
): { started: Conflict[]; ended: Conflict[]; violationsStarted: Violation[] } {
  const monitored = aircraft.filter(
    (a) => a.altitudeFt - groundElevationFt(a) >= MIN_MONITORED_HEIGHT_FT,
  );
  const referenceLat = monitored[0]?.position.lat ?? 40;
  const tracks = monitored.map((a) => track(a, referenceLat, settings.magneticVariationDeg));

  const previous = new Map(state.conflicts.map((conflict) => [conflict.id, conflict]));
  const current: Conflict[] = [];
  const started: Conflict[] = [];
  const violationsStarted: Violation[] = [];

  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const a = tracks[i]!;
      const b = tracks[j]!;
      // Only pairs involving the player's traffic.
      if (a.aircraft.owner !== settings.playerId && b.aircraft.owner !== settings.playerId)
        continue;

      const lateralMin = requiredLateralNm(a.aircraft, b.aircraft, settings);
      const lateral = Math.hypot(a.x - b.x, a.y - b.y);
      const vertical = Math.abs(a.aircraft.altitudeFt - b.aircraft.altitudeFt);
      // Quick reject: too far apart to conflict within the look-ahead.
      const closing = Math.hypot(a.vx - b.vx, a.vy - b.vy) * settings.lookaheadSec;
      if (lateral - closing > lateralMin + 1) continue;

      let kind: Conflict['kind'] | undefined;
      if (lateral < lateralMin && vertical < settings.verticalFt) kind = 'loss';
      else {
        for (let t = PREDICTION_STEP_SEC; t <= settings.lookaheadSec; t += PREDICTION_STEP_SEC) {
          const dx = a.x + a.vx * t - (b.x + b.vx * t);
          const dy = a.y + a.vy * t - (b.y + b.vy * t);
          const dz = a.aircraft.altitudeFt + a.vz * t - (b.aircraft.altitudeFt + b.vz * t);
          if (Math.hypot(dx, dy) < lateralMin && Math.abs(dz) < settings.verticalFt) {
            kind = 'predicted';
            break;
          }
        }
      }
      if (!kind) continue;

      const aircraftIds = pairKey(a.aircraft.id, b.aircraft.id);
      const id = aircraftIds.join('|');
      const before = previous.get(id);
      const conflict: Conflict = {
        id,
        aircraftIds,
        kind,
        sinceTick: before && before.kind === kind ? before.sinceTick : tick,
        lateralNm: lateral,
        verticalFt: vertical,
      };
      current.push(conflict);
      if (!before) started.push(conflict);

      if (kind === 'loss') {
        const ongoing = state.violations.find(
          (v) => v.aircraftIds.join('|') === id && v.endTick === undefined,
        );
        if (ongoing) {
          ongoing.closestLateralNm = Math.min(ongoing.closestLateralNm, lateral);
          ongoing.closestVerticalFt = Math.min(ongoing.closestVerticalFt, vertical);
        } else {
          const [first, second] = aircraftIds.map((aid) => monitored.find((m) => m.id === aid)!);
          const violation: Violation = {
            id: `V${state.nextViolationNumber++}`,
            callsigns: [first!.callsign, second!.callsign],
            aircraftIds,
            startTick: tick,
            closestLateralNm: lateral,
            closestVerticalFt: vertical,
            requiredLateralNm: lateralMin,
            requiredVerticalFt: settings.verticalFt,
          };
          state.violations.push(violation);
          violationsStarted.push(violation);
        }
      }
    }
  }

  // Losses that are no longer losses end their violation.
  const lossIds = new Set(current.filter((c) => c.kind === 'loss').map((c) => c.id));
  for (const violation of state.violations) {
    if (violation.endTick === undefined && !lossIds.has(violation.aircraftIds.join('|')))
      violation.endTick = tick;
  }

  const currentIds = new Set(current.map((c) => c.id));
  const ended = state.conflicts.filter((conflict) => !currentIds.has(conflict.id));
  state.conflicts = current;
  return { started, ended, violationsStarted };
}
