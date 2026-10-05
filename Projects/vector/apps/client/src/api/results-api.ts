import {
  pilotProfileSchema,
  resultDetailSchema,
  resultPageSchema,
  resultSummarySchema,
  type PilotProfile,
  type ResultDetail,
  type ResultPage,
  type ResultSummary,
  type UploadResultRequest,
} from '@vector/shared';
import { apiRequest } from './api-client';

// Session results and pilot profiles.

/** Records the result of a session (undefined: too short to keep). */
export async function recordResult(
  sessionId: string,
  request: UploadResultRequest,
): Promise<ResultSummary | undefined> {
  const response = await apiRequest<unknown>(`/results/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
  return response === undefined ? undefined : resultSummarySchema.parse(response);
}

export async function getResult(id: string): Promise<ResultDetail> {
  return resultDetailSchema.parse(await apiRequest(`/results/${encodeURIComponent(id)}`));
}

export async function getPilot(handle: string): Promise<PilotProfile> {
  return pilotProfileSchema.parse(await apiRequest(`/pilots/${encodeURIComponent(handle)}`));
}

export async function getPilotResults(handle: string, offset: number): Promise<ResultPage> {
  return resultPageSchema.parse(
    await apiRequest(`/pilots/${encodeURIComponent(handle)}/results?offset=${offset}`),
  );
}
