import { apiClient } from "../api/apiClient";
import { publicAPIClient } from "../api/publicAPIClient";

export async function registerUser(payload) {
  const response = await publicAPIClient.post("/auth/register", payload);

  return response.data;
}
