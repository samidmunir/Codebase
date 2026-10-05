import {
  MIN_RESULT_SIM_SEC,
  RESULTS_PAGE_SIZE,
  type PilotProfile,
  type ResultDetail,
  type ResultPage,
  type ResultSummary,
  type UploadResultRequest,
} from '@vector/shared';
import { parseSnapshot, scoreStats, sessionReport, SIM_ENGINE_VERSION } from '@vector/sim-core';
import type { AirspacesRepository } from '../airspaces/airspaces-repository';
import { UserNotFoundError, type UsersRepository } from '../users/users-repository';
import { ResultNotFoundError, type ResultsRepository } from './results-repository';

/** The snapshot isn't one the simulator can read, or isn't this session's. */
export class InvalidResultError extends Error {
  constructor(
    message: string,
    readonly detail = message,
  ) {
    super(message);
    this.name = 'InvalidResultError';
  }
}

/** Recent sessions shown on a profile. */
const PROFILE_RECENT = 10;

export function resultsService(deps: {
  results: ResultsRepository;
  users: UsersRepository;
  airspaces: AirspacesRepository;
}) {
  const { results, users, airspaces } = deps;

  /** The pilot by handle, if the viewer may see their results. */
  async function visiblePilot(handle: string, viewerId: string | undefined) {
    const user = await users.findByHandle(handle);
    if (!user || user.disabledAt) throw new UserNotFoundError();
    const isYou = user.id === viewerId;
    return { user, isYou, visible: isYou || user.profilePublic };
  }

  return {
    /**
     * Records a session's result from its latest snapshot. Returns undefined for a
     * session too short to keep.
     */
    async upload(
      userId: string,
      sessionKey: string,
      request: Required<Pick<UploadResultRequest, 'difficulty'>> &
        Omit<UploadResultRequest, 'difficulty'>,
    ): Promise<ResultSummary | undefined> {
      let state;
      try {
        state = parseSnapshot(request.snapshot).state;
      } catch (error) {
        throw new InvalidResultError(
          "That session couldn't be recorded: the simulation data is invalid",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (state.replay && state.replay.sessionId !== sessionKey)
        throw new InvalidResultError('That snapshot is from another session');
      await airspaces.requireEnabled(request.airspaceId);

      const simTimeSec = state.tick * state.config.tickSeconds;
      if (simTimeSec < MIN_RESULT_SIM_SEC) return undefined;
      const replayable = state.replay?.engineVersion === SIM_ENGINE_VERSION;
      return results.upsert(userId, {
        sessionKey,
        airspaceId: request.airspaceId,
        difficulty: request.difficulty ?? null,
        simTimeSec,
        finalTick: state.tick,
        rp: state.score.total,
        stats: scoreStats(state.score),
        report: sessionReport(state),
        replay: state.replay ?? null,
        engineVersion: state.replay?.engineVersion ?? null,
        verification: replayable ? 'pending' : 'unverifiable',
      });
    },

    async get(id: string, viewerId: string | undefined): Promise<ResultDetail> {
      const found = await results.get(id);
      if (!found || (found.userId !== viewerId && !found.profilePublic))
        throw new ResultNotFoundError();
      return {
        result: found.summary,
        pilot: { handle: found.handle, displayName: found.displayName },
        report: found.report,
      };
    },

    async profile(handle: string, viewerId: string | undefined): Promise<PilotProfile> {
      const { user, isYou, visible } = await visiblePilot(handle, viewerId);
      if (!visible) return { visibility: 'private', pilot: { handle: user.handle } };
      const [career, byAirspace, history, recent] = await Promise.all([
        results.careerTotals(user.id),
        results.byAirspace(user.id),
        results.history(user.id),
        results.page(user.id, 0, PROFILE_RECENT),
      ]);
      return {
        visibility: 'public',
        pilot: {
          handle: user.handle,
          displayName: user.displayName,
          joinedAt: user.createdAt.toISOString(),
          isPublic: user.profilePublic,
          isYou,
        },
        career,
        byAirspace,
        history,
        recent: recent.results,
      };
    },

    async page(
      handle: string,
      viewerId: string | undefined,
      offset: number,
      limit = RESULTS_PAGE_SIZE,
    ): Promise<ResultPage> {
      const { user, visible } = await visiblePilot(handle, viewerId);
      if (!visible) throw new UserNotFoundError();
      return results.page(user.id, offset, limit);
    },

    careerTotals: (userId: string) => results.careerTotals(userId),
  };
}

export type ResultsService = ReturnType<typeof resultsService>;
