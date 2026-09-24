import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/new-feature/**/*.test.ts"],
    passWithNoTests: false,
    // Integration files share one disposable PostgreSQL database. A global
    // projection-retry test must not consume another file's pending fixture.
    fileParallelism: process.env.AUTH_DATABASE_INTEGRATION !== "true"
  }
});
