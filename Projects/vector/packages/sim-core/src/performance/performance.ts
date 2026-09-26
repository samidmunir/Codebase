import { z } from 'zod';

const ratePointSchema = z.object({
  altitudeFt: z.number().min(0),
  fpm: z.number().positive(),
});

/** Vertical rate by altitude. Points must be in strictly increasing altitude order. */
const rateCurveSchema = z
  .array(ratePointSchema)
  .min(1)
  .refine(
    (points) => points.every((point, i) => i === 0 || point.altitudeFt > points[i - 1]!.altitudeFt),
    'Rate curve points must be in strictly increasing altitude order',
  );

const speedsSchema = z
  .object({
    /** Speed flown after takeoff until cleaned up. */
    initialClimb: z.number().positive(),
    /** Normal climb speed above the 250 kt limit altitude. */
    climb: z.number().positive(),
    /** Normal descent speed above the 250 kt limit altitude. */
    descent: z.number().positive(),
    /** Typical intermediate approach speed (flaps partially extended). */
    approach: z.number().positive(),
    /** Final approach speed (Vapp). The lowest speed a controller can assign. */
    final: z.number().positive(),
    /** Maximum operating speed (Vmo). */
    max: z.number().positive(),
  })
  .refine((s) => s.final < s.approach, 'final must be below approach')
  .refine(
    (s) => s.approach < s.climb && s.approach < s.descent,
    'approach must be below climb/descent',
  )
  .refine((s) => s.climb <= s.max && s.descent <= s.max, 'climb/descent must not exceed max');

export const aircraftPerformanceSchema = z.object({
  icao: z.string().regex(/^[A-Z0-9]{2,4}$/),
  name: z.string().min(1),
  wakeCategory: z.enum(['small', 'large', 'b757', 'heavy', 'super']),
  ceilingFt: z.number().positive(),
  speeds: speedsSchema,
  climbRate: rateCurveSchema,
  descentRate: rateCurveSchema,
  accelerationKtPerSec: z.number().positive(),
  decelerationKtPerSec: z.number().positive(),
});

export type AircraftPerformance = z.infer<typeof aircraftPerformanceSchema>;
export type RateCurve = z.infer<typeof rateCurveSchema>;

const performanceFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    aircraft: z.array(aircraftPerformanceSchema).min(1),
  })
  .refine(
    (file) => new Set(file.aircraft.map((a) => a.icao)).size === file.aircraft.length,
    'Aircraft ICAO types must be unique',
  );

export class PerformanceCatalog {
  private readonly byType: ReadonlyMap<string, AircraftPerformance>;

  constructor(profiles: readonly AircraftPerformance[]) {
    this.byType = new Map(profiles.map((profile) => [profile.icao, profile]));
  }

  has(icao: string): boolean {
    return this.byType.has(icao);
  }

  get(icao: string): AircraftPerformance {
    const profile = this.byType.get(icao);
    if (!profile) throw new Error(`No performance profile for aircraft type "${icao}"`);
    return profile;
  }

  types(): string[] {
    return [...this.byType.keys()];
  }
}

/** Validates raw performance data (e.g. data/aircraft-types/performance.json). */
export function parsePerformanceCatalog(data: unknown): PerformanceCatalog {
  const result = performanceFileSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid aircraft performance data:\n${z.prettifyError(result.error)}`);
  }
  return new PerformanceCatalog(result.data.aircraft);
}

/** Vertical rate at an altitude, linearly interpolated between curve points and clamped at the ends. */
export function rateAtAltitude(curve: RateCurve, altitudeFt: number): number {
  const first = curve[0]!;
  if (altitudeFt <= first.altitudeFt) return first.fpm;

  for (let i = 1; i < curve.length; i++) {
    const upper = curve[i]!;
    if (altitudeFt <= upper.altitudeFt) {
      const lower = curve[i - 1]!;
      const t = (altitudeFt - lower.altitudeFt) / (upper.altitudeFt - lower.altitudeFt);
      return lower.fpm + t * (upper.fpm - lower.fpm);
    }
  }
  return curve[curve.length - 1]!.fpm;
}
