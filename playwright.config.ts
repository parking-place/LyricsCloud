import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm --filter @lyricscloud/web start",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? (process.env.E2E_SESSION_TOKEN ? process.env.DATABASE_URL : undefined) ?? "postgresql://user:synthetic@127.0.0.1:65432/missing",
      APP_VERSION: "0.1.0",
      BUILD_ID: "playwright",
      APP_ORIGIN: "https://127.0.0.1:3000",
      GOOGLE_ISSUER: "https://accounts.google.com",
      GOOGLE_CLIENT_ID: "synthetic.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "synthetic-e2e-secret",
      SESSION_SECRET: "synthetic-e2e-session-secret-at-least-32-bytes",
      AUTH_ALLOWED_EMAILS: "fixture@example.invalid",
      HOSTNAME: "127.0.0.1",
      PORT: "3000"
    },
    url: "http://127.0.0.1:3000/api/health/live",
    reuseExistingServer: true
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
