import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm --filter @lyricscloud/web start",
    env: { NODE_ENV: "production", DATABASE_URL: "postgresql://user:synthetic@127.0.0.1:65432/missing", HOSTNAME: "127.0.0.1", PORT: "3000" },
    url: "http://127.0.0.1:3000/api/health/live",
    reuseExistingServer: true
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
