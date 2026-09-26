import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('vector-api'),
  version: z.string(),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'unavailable']),
  checks: z.object({
    database: z.enum(['up', 'down']),
  }),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
