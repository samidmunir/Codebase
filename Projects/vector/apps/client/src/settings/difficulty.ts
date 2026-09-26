import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@vector/shared';

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
