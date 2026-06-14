import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "src/renderer/tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:renderer -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1360, height: 900 },
      },
    },
    {
      name: "compact-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 720 },
      },
    },
    {
      name: "browser-default-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
