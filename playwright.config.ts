import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config. The webServer boots the app (dev) and the e2e walks the
 * entire connected journey. It hits the real Neon DB and, with no OpenRouter
 * key, exercises the cached-curriculum + static-fallback paths — proving the
 * loop works end-to-end even when live models are unavailable.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Run against a production build: no on-demand route compilation racing with
  // the first auth request, and it doubles as a production smoke test.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
