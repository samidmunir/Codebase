import type { SessionSettings } from '@vector/shared';
import type { PerformanceCatalog } from '../performance/performance';
import type { Replay, ReplayInput } from '../snapshot/replay';
import type { SimState } from '../snapshot/snapshot';
import { SimEngine, type OperationsContext } from './sim-engine';

/**
 * Plays a session again from its start, giving each recorded input at its tick,
 * a few ticks at a time (so a server can do other work in between). With the
 * same engine version and static data, it ends in the same state as the session
 * recorded.
 */
export class ReplayRunner {
  readonly engine: SimEngine;
  private readonly inputs: ReplayInput[];
  private next = 0;

  constructor(
    replay: Replay,
    performance: PerformanceCatalog,
    context: OperationsContext,
    readonly untilTick: number,
  ) {
    const { start } = replay;
    this.engine = SimEngine.create({
      ...context,
      performance,
      seed: start.seed,
      startTimeUtc: start.startTimeUtc,
      world: start.world,
      config: start.config,
      settings: start.settings,
      playerId: start.playerId,
      runwayConfigs: start.runwayConfigs,
      ...(start.liveWeather.length > 0 ? { liveWeather: start.liveWeather } : {}),
      sessionId: replay.sessionId,
    });
    this.inputs = [...replay.inputs].sort((a, b) => a.tick - b.tick);
  }

  get done(): boolean {
    return this.engine.tick >= this.untilTick;
  }

  /** Runs up to `maxTicks` more ticks. Returns true once the replay has reached its end. */
  run(maxTicks = Infinity): boolean {
    const engine = this.engine;
    for (let ran = 0; ; ran++) {
      while (this.next < this.inputs.length && this.inputs[this.next]!.tick <= engine.tick)
        give(engine, this.inputs[this.next++]!);
      if (engine.tick >= this.untilTick) return true;
      if (ran >= maxTicks) return false;
      engine.step();
    }
  }
}

/** Plays a session again from its start to `untilTick` (see ReplayRunner). */
export function replaySession(
  replay: Replay,
  performance: PerformanceCatalog,
  context: OperationsContext,
  untilTick: number,
): SimEngine {
  const runner = new ReplayRunner(replay, performance, context, untilTick);
  runner.run();
  return runner.engine;
}

function give(engine: SimEngine, input: ReplayInput): void {
  switch (input.type) {
    case 'instruction':
      engine.issueInstruction(input.aircraftId, input.commands);
      break;
    case 'release':
      engine.releaseDeparture(input.entryId, input.runway);
      break;
    case 'liveWeather':
      engine.applyLiveWeather(input.reports);
      break;
    case 'traffic':
      engine.updateTrafficSettings(input.patch as Partial<SessionSettings>);
      break;
  }
}

/** JSON with every object's keys in order, so equal values give equal text. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : item,
  );
}

/**
 * The session's state as canonical text, for comparing a replay with the session
 * recorded. Pause and sim speed are left out: they never change how it plays out.
 */
export function stateFingerprint(state: Readonly<SimState>): string {
  return canonicalJson({ ...state, speed: undefined, paused: undefined });
}
