import axios from "axios";

const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

export const publicAPIClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
