import { defaultSettings } from '@vector/shared';
import { describe, expect, it } from 'vitest';
import type { AtcCommand } from '../commands/commands';
import { SeededRandom } from '../random/seeded-random';
import { airlines, allAirspaces, performance } from '../testing/fixtures';
import { parseSnapshot } from '../snapshot/snapshot';
import { ReplayRunner, replaySession, stateFingerprint } from './replay-session';
import { SimEngine } from './sim-engine';

/**
 * A scripted player: every so often gives one of its aircraft a heading, altitude,
 * speed or approach clearance, releases waiting departures, and retunes traffic.
 * Its choices come from its own random generator, never the engine's.
 */
function playFor(engine: SimEngine, seconds: number, player: SeededRandom): void {
  for (let s = 0; s < seconds; s++) {
    if (s % 15 === 0) {
      for (const entry of engine.departureQueue)
        if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick)
          engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
      const mine = engine.listAircraft().filter((a) => a.owner === engine.playerId);
      if (mine.length > 0) {
        const aircraft = player.pick(mine);
        const commands: AtcCommand[] = [];
        const roll = player.next();
        if (roll < 0.3)
          commands.push({ type: 'heading', headingDeg: player.int(1, 36) * 10, turn: 'shortest' });
        else if (roll < 0.55)
          commands.push({ type: 'altitude', altitudeFt: player.int(5, 15) * 1_000 });
        else if (roll < 0.75)
          commands.push({ type: 'speed', iasKts: player.pick([210, 230, 250]) });
        engine.issueInstruction(
          aircraft.id,
          commands.length > 0 ? commands : [{ type: 'resumeNormalSpeed' }],
        );
      }
    }
    if (s === 600)
      engine.updateTrafficSettings({ 'traffic.arrivalRatePerHour': player.int(4, 16) });
    engine.step();
  }
}

describe.each(allAirspaces.map((pack) => [pack.airspace.name, pack] as const))(
  'replaying a session in %s',
  (_name, pack) => {
    it('gives exactly the same session from its start and inputs, across a save and resume', () => {
      const context = { airspace: pack, airlines };
      /** A weather report for every airport, as the live weather feed sends. */
      const report = (directionDeg: number, speedKts: number, observedAt: string) =>
        pack.airspace.airports.map((icao) => ({
          icao,
          observedAt,
          raw: `METAR ${icao}`,
          windDirectionTrueDeg: directionDeg,
          windSpeedKts: speedKts,
        }));
      const engine = SimEngine.create({
        ...context,
        performance,
        world: { magneticVariationDeg: pack.airspace.magneticVariationDeg },
        seed: 77,
        startTimeUtc: '2026-10-04T15:00:00Z',
        settings: {
          ...defaultSettings('session'),
          'weather.windMode': 'live',
          'traffic.arrivalRatePerHour': 10,
          'traffic.departureRatePerHour': 10,
          'traffic.transitRatePerHour': 6,
        },
        liveWeather: report(230, 12, '2026-10-04T14:51:00Z'),
        sessionId: 'test-session',
      });
      const player = new SeededRandom(5);
      playFor(engine, 1_200, player);

      // Saved and resumed halfway, as a player would.
      const resumed = SimEngine.fromSnapshot(
        JSON.parse(JSON.stringify(engine.toSnapshot())),
        performance,
        context,
      );
      expect(resumed.applyLiveWeather(report(250, 15, '2026-10-04T15:20:00Z'))).toEqual({
        ok: true,
      });
      playFor(resumed, 1_200, player);

      const recorded = resumed.toSnapshot();
      const replay = recorded.state.replay!;
      expect(replay.sessionId).toBe('test-session');
      expect(replay.inputs.length).toBeGreaterThan(100);
      expect(new Set(replay.inputs.map((input) => input.type))).toEqual(
        new Set(['instruction', 'release', 'traffic', 'liveWeather']),
      );
      expect(resumed.score.total).not.toBe(0);

      const replayed = replaySession(replay, performance, context, recorded.state.tick);
      // Leave out one instruction, and it's a different session.
      const tampered = replaySession(
        {
          ...replay,
          inputs: replay.inputs.filter(
            (_, i) => i !== replay.inputs.findIndex((x) => x.type === 'instruction'),
          ),
        },
        performance,
        context,
        recorded.state.tick,
      );
      expect(JSON.parse(JSON.stringify(tampered.toSnapshot()))).not.toEqual(
        JSON.parse(JSON.stringify(recorded)),
      );

      // The fingerprint the server compares: equal for the replay, run a little at a time,
      // and equal whatever pause and speed the player used.
      const runner = new ReplayRunner(replay, performance, context, recorded.state.tick);
      let chunks = 0;
      while (!runner.run(250)) chunks++;
      expect(chunks).toBeGreaterThan(5);
      const paused = parseSnapshot(JSON.parse(JSON.stringify(recorded))).state;
      paused.paused = true;
      paused.speed = 4;
      expect(stateFingerprint(parseSnapshot(runner.engine.toSnapshot()).state)).toBe(
        stateFingerprint(paused),
      );
      expect(stateFingerprint(parseSnapshot(tampered.toSnapshot()).state)).not.toBe(
        stateFingerprint(paused),
      );

      // Same state, field for field (key order can differ after a resume's parse).
      expect(JSON.parse(JSON.stringify(replayed.toSnapshot()))).toEqual(
        JSON.parse(JSON.stringify(recorded)),
      );
    });
  },
);
