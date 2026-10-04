import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  outputDir: ".artifacts/playwright",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    browserName: "chromium",
    viewport: { width: 1440, height: 960 },
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--no-sandbox"] },
  },
});
