import {
  createSavedSessionRequestSchema,
  MAX_SAVED_SESSIONS,
  renameSavedSessionRequestSchema,
  replaceSavedSessionRequestSchema,
  type SavedSession,
  type SavedSessionList,
  type SavedSessionSummary,
  addSessionStats,
  emptySessionStats,
} from '@vector/shared';
import { parseSnapshot, scoreStats } from '@vector/sim-core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/authenticate';
import {
  SavedSessionNotFoundError,
  type SavedSessionsRepository,
  type SnapshotRecord,
} from '../sessions/sessions-repository';

export interface SessionsRouteOptions {
  sessions: SavedSessionsRepository;
  jwtSecret: string;
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
  const preHandler = authenticate(options.jwtSecret);
  const limit = options.limit ?? MAX_SAVED_SESSIONS;
  const { sessions, bodyLimit } = options;
  const sessionId = (request: FastifyRequest) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) throw new SavedSessionNotFoundError();
    return parsed.data.id;
  };

  app.get('/sessions', { preHandler }, async (request): Promise<SavedSessionList> => {
    const list = await sessions.list(request.userId!);
    return {
      sessions: list,
      limit,
      careerRp: list.reduce((total, session) => total + session.rp, 0),
      careerStats: list.reduce(
        (total, session) => (session.stats ? addSessionStats(total, session.stats) : total),
        emptySessionStats(),
      ),
    };
  });

  app.get('/sessions/:id', { preHandler }, async (request): Promise<SavedSession> =>
    sessions.get(request.userId!, sessionId(request)),
  );

  app.post(
    '/sessions',
    { preHandler, bodyLimit },
    async (request, reply): Promise<SavedSessionSummary> => {
      const body = createSavedSessionRequestSchema.parse(request.body);
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
