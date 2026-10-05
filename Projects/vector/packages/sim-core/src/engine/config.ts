import { z } from 'zod';
import { DEFAULT_FLIGHT_MODEL_CONFIG, flightModelConfigSchema } from '../aircraft/flight-model';

export const simConfigSchema = z.object({
  /** Simulated seconds per tick. */
  tickSeconds: z.number().positive().max(5),
  /** Safety cap on ticks per advance() call, so a long frame stall can't freeze the UI. */
  maxTicksPerAdvance: z.number().int().positive(),
  flightModel: flightModelConfigSchema,
});

export type SimConfig = z.infer<typeof simConfigSchema>;

export const DEFAULT_SIM_CONFIG: SimConfig = {
  tickSeconds: 1,
  maxTicksPerAdvance: 32,
  flightModel: DEFAULT_FLIGHT_MODEL_CONFIG,
};

/** Fixed properties of the airspace the simulation runs in. */
export const worldSchema = z.object({
  /** East positive, west negative. */
  magneticVariationDeg: z.number().min(-180).max(180),
});

export type World = z.infer<typeof worldSchema>;
