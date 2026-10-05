import {
  createSavedSessionRequestSchema,
  MAX_SAVED_SESSIONS,
  renameSavedSessionRequestSchema,
  replaceSavedSessionRequestSchema,
  type SavedSession,
  type SavedSessionList,
  type SavedSessionSummary,
  type CareerTotals,
} from '@vector/shared';
import { parseSnapshot, scoreStats } from '@vector/sim-core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Authenticator } from '../auth/authenticate';
import type { AirspacesRepository } from '../airspaces/airspaces-repository';
import {
  SavedSessionNotFoundError,
  type SavedSessionsRepository,
  type SnapshotRecord,
} from '../sessions/sessions-repository';

export interface SessionsRouteOptions {
  sessions: SavedSessionsRepository;
  /** The pilot's career totals (from their session results). */
  careerTotals: (userId: string) => Promise<CareerTotals>;
  /** Sessions in an airspace an admin has closed can't be started, resumed or saved. */
  airspaces: AirspacesRepository;
  authenticate: Authenticator;
  /** Saved sessions allowed per account. */
  limit?: number;
  /** Largest request body accepted for a snapshot, in bytes. */
  bodyLimit: number;
}

/** Thrown when a snapshot isn't one the simulator can resume. */
export class InvalidSnapshotError extends Error {
  /** What failed validation (logged, not sent to the player). */
  constructor(readonly detail: string) {
    super("That session couldn't be saved: the simulation data is invalid");
    this.name = 'InvalidSnapshotError';
  }
}

const idParams = z.object({ id: z.uuid() });

/** Validates the snapshot with sim-core and derives the summary columns from it. */
function snapshotRecord(
  snapshot: unknown,
  difficulty: SnapshotRecord['difficulty'],
): SnapshotRecord {
  let parsed;
  try {
    parsed = parseSnapshot(snapshot);
  } catch (error) {
    throw new InvalidSnapshotError(error instanceof Error ? error.message : String(error));
  }
  return {
    snapshot: parsed,
    snapshotVersion: parsed.schemaVersion,
    simTimeSec: parsed.state.tick * parsed.state.config.tickSeconds,
    aircraftCount: parsed.state.aircraft.length,
    rp: parsed.state.score.total,
    stats: scoreStats(parsed.state.score),
    difficulty,
  };
}

export async function sessionsRoutes(app: FastifyInstance, options: SessionsRouteOptions) {
  const preHandler = options.authenticate.user;
  const limit = options.limit ?? MAX_SAVED_SESSIONS;
  const { sessions, airspaces, bodyLimit } = options;
  const sessionId = (request: FastifyRequest) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) throw new SavedSessionNotFoundError();
    return parsed.data.id;
  };

  app.get('/sessions', { preHandler }, async (request): Promise<SavedSessionList> => {
    const [list, career] = await Promise.all([
      sessions.list(request.userId!),
      options.careerTotals(request.userId!),
    ]);
    return { sessions: list, limit, careerRp: career.rp, careerStats: career.stats };
  });

  app.get('/sessions/:id', { preHandler }, async (request): Promise<SavedSession> => {
    const saved = await sessions.get(request.userId!, sessionId(request));
    await airspaces.requireEnabled(saved.airspaceId);
    return saved;
  });

  app.post(
    '/sessions',
    { preHandler, bodyLimit },
    async (request, reply): Promise<SavedSessionSummary> => {
      const body = createSavedSessionRequestSchema.parse(request.body);
      await airspaces.requireEnabled(body.airspaceId);
      const saved = await sessions.create(
        request.userId!,
        {
          name: body.name,
          airspaceId: body.airspaceId,
          ...snapshotRecord(body.snapshot, body.difficulty),
        },
        limit,
      );
      reply.code(201);
      return saved;
    },
  );

  app.put(
    '/sessions/:id',
    { preHandler, bodyLimit },
    async (request): Promise<SavedSessionSummary> => {
      const id = sessionId(request);
      const body = replaceSavedSessionRequestSchema.parse(request.body);
      await airspaces.requireEnabled(await sessions.airspaceOf(request.userId!, id));
      return sessions.replace(request.userId!, id, snapshotRecord(body.snapshot, body.difficulty));
    },
  );

  app.patch('/sessions/:id', { preHandler }, async (request): Promise<SavedSessionSummary> => {
    const id = sessionId(request);
    const { name } = renameSavedSessionRequestSchema.parse(request.body);
    return sessions.rename(request.userId!, id, name);
  });

  app.delete('/sessions/:id', { preHandler }, async (request, reply) => {
    await sessions.delete(request.userId!, sessionId(request));
    return reply.code(204).send();
  });
}
