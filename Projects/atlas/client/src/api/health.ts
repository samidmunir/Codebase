import { apiConfig } from "./config";

export interface HealthResponse {
  status: string;
  service: string;
}

export interface ReadinessResponse {
  status: string;
  database: string;
}

export async function geHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }

  return response.json();
}

export async function getReadiness(): Promise<ReadinessResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/ready`);
  if (!response.ok) {
    throw new Error(`Readiness request failed: ${response.status}`);
  }

  return response.json();
}
