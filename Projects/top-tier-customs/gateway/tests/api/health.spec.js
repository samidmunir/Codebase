import { test, expect } from "@playwright/test";

test.describe("API Gateway - Health Check", () => {
  test("GET /api/health should return 200 and healthy status", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty("ok");
    expect(body.ok).toBe(true);
  });
});
