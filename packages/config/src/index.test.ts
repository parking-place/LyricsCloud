import { describe, expect, it } from "vitest";
import { ConfigError, readAuthConfig, readRuntimeConfig } from "./index.js";

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

describe("auth configuration", () => {
  const valid = {
    NODE_ENV: "test",
    APP_ORIGIN: "http://localhost:8080",
    GOOGLE_ISSUER: "http://oidc.test",
    GOOGLE_CLIENT_ID: "client.test.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "synthetic-client-secret",
    SESSION_SECRET: "synthetic-session-secret-at-least-32-bytes",
    AUTH_ALLOWED_EMAILS: " Allowed@Example.com "
  };

  it("normalizes the allowlist and permits a local test issuer", () => {
    const config = readAuthConfig(valid);
    expect(config.allowedEmails.has("allowed@example.com")).toBe(true);
    expect(config.secureCookies).toBe(false);
  });

  it("loads a comment-friendly allowlist file before the legacy environment value", () => {
    const config = readAuthConfig(
      { ...valid, AUTH_ALLOWED_EMAILS: "legacy@example.com", AUTH_ALLOWED_EMAILS_FILE: "/run/secrets/auth_allowed_emails" },
      (path) => {
        expect(path).toBe("/run/secrets/auth_allowed_emails");
        return "# local only\n File.User@Example.com\nsecond@example.com\n";
      }
    );
    expect([...config.allowedEmails]).toEqual(["file.user@example.com", "second@example.com"]);
    expect(config.allowedEmails.has("legacy@example.com")).toBe(false);
  });

  it("fails closed without exposing an unreadable allowlist path", () => {
    const path = "/private/never-print-this";
    expect(() => readAuthConfig(
      { ...valid, AUTH_ALLOWED_EMAILS_FILE: path },
      () => { throw new Error("read failed"); }
    )).toThrow("Invalid configuration keys: AUTH_ALLOWED_EMAILS_FILE");
    try {
      readAuthConfig({ ...valid, AUTH_ALLOWED_EMAILS_FILE: path }, () => { throw new Error("read failed"); });
    } catch (error) {
      expect(String(error)).not.toContain(path);
    }
  });

  it("requires HTTPS and the Google issuer in production", () => {
    expect(() => readAuthConfig({ ...valid, NODE_ENV: "production" })).toThrow(ConfigError);
  });

  it("reports missing secret key names without values", () => {
    expect(() => readAuthConfig({ ...valid, SESSION_SECRET: "too-short", AUTH_ALLOWED_EMAILS: "" }))
      .toThrow("Invalid configuration keys: SESSION_SECRET, AUTH_ALLOWED_EMAILS");
  });

  it("rejects an application origin with a path and non-test issuer overrides", () => {
    expect(() => readAuthConfig({ ...valid, APP_ORIGIN: "http://localhost:8080/auth" })).toThrow("APP_ORIGIN");
    expect(() => readAuthConfig({ ...valid, NODE_ENV: "development" })).toThrow("GOOGLE_ISSUER");
  });
});
