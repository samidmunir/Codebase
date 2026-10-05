import type { SessionSettings } from '@vector/shared';
import type { PerformanceCatalog } from '../performance/performance';
import type { Replay, ReplayInput } from '../snapshot/replay';
import { SimEngine, type OperationsContext } from './sim-engine';

/**
 * Plays a session again from its start, giving each recorded input at its tick,
 * up to `untilTick`. With the same engine version and static data, the result is
 * the same session as the one recorded.
 */
export function replaySession(
  replay: Replay,
  performance: PerformanceCatalog,
  context: OperationsContext,
  untilTick: number,
): SimEngine {
  const { start } = replay;
  const engine = SimEngine.create({
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
  const inputs = [...replay.inputs].sort((a, b) => a.tick - b.tick);
  let next = 0;
  for (;;) {
    while (next < inputs.length && inputs[next]!.tick <= engine.tick) give(engine, inputs[next++]!);
    if (engine.tick >= untilTick) break;
    engine.step();
  }
  return engine;
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
