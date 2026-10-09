import { z } from 'zod';
import { SESSION_SETTINGS, type SessionSettings } from './registry';
import { defaultSettings, parseSettingsPatch } from './resolve';

// Fair sessions: what's the same for everyone, and what a player chooses.
//
// Official (admins set them, Admin → Session rules, for every session):
// - scoring: every RP value;
// - the rules: separation, approaches, Center, radar, pilots' response;
// - the conditions: how the wind varies, runway changes, the departure queue, the
//   airline mix.
// Players choose the difficulty (traffic rates, in setup only), live or random wind
// (manual wind is for practice), the sim speeds, readback detail, and the player aids
// (eligibility dots, Conflict Alert look-ahead).
//
// The server checks each recorded session against this before it counts for the
// records (see the results service), so a changed client can't get around it.

type SessionKey = keyof SessionSettings;
const ALL_KEYS = Object.keys(SESSION_SETTINGS) as SessionKey[];

/** Every RP value: official, set by admins. */
export const SCORING_KEYS = ALL_KEYS.filter((key) => key.startsWith('scoring.'));

/** The rules of the airspace: official, for everyone. */
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

/** The conditions: how the wind varies, runway changes, the departure queue, the airline mix. */
export const CONDITION_KEYS: SessionKey[] = [
  'weather.windVariation',
  'weather.windVariationPeriodMin',
  'weather.livePollMin',
  'weather.runwayChanges',
  'weather.runwayChangeNoticeMin',
  'weather.maxTailwindKts',
  'weather.maxCrosswindKts',
  'traffic.maxDepartureQueue',
  'traffic.fleetMix',
];

/** Every official setting: admins set them, the same for every session. */
export const OFFICIAL_KEYS: SessionKey[] = [...SCORING_KEYS, ...RULE_KEYS, ...CONDITION_KEYS];
const OFFICIAL = new Set<string>(OFFICIAL_KEYS);

/** The official settings by topic, for Admin → Session rules. */
export const OFFICIAL_GROUPS: { label: string; keys: SessionKey[] }[] = [
  { label: 'Scoring', prefix: 'scoring.' },
  { label: 'Separation', prefix: 'separation.' },
  { label: 'Approaches', prefix: 'approaches.' },
  { label: 'Departures', prefix: 'departures.' },
  { label: 'Center', prefix: 'center.' },
  { label: 'Radar', prefix: 'radar.' },
  { label: 'Pilots', prefix: 'pilots.' },
  { label: 'Weather and runways', prefix: 'weather.' },
  { label: 'Traffic', prefix: 'traffic.' },
].map(({ label, prefix }) => ({
  label,
  keys: OFFICIAL_KEYS.filter((key) => key.startsWith(prefix)),
}));

/** What a player chooses for a session (the rest is official). */
export const PLAYER_SESSION_KEYS = ALL_KEYS.filter((key) => !OFFICIAL.has(key));

/** The official settings' values. */
export type OfficialValues = Partial<SessionSettings>;

/** The official settings every session uses until an admin changes them. */
export function defaultOfficial(): OfficialValues {
  const defaults = defaultSettings('session');
  return Object.fromEntries(OFFICIAL_KEYS.map((key) => [key, defaults[key]])) as OfficialValues;
}

/** Official settings from an admin: every value valid, only official settings. */
export const officialValuesSchema = z.unknown().transform((input, context) => {
  try {
    const patch = parseSettingsPatch('session', input);
    const stray = Object.keys(patch).filter((key) => !OFFICIAL.has(key));
    if (stray.length > 0) {
      context.addIssue({ code: 'custom', message: `Not an official setting: ${stray.join(', ')}` });
      return z.NEVER;
    }
    return { ...defaultOfficial(), ...patch } as OfficialValues;
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid settings',
    });
    return z.NEVER;
  }
});

/** A session's settings with the official ones in place. */
export function withOfficialRules(
  settings: SessionSettings,
  official: OfficialValues,
): SessionSettings {
  return { ...settings, ...official } as SessionSettings;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The official settings a session didn't use these values for (none: it did). */
export const differences = (settings: SessionSettings, official: OfficialValues) =>
  OFFICIAL_KEYS.filter((key) => !same(settings[key], official[key]));

/** GET /api/session-rules: the official settings sessions use now. */
export const officialSettingsSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  /** When they last changed (null: the defaults, never changed). */
  changedAt: z.iso.datetime().nullable(),
});
export type OfficialSettings = z.infer<typeof officialSettingsSchema>;

/** GET /api/admin/session-rules: the official settings now, and their earlier versions. */
export const adminSessionRulesSchema = z.object({
  current: officialSettingsSchema.extend({ changedBy: z.string().nullable() }),
  versions: z.array(
    z.object({
      id: z.number().int(),
      changedAt: z.iso.datetime(),
      changedBy: z.string().nullable(),
    }),
  ),
});
export type AdminSessionRules = z.infer<typeof adminSessionRulesSchema>;
