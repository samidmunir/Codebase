import { apiClient } from "../api/apiClient";

export async function getAPIHealth() {
  const response = await apiClient.get("/health");

  return response.data;
}

export async function getDatabaseHealth() {
  const response = await apiClient.get("/health/database");

  return response.data;
}
