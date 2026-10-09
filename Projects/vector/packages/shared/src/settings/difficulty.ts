import type { SessionSettings } from './registry';

export const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard', 'expert'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** What a difficulty sets: the traffic rates (the departure queue is official, the same for all). */
type DifficultyKey =
  'traffic.arrivalRatePerHour' | 'traffic.departureRatePerHour' | 'traffic.transitRatePerHour';

/**
 * Traffic settings sessions could once change while they ran (the Traffic panel); their
 * replays still carry those changes, so the engine still applies them.
 */
export const IN_SESSION_TRAFFIC_KEYS = [
  'traffic.arrivalRatePerHour',
  'traffic.departureRatePerHour',
  'traffic.transitRatePerHour',
  'traffic.maxDepartureQueue',
] as const;
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
  },
  normal: {
    'traffic.arrivalRatePerHour': 10,
    'traffic.departureRatePerHour': 10,
    'traffic.transitRatePerHour': 4,
  },
  hard: {
    'traffic.arrivalRatePerHour': 15,
    'traffic.departureRatePerHour': 15,
    'traffic.transitRatePerHour': 6,
  },
  expert: {
    'traffic.arrivalRatePerHour': 20,
    'traffic.departureRatePerHour': 20,
    'traffic.transitRatePerHour': 8,
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
