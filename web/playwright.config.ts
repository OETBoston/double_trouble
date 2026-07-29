import { defineConfig, devices } from "@playwright/test";

// E2E specs mock every network call (our API, Mapbox) via page.route, so
// this only needs the frontend dev server running — no Docker/Postgres/API
// dependency, which keeps these fast and independent of local service state.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 30000,
    env: { VITE_DISABLE_HTTPS: "1" },
  },
});
