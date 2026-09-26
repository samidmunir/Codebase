import { z } from 'zod';
import { iasToTas } from '../atmosphere/isa';

export const latLonSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const flightPhaseSchema = z.enum([
  'departure', // cleared for takeoff, flying the departure procedure
  'enroute', // climbing/descending/cruising under radar control
  'arrival', // inbound, not yet cleared for an approach
  'approach', // cleared for an approach
  'goAround', // flying the missed approach
]);

export type FlightPhase = z.infer<typeof flightPhaseSchema>;

/** Identifies who controls an aircraft, e.g. 'N90', 'KJFK_TWR', 'ZNY'. */
export const controllerIdSchema = z.string().min(1);
export type ControllerId = z.infer<typeof controllerIdSchema>;

export const aircraftTargetsSchema = z.object({
  altitudeFt: z.number().min(0),
  /** Magnetic heading. */
  headingDeg: z.number().min(0).lt(360),
  turnDirection: z.enum(['left', 'right', 'shortest']),
  iasKts: z.number().positive(),
  /**
   * 'assigned': fly `iasKts`. 'normal': the pilot flies the aircraft's normal
   * speed for its altitude (e.g. after "resume normal speed").
   */
  speedMode: z.enum(['assigned', 'normal']).default('assigned'),
});

export type AircraftTargets = z.infer<typeof aircraftTargetsSchema>;

/** Everything an aircraft needs to fly an ILS it has been cleared for. */
export const ilsClearanceSchema = z.object({
  airport: z.string(),
  runway: z.string(),
  approachId: z.string(),
  threshold: latLonSchema,
  thresholdElevationFt: z.number(),
  /** Localizer course, magnetic. */
  courseDeg: z.number().min(0).max(360),
  glideslopeDeg: z.number().positive(),
  thresholdCrossingHeightFt: z.number().min(0),
});

export type IlsClearance = z.infer<typeof ilsClearanceSchema>;

export const navigationSchema = z.discriminatedUnion('mode', [
  /** Fly the target heading. */
  z.object({ mode: z.literal('heading') }),
  /** Fly direct to a fix, then continue on the heading flown at the fix. */
  z.object({ mode: z.literal('direct'), fix: z.string(), position: latLonSchema }),
  /** Fly the target heading until intercepting the localizer, then fly the ILS. */
  z.object({
    mode: z.literal('approach'),
    clearance: ilsClearanceSchema,
    localizerCaptured: z.boolean(),
    glideslopeCaptured: z.boolean(),
  }),
]);

export type Navigation = z.infer<typeof navigationSchema>;

export const aircraftStateSchema = z.object({
  id: z.string().min(1),
  callsign: z.string().min(1),
  /** Radio name of the airline, e.g. 'JetBlue' for JBU. Spoken with the flight number. */
  telephony: z.string().optional(),
  /** ICAO aircraft type designator, e.g. 'B738'. */
  aircraftType: z.string().min(1),
  squawk: z.string().regex(/^[0-7]{4}$/),
  flightPlan: z.object({
    origin: z.string().min(1),
    destination: z.string().min(1),
    route: z.array(z.string()),
  }),
  phase: flightPhaseSchema,
  owner: controllerIdSchema,

  position: latLonSchema,
  altitudeFt: z.number().min(0),
  /** Magnetic heading. */
  headingDeg: z.number().min(0).lt(360),
  iasKts: z.number().positive(),
  verticalSpeedFpm: z.number(),

  /** What the pilot is currently flying toward. */
  targets: aircraftTargetsSchema,
  navigation: navigationSchema.default({ mode: 'heading' }),
});

export type AircraftState = z.infer<typeof aircraftStateSchema>;

/** Input for adding an aircraft. Targets default to the current values (steady flight). */
export type NewAircraft = Omit<
  AircraftState,
  'id' | 'verticalSpeedFpm' | 'targets' | 'navigation'
> & {
  targets?: Partial<AircraftTargets>;
};

export function trueAirspeedKts(aircraft: Pick<AircraftState, 'iasKts' | 'altitudeFt'>): number {
  return iasToTas(aircraft.iasKts, aircraft.altitudeFt);
}

/** Ground speed. Equal to true airspeed in v1, which has no wind in flight. */
export function groundSpeedKts(aircraft: Pick<AircraftState, 'iasKts' | 'altitudeFt'>): number {
  return trueAirspeedKts(aircraft);
}
