import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@vector/shared';

// The difficulty chosen on the start screen, remembered in this browser as a
// convenience. The session setup screen (Milestone 12) will offer the full
// session settings.

const STORAGE_KEY = 'vector.difficulty';
export const DEFAULT_DIFFICULTY: DifficultyLevel = 'easy';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
};

export function parseDifficulty(value: string | null | undefined): DifficultyLevel | undefined {
  return DIFFICULTY_LEVELS.find((level) => level === value);
}

export function loadDifficulty(): DifficultyLevel {
  try {
    return parseDifficulty(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

export function saveDifficulty(level: DifficultyLevel): void {
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // Storage unavailable: the choice still applies to this visit.
  }
}
