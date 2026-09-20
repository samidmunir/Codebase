import { ApiError } from "./ApiError";
import { apiRequest } from "./client";

import {
  getAccessToken,
  refreshAccessToken,
} from "../features/auth/services/tokenManager";

interface AuthenticatedRequestOptions extends RequestInit {
  retryOnUnauthorized?: boolean;
}

export async function authenticatedApiRequest<T>(
  path: string,
  options: AuthenticatedRequestOptions = {},
): Promise<T> {
  const { retryOnUnauthorized = true, ...requestOptions } = options;

  let accessToken = getAccessToken();

  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }

  try {
    return await apiRequest<T>(path, {
      ...requestOptions,
      accessToken,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      retryOnUnauthorized
    ) {
      const refreshedAccessToken = await refreshAccessToken();

      return apiRequest<T>(path, {
        ...requestOptions,
        accessToken: refreshedAccessToken,
      });
    }

    throw error;
  }
}
