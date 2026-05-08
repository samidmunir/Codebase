import { test, expect } from "@playwright/test";

test.describe("API Auth - Health Check", () => {
  test("GET /health should return 200 and healthy status", async ({
    request,
  }) => {
    const response = await request.get("/health");

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty("ok");
    expect(body.status).toBe(true);
  });
});
