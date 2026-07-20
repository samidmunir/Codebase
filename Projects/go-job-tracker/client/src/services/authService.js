import { apiClient } from "../api/apiClient";
import { publicAPIClient } from "../api/publicAPIClient";

export async function registerUser(payload) {
  const response = await publicAPIClient.post("/auth/register", payload);

  return response.data;
}

export async function loginUser(payload) {
  const response = await publicAPIClient.post("/auth/login", payload);

  return response.data;
}

export async function refreshSession() {
  const response = await publicAPIClient.post("/auth/refresh");

  return response.data;
}

export async function logoutUser() {
  const response = await publicAPIClient.post("/auth/logout");

  return response.data;
}
