import { refresh } from "../api/authApi";

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await refresh();

      accessToken = response.accessToken;

      return response.accessToken;
    } catch (error) {
      accessToken = null;

      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
