import { ApiError } from "./ApiError";
import { apiConfig } from "./config";

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
    throw await createApiError(response);
  }

  return parseResponse<T>(response);
}

async function createApiError(response: Response): Promise<ApiError> {
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

  return new ApiError(message, response.status);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
