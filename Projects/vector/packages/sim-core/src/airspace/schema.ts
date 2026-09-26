import { z } from 'zod';

// Schema for an airspace pack: the data files in data/airspaces/<id>/.
// Built from FAA and US Census sources by scripts/data (see its README).

export const AIRSPACE_SCHEMA_VERSION = 1;

const latLonSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/** Compact [lon, lat] coordinate, used for map geometry. */
const pointSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const lineSchema = z.array(pointSchema).min(2);
const ringSchema = z.array(pointSchema).min(4);

const headingSchema = z.number().min(0).max(360);

// ---- Procedures ------------------------------------------------------------

export const altitudeConstraintSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('at'), ft: z.number() }),
  z.object({ type: z.literal('atOrAbove'), ft: z.number() }),
  z.object({ type: z.literal('atOrBelow'), ft: z.number() }),
  z.object({ type: z.literal('between'), minFt: z.number(), maxFt: z.number() }),
]);

export type AltitudeConstraint = z.infer<typeof altitudeConstraintSchema>;

export const speedConstraintSchema = z.object({
  type: z.enum(['at', 'atOrAbove', 'atOrBelow']),
  kts: z.number().positive(),
});

export type SpeedConstraint = z.infer<typeof speedConstraintSchema>;

/** ARINC 424 path terminators. */
export const pathTerminatorSchema = z.enum([
  'IF', // initial fix
  'TF', // track to fix
  'CF', // course to fix
  'DF', // direct to fix
  'RF', // radius-to-fix arc
  'AF', // DME arc to fix
  'CA', // course to altitude
  'CD', // course to DME distance
  'CI', // course to intercept
  'CR', // course to radial
  'FA', // fix to altitude
  'FC', // track from fix for a distance
  'FD', // track from fix to DME distance
  'FM', // from fix, manual termination (expect vectors)
  'VA', // heading to altitude
  'VD', // heading to DME distance
  'VI', // heading to intercept
  'VM', // heading, manual termination (expect vectors)
  'VR', // heading to radial
  'PI', // procedure turn
  'HA', // hold to altitude
  'HF', // hold, single circuit
  'HM', // hold, manual termination
]);

export type PathTerminator = z.infer<typeof pathTerminatorSchema>;

export const procedureLegSchema = z.object({
  pathTerminator: pathTerminatorSchema,
  /** Navdata fix ident. */
  fix: z.string().optional(),
  /** Runway id when the leg terminates at a runway threshold. */
  runway: z.string().optional(),
  /** Magnetic course or heading. */
  courseDeg: headingSchema.optional(),
  turnDirection: z.enum(['left', 'right']).optional(),
  distanceNm: z.number().nonnegative().optional(),
  holdMinutes: z.number().positive().optional(),
  altitude: altitudeConstraintSchema.optional(),
  glideslopeInterceptFt: z.number().optional(),
  speed: speedConstraintSchema.optional(),
  verticalAngleDeg: z.number().optional(),
  flyover: z.boolean(),
  role: z.enum(['iaf', 'if', 'faf', 'map']).optional(),
});

export type ProcedureLeg = z.infer<typeof procedureLegSchema>;

const routeSegmentSchema = z.object({
  /** Transition name: an entry/exit fix, 'RW04B', 'ALL', ... */
  name: z.string(),
  /** Runways this segment applies to (runway transitions and runway-specific common routes). */
  runways: z.array(z.string()).optional(),
  legs: z.array(procedureLegSchema).min(1),
});

export type RouteSegment = z.infer<typeof routeSegmentSchema>;

/**
 * A STAR or SID. Arrivals fly enroute transition -> common route -> runway
 * transition; departures fly runway transition -> common route -> enroute transition.
 */
export const terminalProcedureSchema = z.object({
  id: z.string(),
  airport: z.string(),
  rnav: z.boolean(),
  enrouteTransitions: z.array(routeSegmentSchema),
  commonRoutes: z.array(routeSegmentSchema),
  runwayTransitions: z.array(routeSegmentSchema),
});

export type TerminalProcedure = z.infer<typeof terminalProcedureSchema>;

export const ilsApproachSchema = z.object({
  /** CIFP id, e.g. 'I22L', 'I04LY'. */
  id: z.string(),
  airport: z.string(),
  runway: z.string(),
  /** Letter for multiple ILS approaches to one runway ('Y', 'Z'). */
  variant: z.string().optional(),
  localizer: z.string(),
  transitions: z.array(routeSegmentSchema),
  final: z.array(procedureLegSchema).min(1),
  missedApproach: z.array(procedureLegSchema),
});

export type IlsApproach = z.infer<typeof ilsApproachSchema>;

export const proceduresFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  arrivals: z.array(terminalProcedureSchema),
  departures: z.array(terminalProcedureSchema),
  approaches: z.array(ilsApproachSchema),
});

// ---- Airports ----------------------------------------------------------------

export const runwaySchema = z.object({
  /** '04L' */
  id: z.string().regex(/^(0[1-9]|[12]\d|3[0-6])[LRC]?$/),
  oppositeId: z.string(),
  /** Landing threshold point (after any displacement). */
  threshold: latLonSchema,
  thresholdElevationFt: z.number(),
  displacedThresholdFt: z.number().min(0),
  lengthFt: z.number().positive(),
  widthFt: z.number().positive(),
  magneticHeadingDeg: headingSchema,
  /** True course from this threshold to the opposite threshold. */
  trueHeadingDeg: headingSchema,
  towerFrequencyMhz: z.number(),
  ils: z
    .object({
      ident: z.string(),
      frequencyMhz: z.number(),
      category: z.string(),
      /** Localizer course, magnetic. */
      courseDeg: headingSchema,
      localizerPosition: latLonSchema,
      glideslopeAngleDeg: z.number().positive(),
      thresholdCrossingHeightFt: z.number().optional(),
    })
    .optional(),
});

