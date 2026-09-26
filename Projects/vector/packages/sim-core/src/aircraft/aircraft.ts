import { z } from 'zod';
import { iasToTas } from '../atmosphere/isa';

const latLonSchema = z.object({
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
});

export type AircraftTargets = z.infer<typeof aircraftTargetsSchema>;

export const aircraftStateSchema = z.object({
  id: z.string().min(1),
  callsign: z.string().min(1),
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
});

export type AircraftState = z.infer<typeof aircraftStateSchema>;

/** Input for adding an aircraft. Targets default to the current values (steady flight). */
export type NewAircraft = Omit<AircraftState, 'id' | 'verticalSpeedFpm' | 'targets'> & {
  targets?: Partial<AircraftTargets>;
};

export function trueAirspeedKts(aircraft: Pick<AircraftState, 'iasKts' | 'altitudeFt'>): number {
  return iasToTas(aircraft.iasKts, aircraft.altitudeFt);
}

/** Ground speed. Equal to true airspeed in v1, which has no wind in flight. */
export function groundSpeedKts(aircraft: Pick<AircraftState, 'iasKts' | 'altitudeFt'>): number {
  return trueAirspeedKts(aircraft);
}
