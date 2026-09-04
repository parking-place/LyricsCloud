import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: "line",
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.02 } },
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", serviceWorkers: "block" },
  webServer: [
    {
      command: "node tests/e2e/oidc-fixture-server.mjs",
      url: "http://127.0.0.1:3100/health",
      reuseExistingServer: false
    },
    {
      command: "pnpm --filter @lyricscloud/web start",
      env: {
        NODE_ENV: "production",
        OIDC_TEST_FIXTURE: "true",
        DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://user:synthetic@127.0.0.1:65432/missing",
        APP_VERSION: "0.1.0",
        BUILD_ID: "playwright",
        APP_ORIGIN: "http://127.0.0.1:3000",
        GOOGLE_ISSUER: "http://127.0.0.1:3100",
        GOOGLE_CLIENT_ID: "synthetic-e2e-client",
        GOOGLE_CLIENT_SECRET: "synthetic-e2e-client-secret",
        SESSION_SECRET: "synthetic-e2e-session-secret-at-least-32-bytes",
        AUTH_ALLOWED_EMAILS: "fixture@example.invalid",
        AUTH_ALLOWED_EMAILS_FILE: "",
        HOSTNAME: "127.0.0.1",
        PORT: "3000"
      },
      url: "http://127.0.0.1:3000/api/health/live",
      reuseExistingServer: false
    }
  ],
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
