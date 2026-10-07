import { z } from 'zod';
import { SESSION_SETTINGS, type SessionSettings } from './registry';
import { defaultSettings, parseSettingsPatch } from './resolve';

// Fair sessions: what's the same for everyone, and what a player chooses.
//
// - Scoring (every RP value) is official: admins set it, for every session.
// - The rules of the airspace (separation, approaches, Center, radar, pilots'
//   response) are standard: their default values, for every session.
// - Players choose the difficulty (traffic, in setup only), the weather, the sim
//   speeds, readback detail, and player aids (eligibility dots, Conflict Alert
//   look-ahead).
//
// The server checks each recorded session against this before it counts for the
// records (see the results service), so a changed client can't get around it.

type SessionKey = keyof SessionSettings;
const ALL_KEYS = Object.keys(SESSION_SETTINGS) as SessionKey[];

/** Every RP value: official, set by admins. */
export const SCORING_KEYS = ALL_KEYS.filter((key) => key.startsWith('scoring.'));

/** The rules of the airspace: the standard values, for everyone. */
export const RULE_KEYS: SessionKey[] = [
  'separation.lateralNm',
  'separation.enrouteLateralNm',
  'separation.terminalRangeNm',
  'separation.verticalFt',
  'separation.wakeTurbulence',
  'approaches.maxInterceptAngleDeg',
  'approaches.interceptDistanceNm',
  'approaches.stabilizedGateFt',
  'approaches.goArounds',
  'departures.radarContactAltitudeFt',
  'center.automation',
  'center.resolveConflicts',
  'center.handoffWindowNm',
  'center.handoffMinimumEastboundFt',
  'center.handoffMinimumWestboundFt',
  'center.conflictLookaheadSec',
  'radar.sweepIntervalSec',
  'radar.coverage',
  'radar.enrouteFloorFt',
  'radar.enrouteIntervalSec',
  'pilots.responseDelaySec',
];

const FIXED = new Set<string>([...SCORING_KEYS, ...RULE_KEYS]);

/** What a player chooses for a session (the rest is official or standard). */
export const PLAYER_SESSION_KEYS = ALL_KEYS.filter((key) => !FIXED.has(key));

/** Official RP values, one for each scoring setting. */
export type ScoringValues = Pick<SessionSettings, (typeof SCORING_KEYS)[number]>;

/** The scoring every session uses until an admin changes it. */
export function defaultScoring(): ScoringValues {
  const defaults = defaultSettings('session');
  return Object.fromEntries(SCORING_KEYS.map((key) => [key, defaults[key]])) as ScoringValues;
}

/** Scoring from an admin: every value valid, nothing but scoring settings. */
export const scoringValuesSchema = z.unknown().transform((input, context) => {
  try {
    const patch = parseSettingsPatch('session', input);
    const stray = Object.keys(patch).filter((key) => !key.startsWith('scoring.'));
    if (stray.length > 0) {
      context.addIssue({ code: 'custom', message: `Not a scoring setting: ${stray.join(', ')}` });
      return z.NEVER;
    }
    return { ...defaultScoring(), ...patch } as ScoringValues;
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid scoring',
    });
    return z.NEVER;
  }
});

/** A session's settings with official scoring and the standard rules in place. */
export function withOfficialRules(
  settings: SessionSettings,
  scoring: ScoringValues,
): SessionSettings {
  const defaults = defaultSettings('session');
  return {
    ...settings,
    ...Object.fromEntries(RULE_KEYS.map((key) => [key, defaults[key]])),
    ...scoring,
  } as SessionSettings;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Whether a session used these scoring values. */
export const usesScoring = (settings: SessionSettings, scoring: ScoringValues) =>
  SCORING_KEYS.every((key) => same(settings[key], scoring[key]));

/** Whether a session used the standard rules. */
export function usesStandardRules(settings: SessionSettings): boolean {
  const defaults = defaultSettings('session');
  return RULE_KEYS.every((key) => same(settings[key], defaults[key]));
}

/** GET /api/scoring: the scoring sessions use now. */
export const officialScoringSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  /** When it last changed (null: the defaults, never changed). */
  changedAt: z.iso.datetime().nullable(),
});
export type OfficialScoring = z.infer<typeof officialScoringSchema>;

/** GET /api/admin/scoring: the scoring now, and its earlier versions. */
export const adminScoringSchema = z.object({
  current: officialScoringSchema.extend({ changedBy: z.string().nullable() }),
  versions: z.array(
    z.object({
      id: z.number().int(),
      changedAt: z.iso.datetime(),
      changedBy: z.string().nullable(),
    }),
  ),
});
export type AdminScoring = z.infer<typeof adminScoringSchema>;
