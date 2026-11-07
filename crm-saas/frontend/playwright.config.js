import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.RENTAL_E2E_BASE_URL || "http://127.0.0.1:5057",
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: "list",
  outputDir: "/tmp/flowdesck-playwright-results",
});
