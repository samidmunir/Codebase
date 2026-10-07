import {
  defaultSettings,
  detectDifficulty,
  usesScoring,
  usesStandardRules,
  type SessionDifficulty,
  type SessionSettings,
} from '@vector/shared';
import type { ScoringVersion } from './scoring-repository';

// Whether a session counts for the records and the career. Decided from its replay
// (how it started and every input), never from what the client says, and the
// replay is checked against the session's state when the result is verified.

/** A version replaced this recently still counts (a session started just before the change). */
const GRACE_MS = 7 * 24 * 3_600_000;

export interface Ranking {
  /** The difficulty the session actually had (from its starting traffic). */
  difficulty: SessionDifficulty | null;
  ranked: boolean;
  unrankedReason: string | null;
}

interface ReplayLike {
  start?: { settings?: unknown };
  inputs?: { type: string }[];
}

/** Ranks a session from its replay, against the official scoring's versions. */
export function rankSession(
  replay: unknown,
  versions: ScoringVersion[],
  now = new Date(),
): Ranking {
  const parsed = replay as ReplayLike | null | undefined;
  if (!parsed?.start?.settings || typeof parsed.start.settings !== 'object')
    return {
      difficulty: null,
      ranked: false,
      unrankedReason: 'Played before sessions could be checked',
    };
  // The values exactly as the session started (not cleaned up: an out-of-range value
  // must not pass for the default it would be reset to).
  const settings = {
    ...defaultSettings('session'),
    ...(parsed.start.settings as object),
  } as SessionSettings;
  const difficulty = detectDifficulty(settings);
  const unranked = (unrankedReason: string): Ranking => ({
    difficulty,
    ranked: false,
    unrankedReason,
  });

  const official = versions.filter(
    (version) => !version.until || now.getTime() - version.until.getTime() <= GRACE_MS,
  );
  if (!official.some((version) => usesScoring(settings, version.values)))
    return unranked('Played with unofficial scoring');
  if (!usesStandardRules(settings)) return unranked('Played with non-standard rules');
  if (difficulty === 'custom')
    return unranked('Custom traffic isn’t ranked: choose Easy, Normal, Hard or Expert');
  if (Array.isArray(parsed.inputs) && parsed.inputs.some((input) => input?.type === 'traffic'))
    return unranked('Traffic was changed during the session');
  return { difficulty, ranked: true, unrankedReason: null };
}
