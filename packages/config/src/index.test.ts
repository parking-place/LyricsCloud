import { describe, expect, it } from "vitest";
import { ConfigError, readRuntimeConfig } from "./index.js";

describe("runtime configuration", () => {
  it("accepts a PostgreSQL URL", () => {
    expect(readRuntimeConfig({ NODE_ENV: "test", DATABASE_URL: "postgresql://user:secret@db/app" }).runtime).toBe("test");
  });
  it("reports key names without their values", () => {
    const secret = "never-print-this";
    expect(() => readRuntimeConfig({ NODE_ENV: "invalid", DATABASE_URL: secret })).toThrow(ConfigError);
    try { readRuntimeConfig({ NODE_ENV: "invalid", DATABASE_URL: secret }); } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).toContain("NODE_ENV");
      expect(String(error)).toContain("DATABASE_URL");
    }
  });
});
