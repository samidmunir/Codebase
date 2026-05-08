// gateway/playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html"]],

  use: {
    baseURL: "http://localhost:8081",
  },

  webServer: {
    command: "npm run start",
    url: "http://localhost:8081/health",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
