import { apiConfig } from "./config";
import { ApiError } from "./ApiError";

interface RequestOptions extends RequestInit {
  accessToken?: string | null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { accessToken, headers, ...requestOptions } = options;

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...requestOptions,

    // Required so the browser sends our HttpOnly refresh cookie.
    credentials: "include",

    headers: {
      "Content-Type": "application/json",
      ...headers,

      ...(accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const body = (await response.json()) as {
        error?: string;
      };

      if (body.error) {
        message = body.error;
      }
    } catch {
      // Response wasn't JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
