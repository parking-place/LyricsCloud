import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

export default defineConfig({
  ...base,
  testMatch: "shortcuts.spec.ts",
  projects: [
    { name: "chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 }, colorScheme: "dark" } },
    { name: "firefox", use: { browserName: "firefox", viewport: { width: 1440, height: 1000 }, colorScheme: "dark" } },
    { name: "webkit", use: { browserName: "webkit", viewport: { width: 1440, height: 1000 }, colorScheme: "dark" } }
  ]
});
