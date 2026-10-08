import { z } from 'zod';
import { recordEntrySchema } from './records';

// "This week on Vector": real numbers from pilots' sessions, for the landing page.
// Shown only once they're big enough to mean something (see PULSE_MINIMUMS).

/** Below these, the numbers (or the top pilots) aren't shown. */
export const PULSE_MINIMUMS = { sessions: 20, landed: 50, topPilots: 3 };

export const pulseTotalsSchema = z.object({
  /** 'week': since Monday (UTC), like the records; 'all': since the beta began. */
  period: z.enum(['week', 'all']),
  landed: z.number().int().min(0),
  sessions: z.number().int().min(0),
  pilots: z.number().int().min(0),
  hours: z.number().int().min(0),
});
export type PulseTotals = z.infer<typeof pulseTotalsSchema>;

export const pulseSchema = z.object({
  /** Null: not enough yet to show. */
  totals: pulseTotalsSchema.nullable(),
  /** The top of the career board (this week, or all time), or null when too few. */
  top: z.object({ period: z.enum(['week', 'all']), pilots: z.array(recordEntrySchema) }).nullable(),
});
export type Pulse = z.infer<typeof pulseSchema>;
