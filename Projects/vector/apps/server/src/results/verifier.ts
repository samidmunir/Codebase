import { parseSnapshot, replaySchema, ReplayRunner, SIM_ENGINE_VERSION } from '@vector/sim-core';
import type { FastifyBaseLogger } from 'fastify';
import { fingerprintHash } from './fingerprint';
import type { PendingResult, ResultsRepository } from './results-repository';
import { simData } from './sim-data';

/** Longest session (ticks) and most inputs a replay will take on. */
export const MAX_REPLAY_TICKS = 12 * 3_600;
export const MAX_REPLAY_INPUTS = 20_000;

export interface VerifierOptions {
  results: ResultsRepository;
  /** A result is checked once its session has had no update for this long. */
  settleSec: number;
  /** How often to look for results to check. */
  pollMs: number;
  /** Ticks replayed before letting the server get on with other work. */
  ticksPerSlice?: number;
  log?: FastifyBaseLogger;
}

export type Outcome = {
  verification: 'verified' | 'mismatch' | 'unverifiable';
  note: string | null;
};

const yieldToServer = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Replays a pending result from its start and inputs, and compares the final
 * state with the one its pilot uploaded.
 */
export async function verifyResult(result: PendingResult, ticksPerSlice = 300): Promise<Outcome> {
  if (result.engineVersion !== SIM_ENGINE_VERSION)
    return {
      verification: 'unverifiable',
      note: `engine version ${result.engineVersion ?? 'none'}`,
    };
  if (!result.stateFingerprint) return { verification: 'unverifiable', note: 'no fingerprint' };
  const parsed = replaySchema.safeParse(result.replay);
  if (!parsed.success) return { verification: 'unverifiable', note: 'no replay' };
  const replay = parsed.data;
  if (result.finalTick > MAX_REPLAY_TICKS || replay.inputs.length > MAX_REPLAY_INPUTS)
    return { verification: 'unverifiable', note: 'too long to replay' };
  const data = simData(result.airspaceId);
  if (!data) return { verification: 'unverifiable', note: `unknown airspace ${result.airspaceId}` };

  try {
    const runner = new ReplayRunner(
      replay,
      data.performance,
      { airspace: data.airspace, airlines: data.airlines },
      result.finalTick,
    );
    while (!runner.run(ticksPerSlice)) await yieldToServer();
    const replayed = fingerprintHash(parseSnapshot(runner.engine.toSnapshot()).state);
    return replayed === result.stateFingerprint
      ? { verification: 'verified', note: null }
      : { verification: 'mismatch', note: 'replay differs' };
  } catch (error) {
    return {
      verification: 'mismatch',
      note: `replay failed: ${error instanceof Error ? error.message.slice(0, 200) : 'error'}`,
    };
  }
}

/** Checks pending results one at a time, in the background. */
export function createVerifier(options: VerifierOptions) {
  const { results, settleSec, pollMs, ticksPerSlice = 300, log } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  let running: Promise<number> | undefined;

  /** Checks every result that's due now. Returns how many were settled. */
  async function drain(): Promise<number> {
    let settled = 0;
    // Results that changed mid-check stay pending; don't loop on them this round.
    const skipped = new Set<string>();
    for (;;) {
      const next = await results.nextPending(settleSec);
      if (!next || skipped.has(next.id)) return settled;
      const started = Date.now();
      const outcome = await verifyResult(next, ticksPerSlice);
      if (await results.settle(next.id, next.finalTick, outcome.verification, outcome.note)) {
        settled++;
        log?.info(
          { resultId: next.id, ...outcome, ms: Date.now() - started },
          'verified a session result',
        );
      } else skipped.add(next.id);
    }
  }

  function runOnce(): Promise<number> {
    running ??= drain().finally(() => {
      running = undefined;
    });
    return running;
  }

  function schedule() {
    if (stopped) return;
    timer = setTimeout(() => {
      timer = undefined;
      runOnce()
        .catch((error: unknown) => log?.error(error, 'result verification failed'))
        .finally(schedule);
    }, pollMs);
  }

  return {
    runOnce,
    start() {
      if (!stopped) return;
      stopped = false;
      schedule();
    },
    async stop() {
      stopped = true;
      clearTimeout(timer);
      timer = undefined;
      await running;
    },
  };
}

export type Verifier = ReturnType<typeof createVerifier>;
