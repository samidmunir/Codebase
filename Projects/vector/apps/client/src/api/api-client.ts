import { apiErrorSchema, authResponseSchema, type AuthResponse } from '@vector/shared';

// HTTP client for the Vector API. The access token lives only in memory; the
// refresh token is an HttpOnly cookie the browser sends to /api/auth.

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

let accessToken: string | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshing: Promise<AuthResponse | undefined> | undefined;
/** Called when the session can't be refreshed (e.g. signed out on another device). */
let onSessionEnded: (() => void) | undefined;

/** Refresh this long before the access token expires. */
const REFRESH_EARLY_MS = 60_000;
/** Wait before retrying a refresh another tab just won. */
const STALE_RETRY_MS = 400;

export function setSessionEndedHandler(handler: () => void): void {
  onSessionEnded = handler;
}

async function parseError(response: Response): Promise<ApiRequestError> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => undefined));
  return parsed.success
    ? new ApiRequestError(
        response.status,
        parsed.data.error.code,
        parsed.data.error.message,
        parsed.data.error.fields,
      )
    : new ApiRequestError(response.status, 'unknown', `Request failed (${response.status})`);
}

function startSession(auth: AuthResponse): AuthResponse {
  accessToken = auth.accessToken;
  clearTimeout(refreshTimer);
  const delay = Math.max(
    5_000,
    Date.parse(auth.accessTokenExpiresAt) - Date.now() - REFRESH_EARLY_MS,
  );
  refreshTimer = setTimeout(() => void refreshSession(), delay);
  return auth;
}

export function clearSession(): void {
  accessToken = undefined;
  clearTimeout(refreshTimer);
}

async function postAuth(path: string, body?: unknown): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    ...(body !== undefined
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  if (!response.ok) throw await parseError(response);
  return startSession(authResponseSchema.parse(await response.json()));
}

export const register = (email: string, password: string, displayName: string) =>
  postAuth('register', { email, password, displayName });

export const login = (email: string, password: string) => postAuth('login', { email, password });

/**
 * Restores or renews the session from the refresh cookie. Returns undefined
 * when there is no valid session. Concurrent calls share one request.
 */
export function refreshSession(): Promise<AuthResponse | undefined> {
  refreshing ??= (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await postAuth('refresh');
      } catch (error) {
        // Another tab rotated the token first; its new cookie is ours now too.
        if (error instanceof ApiRequestError && error.code === 'session_stale' && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, STALE_RETRY_MS));
          continue;
        }
        if (error instanceof ApiRequestError && error.status === 401) {
          clearSession();
          onSessionEnded?.();
          return undefined;
        }
        throw error;
      }
    }
    return undefined;
  })().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

export async function logout(): Promise<void> {
  clearSession();
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(
    () => undefined,
  );
}

/** JSON request with the access token, refreshing once if it has expired. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && !retried && (await refreshSession())) {
    return apiRequest<T>(path, init, true);
  }
  if (!response.ok) throw await parseError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}
