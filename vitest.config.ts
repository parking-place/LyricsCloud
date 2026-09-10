import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/new-feature/**/*.test.ts"], passWithNoTests: false }
});
