import axios from "axios";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

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
