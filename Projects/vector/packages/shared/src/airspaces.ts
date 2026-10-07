import { z } from 'zod';

// Airspaces the simulator ships with, and whether each is open to players.

/** Every airspace pack (the client's registry and the server's airspaces table use these ids). */
export const AIRSPACE_IDS = ['new-york', 'chicago', 'dallas'] as const;
export type AirspaceId = (typeof AIRSPACE_IDS)[number];

export const airspaceIdSchema = z.enum(AIRSPACE_IDS, { error: 'Unknown airspace' });

/** Each airspace's TRACON and name, for text outside the app (link previews, share cards). */
export const AIRSPACE_NAMES: Record<AirspaceId, { facility: string; name: string }> = {
  'new-york': { facility: 'N90', name: 'New York' },
  chicago: { facility: 'C90', name: 'Chicago' },
  dallas: { facility: 'D10', name: 'Dallas–Fort Worth' },
};

export const airspaceStatusSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});
export type AirspaceStatus = z.infer<typeof airspaceStatusSchema>;

/** GET /api/airspaces: which airspaces players can fly. */
export const airspaceStatusListSchema = z.object({ airspaces: z.array(airspaceStatusSchema) });
export type AirspaceStatusList = z.infer<typeof airspaceStatusListSchema>;
