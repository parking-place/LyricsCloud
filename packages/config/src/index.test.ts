import { describe, expect, it } from "vitest";
import { ConfigError, readRuntimeConfig } from "./index.js";

describe("runtime configuration", () => {
  it("accepts a PostgreSQL URL", () => {
    const config = readRuntimeConfig({ NODE_ENV: "test", DATABASE_URL: "postgresql://user:secret@db/app" });
    expect(config).toMatchObject({ runtime: "test", appVersion: "0.1.0", buildId: "local" });
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
  it("rejects unsafe build identifiers without echoing them", () => {
    const unsafe = "build id with spaces and a secret";
    expect(() => readRuntimeConfig({ NODE_ENV: "test", DATABASE_URL: "postgresql://user:test@db/app", BUILD_ID: unsafe }))
      .toThrow("Invalid configuration keys: BUILD_ID");
  });
});