export type Runway = z.infer<typeof runwaySchema>;

export const airportSchema = z.object({
  icao: z.string().regex(/^[A-Z0-9]{4}$/),
  name: z.string(),
  position: latLonSchema,
  elevationFt: z.number(),
  magneticVariationDeg: z.number(),
  /** Radio name of the tower, e.g. 'Kennedy Tower'. */
  towerCallsign: z.string(),
  runways: z.array(runwaySchema).min(1),
});

export type Airport = z.infer<typeof airportSchema>;

export const airportsFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  airports: z.array(airportSchema).min(1),
});

// ---- Navdata -----------------------------------------------------------------

export const fixSchema = z.object({
  ident: z.string().min(2).max(5),
  kind: z.enum(['waypoint', 'vor', 'ndb']),
  position: latLonSchema,
  name: z.string().optional(),
  frequencyMhz: z.number().optional(),
});

export type Fix = z.infer<typeof fixSchema>;

export const navdataFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  fixes: z.array(fixSchema),
});

// ---- Video map -----------------------------------------------------------------

export const videoMapFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  shoreline: z.array(lineSchema),
  classB: z.array(
    z.object({
      floorFt: z.number().min(0),
      ceilingFt: z.number().positive(),
      ring: ringSchema,
    }),
  ),
  minimumVectoringAltitudes: z.array(
    z.object({
      name: z.string(),
      minimumAltitudeFt: z.number().positive(),
      exterior: ringSchema,
      holes: z.array(ringSchema),
    }),
  ),
});

export type VideoMap = z.infer<typeof videoMapFileSchema>;

// ---- Traffic and operations -------------------------------------------------------

export const runwayConfigSchema = z.object({
  id: z.string(),
  arrivals: z.array(z.string()).min(1),
  departures: z.array(z.string()).min(1),
});

export type RunwayConfig = z.infer<typeof runwayConfigSchema>;

export const airportTrafficSchema = z.object({
  /** Altitude departures climb to after takeoff. */
  initialAltitudeFt: z.number().positive(),
  /** Runway configurations in order of preference; the best one for the wind is used. */
  runwayConfigs: z.array(runwayConfigSchema).min(1),
  airlines: z
    .array(
      z.object({
        icao: z.string(),
        weight: z.number().positive(),
        types: z.array(z.string()).min(1),
        /** Destinations this airline serves from the airport; any destination if omitted. */
        destinations: z.array(z.string()).min(1).optional(),
      }),
    )
    .min(1),
  destinations: z
    .array(z.object({ icao: z.string(), weight: z.number().positive(), gate: z.string() }))
    .min(1),
});

export type AirportTraffic = z.infer<typeof airportTrafficSchema>;

export const trafficFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  notes: z.string().optional(),
  /** Departure gates (exit directions) and their fixes. */
  departureGates: z.record(z.string(), z.array(z.string()).min(1)),
  airports: z.record(z.string(), airportTrafficSchema),
});

export type TrafficProfile = z.infer<typeof trafficFileSchema>;

/** Airlines: radio names and flight number ranges (data/airlines/airlines.json). */
export const airlinesFileSchema = z.object({
  schemaVersion: z.literal(1),
  airlines: z.array(
    z.object({
      icao: z.string().regex(/^[A-Z]{3}$/),
      name: z.string(),
      telephony: z.string(),
      flightNumbers: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    }),
  ),
});

export type AirlinesFile = z.infer<typeof airlinesFileSchema>;
export type Airline = AirlinesFile['airlines'][number];

// ---- Airspace ----------------------------------------------------------------

export const centerSiteSchema = z.object({
  name: z.string(),
  position: latLonSchema,
  frequencies: z
    .array(z.object({ frequencyMhz: z.number(), altitude: z.enum(['low', 'high', 'low/high']) }))
    .min(1),
});

export const airspaceFileSchema = z.object({
  schemaVersion: z.literal(AIRSPACE_SCHEMA_VERSION),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  facility: z.string(),
  description: z.string(),
  center: latLonSchema,
  magneticVariationDeg: z.number(),
  /** The radar that feeds the scope. Targets update as its beam sweeps past them. */
  radar: z.object({
    name: z.string(),
    position: latLonSchema,
    rangeNm: z.number().positive(),
  }),
  /** Area the player controls. Arrivals enter and departures leave across it. */
  boundary: z.object({ ring: ringSchema, ceilingFt: z.number().positive() }),
  airports: z.array(z.string()).min(1),
  controllers: z.object({
    approach: z.object({
      id: z.string(),
      approachCallsign: z.string(),
      departureCallsign: z.string(),
    }),
    center: z.object({
      id: z.string(),
      callsign: z.string(),
      sites: z.array(centerSiteSchema).min(1),
    }),
  }),
  sources: z.array(
    z.object({ name: z.string(), url: z.string(), edition: z.string(), usedFor: z.string() }),
  ),
});

export type AirspaceFile = z.infer<typeof airspaceFileSchema>;
