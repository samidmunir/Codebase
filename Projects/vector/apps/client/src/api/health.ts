import { readinessResponseSchema, type ReadinessResponse } from '@vector/shared';

export async function fetchReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  const response = await fetch('/api/health/ready', signal ? { signal } : {});
  // 503 still carries a valid readiness body describing which check failed.
  if (!response.ok && response.status !== 503) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return readinessResponseSchema.parse(await response.json());
}
