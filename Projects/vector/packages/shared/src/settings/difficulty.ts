import type { SessionSettings } from './registry';

export const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard', 'expert'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

type DifficultyKey =
  | 'traffic.arrivalRatePerHour'
  | 'traffic.departureRatePerHour'
  | 'traffic.transitRatePerHour'
  | 'traffic.maxDepartureQueue';

/** Session settings that can be tuned while a session runs. */
export const IN_SESSION_TRAFFIC_KEYS = [
  'traffic.arrivalRatePerHour',
  'traffic.departureRatePerHour',
  'traffic.transitRatePerHour',
  'traffic.maxDepartureQueue',
] as const satisfies readonly DifficultyKey[];
export type DifficultyPreset = Pick<SessionSettings, DifficultyKey>;

/**
 * Traffic values each difficulty sets. Rates are per airport, per hour, and
 * are starting points to tune during playtesting.
 */
export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPreset> = {
  easy: {
    'traffic.arrivalRatePerHour': 6,
    'traffic.departureRatePerHour': 6,
    'traffic.transitRatePerHour': 2,
    'traffic.maxDepartureQueue': 3,
  },
  normal: {
    'traffic.arrivalRatePerHour': 10,
    'traffic.departureRatePerHour': 10,
    'traffic.transitRatePerHour': 4,
    'traffic.maxDepartureQueue': 5,
  },
  hard: {
    'traffic.arrivalRatePerHour': 15,
    'traffic.departureRatePerHour': 15,
    'traffic.transitRatePerHour': 6,
    'traffic.maxDepartureQueue': 8,
  },
  expert: {
    'traffic.arrivalRatePerHour': 20,
    'traffic.departureRatePerHour': 20,
    'traffic.transitRatePerHour': 8,
    'traffic.maxDepartureQueue': 12,
  },
};

export function applyDifficulty(
  settings: SessionSettings,
  level: DifficultyLevel,
): SessionSettings {
  return { ...settings, ...DIFFICULTY_PRESETS[level] };
}

/** The difficulty whose preset matches the settings, or 'custom' if the player has adjusted them. */
export function detectDifficulty(settings: SessionSettings): DifficultyLevel | 'custom' {
  const match = DIFFICULTY_LEVELS.find((level) =>
    Object.entries(DIFFICULTY_PRESETS[level]).every(
      ([key, value]) => settings[key as DifficultyKey] === value,
    ),
  );
  return match ?? 'custom';
}
