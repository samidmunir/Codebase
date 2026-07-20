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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = {
      status: error.response?.status ?? 0,
      code: error.response?.data?.error?.code ?? "NETWORK_ERROR",
      message:
        error.response?.data?.message ??
        error.message ??
        "An unexpected error occurred.",
      details: error.response?.data?.error?.details ?? null,
    };

    return Promise.reject(normalizedError);
  },
);
