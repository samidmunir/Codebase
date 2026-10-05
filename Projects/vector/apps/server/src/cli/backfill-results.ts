// Turns saved sessions from before career history into results, so pilots'
// careers include them. Safe to run more than once: each saved session becomes
// one result (updated if it was played further since).
//
//   npm run results:backfill            (add --test for TEST_DATABASE_URL)
import { MIN_RESULT_SIM_SEC, type SessionDifficulty } from '@vector/shared';
import { parseSnapshot, scoreStats, sessionReport } from '@vector/sim-core';
import { createDatabase } from '../platform/database';
import { resultsRepository } from '../results/results-repository';
import '../platform/config';

const useTestDb = process.argv.includes('--test');
const url = useTestDb ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url) {
  console.error(`Set ${useTestDb ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} in apps/server/.env`);
  process.exit(1);
}

const db = createDatabase(url);
const results = resultsRepository(db);
let recorded = 0;
let skipped = 0;

try {
  const { rows } = await db.query<{
    id: string;
    user_id: string;
    airspace_id: string;
    difficulty: SessionDifficulty | null;
    snapshot: unknown;
    created_at: Date;
  }>('SELECT id, user_id, airspace_id, difficulty, snapshot, created_at FROM saved_sessions');
  for (const row of rows) {
    let state;
    try {
      state = parseSnapshot(row.snapshot).state;
    } catch {
      skipped++;
      continue;
    }
    const simTimeSec = state.tick * state.config.tickSeconds;
    if (simTimeSec < MIN_RESULT_SIM_SEC) {
      skipped++;
      continue;
    }
    // A session saved after replays existed records under its own id; older ones by the save's.
    const sessionKey = state.replay?.sessionId ?? `saved-${row.id}`;
    await results.upsert(row.user_id, {
      sessionKey,
      airspaceId: row.airspace_id,
      difficulty: row.difficulty,
      simTimeSec,
      finalTick: state.tick,
      rp: state.score.total,
      stats: scoreStats(state.score),
      report: sessionReport(state),
      replay: state.replay ?? null,
      engineVersion: state.replay?.engineVersion ?? null,
      // Only results the client sent as they were played are put through verification.
      verification: 'unverifiable',
    });
    // Dated when it was first saved, not today.
    await db.query(
      `UPDATE session_results SET created_at = least(created_at, $3)
       WHERE user_id = $1 AND session_key = $2`,
      [row.user_id, sessionKey, row.created_at],
    );
    recorded++;
  }
  console.log(
    `${recorded} saved sessions recorded as results, ${skipped} skipped (too short or unreadable).`,
  );
} finally {
  await db.end();
}
