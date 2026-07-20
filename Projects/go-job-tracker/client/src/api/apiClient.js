import axios from "axios";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStore";
import { publicAPIClient } from "./publicAPIClient";

const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

function normalizeAPIError(error) {
  return {
    status: error.response?.status ?? 0,
    code:
      error.response?.data?.error?.code ??
      (error.code === "ECONNABORTED" ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"),
    message:
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred.",
    details: error.response?.data?.error?.details ?? null,
    originalError: error,
  };
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = publicAPIClient
      .post("/auth/refresh")
      .then((response) => {
        const token = response.data?.data?.accessToken;
        if (!token) {
          throw new Error("Refresh response did not contain an access token.");
        }

        setAccessToken(token);

        return token;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(normalizeAPIError(error)),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const shouldAttemptRefresh =
      status === 401 && originalRequest && !originalRequest._retry;
    if (!shouldAttemptRefresh) {
      return Promise.reject(normalizeAPIError(error));
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAccessToken();

      window.dispatchEvent(new CustomEvent("auth:session-expired"));

      return Promise.reject(normalizeAPIError(refreshError));
    }
  },
);
