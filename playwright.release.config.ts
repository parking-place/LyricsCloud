import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const commonUse = {
  ...base.use,
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
  colorScheme: "dark" as const,
  reducedMotion: "reduce" as const,
  serviceWorkers: "block" as const
};

export default defineConfig({
  ...base,
  metadata: { ...base.metadata, releaseCandidate0905: true },
  reporter: "line",
  projects: [
    { name: "chromium-desktop", use: { ...commonUse, browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "firefox-desktop", use: { ...commonUse, browserName: "firefox", viewport: { width: 1440, height: 1000 } } },
    { name: "webkit-desktop", use: { ...commonUse, browserName: "webkit", viewport: { width: 1440, height: 1000 } } },
    { name: "chromium-mobile", use: { ...commonUse, browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "webkit-mobile", use: { ...commonUse, browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
