import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// Runs against the production build (`npm run build` first). The contact form uses
// log delivery here so tests never send real email.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // The service worker would fetch map tiles past the page-level stub; only the offline tests allow it.
    serviceWorkers: "block",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { CONTACT_DELIVERY: "log", ALLOW_LOG_DELIVERY: "true", CONTACT_RATE_LIMIT: "50" },
  },
});
