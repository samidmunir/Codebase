import { defaultSettings } from '@vector/shared';
import { SeededRandom, SimEngine, type AtcCommand } from '@vector/sim-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import './platform/config';
import { createDatabase } from './platform/database';
import { simData } from './results/sim-data';

// Runs against the real test database (TEST_DATABASE_URL).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = TEST_DATABASE_URL ? createDatabase(TEST_DATABASE_URL) : undefined;

const app = buildApp({
  checkDatabase: async () => true,
  ...(db
    ? {
        accounts: {
          db,
          auth: {
            jwtSecret: 'integration-test-secret-long-enough-0123456789',
            accessTokenMinutes: 15,
            refreshTokenDays: 30,
          },
          secureCookies: false,
          signInRateLimit: 1_000,
          // Check results straight away (sessions here are finished when uploaded).
          verification: { settleSec: 0, pollMs: 60_000 },
        },
      }
    : {}),
});

/** A New York session as a player would have it: 15 minutes, worked by a scripted player. */
function playedSession(sessionId: string) {
  const data = simData('new-york')!;
  const engine = SimEngine.create({
    performance: data.performance,
    airspace: data.airspace,
    airlines: data.airlines,
    world: { magneticVariationDeg: data.airspace.airspace.magneticVariationDeg },
    seed: 21,
    startTimeUtc: '2026-10-04T18:00:00Z',
    settings: {
      ...defaultSettings('session'),
      'traffic.arrivalRatePerHour': 12,
      'traffic.departureRatePerHour': 10,
    },
    sessionId,
  });
  const player = new SeededRandom(3);
  for (let s = 0; s < 900; s++) {
    if (s % 20 === 0) {
      for (const entry of engine.departureQueue)
        if (entry.status === 'waiting' && engine.tick >= entry.readyAtTick)
          engine.releaseDeparture(entry.id, engine.activeRunways[entry.airport]!.departures[0]!);
      const mine = engine.listAircraft().filter((a) => a.owner === engine.playerId);
      if (mine.length > 0) {
        const command: AtcCommand =
          player.next() < 0.5
            ? { type: 'heading', headingDeg: player.int(1, 36) * 10, turn: 'shortest' }
            : { type: 'altitude', altitudeFt: player.int(6, 14) * 1_000 };
        engine.issueInstruction(player.pick(mine).id, [command]);
      }
    }
    engine.step();
  }
  // As the browser sends it: paused, at whatever speed.
  engine.pause();
  engine.setSpeed(4);
  return JSON.parse(JSON.stringify(engine.toSnapshot()));
}

let headers: { authorization: string };

const upload = (sessionId: string, snapshot: unknown) =>
  app.inject({
    method: 'PUT',
    url: `/api/results/${sessionId}`,
    headers,
    payload: { airspaceId: 'new-york', difficulty: 'normal', snapshot },
  });

const verificationOf = async (sessionId: string) =>
  (
    await db!.query(
      'SELECT verification, verification_note FROM session_results WHERE session_key = $1',
      [sessionId],
    )
  ).rows[0];

describe.skipIf(!db)('verifying results by replaying them (integration)', () => {
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await db!.query('TRUNCATE users CASCADE');
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'verify@example.com',
        handle: 'Verifier',
        password: 'correct horse battery',
        displayName: 'Pilot',
      },
    });
    headers = { authorization: `Bearer ${response.json<{ accessToken: string }>().accessToken}` };
  });

  afterAll(async () => {
    await app.close();
    await db?.end();
  });

  it('verifies an honest session', async () => {
    const snapshot = playedSession('honest');
    expect(snapshot.state.replay.inputs.length).toBeGreaterThan(20);
    expect((await upload('honest', snapshot)).json().verification).toBe('pending');
    expect(await app.verifier!.runOnce()).toBe(1);
    expect(await verificationOf('honest')).toEqual({
      verification: 'verified',
      verification_note: null,
    });
  });

  it('catches a doctored score', async () => {
    const snapshot = playedSession('doctored');
    snapshot.state.score.total += 5_000;
    await upload('doctored', snapshot);
    await app.verifier!.runOnce();
    expect(await verificationOf('doctored')).toEqual({
      verification: 'mismatch',
      verification_note: 'replay differs',
    });
  });

  it('catches inputs that don’t lead to the state uploaded', async () => {
    const snapshot = playedSession('edited');
    const firstInstruction = snapshot.state.replay.inputs.findIndex(
      (input: { type: string }) => input.type === 'instruction',
    );
    snapshot.state.replay.inputs.splice(firstInstruction, 1);
    await upload('edited', snapshot);
    await app.verifier!.runOnce();
    expect((await verificationOf('edited')).verification).toBe('mismatch');
  });

  it('can’t verify a session from another engine version', async () => {
    const snapshot = playedSession('old-engine');
    snapshot.state.replay.engineVersion = '1';
    expect((await upload('old-engine', snapshot)).json().verification).toBe('unverifiable');
    expect(await app.verifier!.runOnce()).toBe(0);
  });

  it('checks a session again when it goes on after being verified', async () => {
    await upload('ongoing', playedSession('ongoing'));
    await app.verifier!.runOnce();
    expect((await verificationOf('ongoing')).verification).toBe('verified');
    // A later upload of the same session (it was resumed): pending again until checked.
    const later = playedSession('ongoing');
    expect((await upload('ongoing', later)).json().verification).toBe('pending');
  });
});
