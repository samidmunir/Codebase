import { z } from 'zod';

// Live weather: METAR observations from aviationweather.gov, fetched by the
// server (the source doesn't allow browser requests) and polled by sessions.

export const flightCategorySchema = z.enum(['VFR', 'MVFR', 'IFR', 'LIFR']);

export const metarObservationSchema = z.object({
  icao: z.string().regex(/^[A-Z0-9]{3,4}$/),
  /** When the observation was made. */
  observedAt: z.string().datetime(),
  /** The report as issued, e.g. 'METAR KJFK 280151Z 03016KT 7SM -DZ OVC011 ...'. */
  raw: z.string(),
  /** Direction the wind blows from, TRUE degrees; null when variable or calm. */
  windDirectionTrueDeg: z.number().min(0).max(360).nullable(),
  windSpeedKts: z.number().min(0),
  gustKts: z.number().min(0).optional(),
  visibilitySm: z.number().min(0).optional(),
  /** Lowest broken or overcast layer (or vertical visibility), feet above the ground. */
  ceilingFt: z.number().min(0).optional(),
  altimeterInHg: z.number().positive().optional(),
  temperatureC: z.number().optional(),
  dewpointC: z.number().optional(),
  flightCategory: flightCategorySchema.optional(),
});

export type MetarObservation = z.infer<typeof metarObservationSchema>;

export const metarResponseSchema = z.object({
  observations: z.array(metarObservationSchema),
  /** When the server last fetched from the source. */
  fetchedAt: z.string().datetime(),
});

export type MetarResponse = z.infer<typeof metarResponseSchema>;

/** Station ids a request may ask for: ICAO codes, at most this many. */
export const MAX_METAR_STATIONS = 10;
export const stationIdsSchema = z
  .string()
  .transform((value) => [
    ...new Set(
      value
        .toUpperCase()
        .split(',')
        .map((id) => id.trim()),
    ),
  ])
  .pipe(
    z
      .array(z.string().regex(/^[A-Z0-9]{3,4}$/))
      .min(1)
      .max(MAX_METAR_STATIONS),
  );
