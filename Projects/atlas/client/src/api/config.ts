const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is not configured");
}

export const apiConfig = {
  baseUrl: API_URL,
} as const;
