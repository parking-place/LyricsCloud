import { describe, expect, it } from "vitest";
import { ConfigError, hmacAllowlistDigest, readAuthConfig, readBetaSignupConfig, readRuntimeConfig } from "./index.js";

describe("runtime configuration", () => {
  it("accepts a PostgreSQL URL", () => {
    const config = readRuntimeConfig({ NODE_ENV: "test", DATABASE_URL: "postgresql://user:secret@db/app" });
    expect(config).toMatchObject({ runtime: "test", appVersion: "1.0.4", buildId: "local", appChannel: "release", appPhase: null });
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

  it("requires the sealed version and source SHA in production", () => {
    const base = { NODE_ENV: "production", DATABASE_URL: "postgresql://user:test@db/app" };
    expect(() => readRuntimeConfig(base)).toThrow("Invalid configuration keys: APP_VERSION, BUILD_ID");
    expect(() => readRuntimeConfig({ ...base, APP_VERSION: "1.0.0", BUILD_ID: "a".repeat(40) })).toThrow("APP_VERSION");
    expect(readRuntimeConfig({ ...base, APP_VERSION: "1.0.4", BUILD_ID: "a".repeat(40) }).buildId).toBe("a".repeat(40));
  });

  it("validates explicit release channels and development phase labels", () => {
    const base = { NODE_ENV: "test", DATABASE_URL: "postgresql://user:test@db/app", APP_VERSION: "1.0.4" };
    expect(readRuntimeConfig({ ...base, APP_CHANNEL: "dev", APP_PHASE: "p7" }))
      .toMatchObject({ appChannel: "dev", appPhase: "p7" });
    expect(() => readRuntimeConfig({ ...base, APP_CHANNEL: "preview" })).toThrow("APP_CHANNEL");
    expect(() => readRuntimeConfig({ ...base, APP_CHANNEL: "dev", APP_PHASE: "phase-7" })).toThrow("APP_PHASE");
    expect(() => readRuntimeConfig({ ...base, APP_CHANNEL: "release", APP_PHASE: "p7" })).toThrow("APP_PHASE");
  });
});

describe("auth configuration", () => {
  const syntheticHmacKey = () => Buffer.from(Array.from({ length: 32 }, (_, index) => index)).toString("base64url");
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

  it("matches environment-bound HMAC records across a bounded old/new key rotation", () => {
    const oldKey = syntheticHmacKey();
    const newKey = Buffer.alloc(32, 9).toString("base64url");
    const record = JSON.stringify({ formatVersion: 1, environment: "development", purpose: "auth-bootstrap",
      normalizationVersion: "nfkc-trim-lower-v1", kid: "old-kid",
      digest: "130c6d19a930ce952d2c36f2bc2526585f8d3eb33ad55893c20a74cd82d107cc", state: "active" });
    const keyring = JSON.stringify({ formatVersion: 1, activeKid: "new-kid", keys: [
      { kid: "old-kid", key: oldKey, notAfter: "2099-01-01T00:00:00.000Z" },
      { kid: "new-kid", key: newKey }
    ] });
    const config = readAuthConfig({ ...valid, AUTH_ALLOWED_EMAILS_FILE: "/run/secrets/auth_allowed_emails",
      AUTH_ALLOWLIST_FORMAT: "hmac-v1", AUTH_ALLOWLIST_ENVIRONMENT: "development",
      AUTH_ALLOWLIST_HMAC_KEYRING_FILE: "/run/secrets/auth_allowlist_hmac_keyring" },
    (path) => path.endsWith("keyring") ? keyring : `${record}\n`);
    expect(config.allowedEmails.has(" User@Example.com ")).toBe(true);
    expect(config.allowedEmails.has("user+other@example.com")).toBe(false);
    expect(hmacAllowlistDigest("user@example.com", "development", Buffer.from(oldKey, "base64url")))
      .toBe("130c6d19a930ce952d2c36f2bc2526585f8d3eb33ad55893c20a74cd82d107cc");
    expect(hmacAllowlistDigest("user@example.com", "release", Buffer.from(oldKey, "base64url")))
      .not.toBe(hmacAllowlistDigest("user@example.com", "development", Buffer.from(oldKey, "base64url")));
  });

  it("fails closed for cross-environment records, missing kids, and expired rotation keys", () => {
    const key = syntheticHmacKey();
    const baseRecord = { formatVersion: 1, environment: "development", purpose: "auth-bootstrap",
      normalizationVersion: "nfkc-trim-lower-v1", kid: "old-kid",
      digest: "130c6d19a930ce952d2c36f2bc2526585f8d3eb33ad55893c20a74cd82d107cc", state: "active" };
    const env = { ...valid, AUTH_ALLOWED_EMAILS_FILE: "/allowlist", AUTH_ALLOWLIST_FORMAT: "hmac-v1",
      AUTH_ALLOWLIST_ENVIRONMENT: "development", AUTH_ALLOWLIST_HMAC_KEYRING_FILE: "/keyring" };
    const expired = JSON.stringify({ formatVersion: 1, activeKid: "new-kid",
      keys: [{ kid: "old-kid", key, notAfter: "2000-01-01T00:00:00.000Z" },
        { kid: "new-kid", key: Buffer.alloc(32, 9).toString("base64url") }] });
    expect(() => readAuthConfig(env, (path) => path === "/keyring" ? expired : JSON.stringify(baseRecord)))
      .toThrow("AUTH_ALLOWED_EMAILS_FILE");
    expect(() => readAuthConfig(env, (path) => path === "/keyring"
      ? JSON.stringify({ formatVersion: 1, activeKid: "new-kid", keys: [{ kid: "new-kid", key }] })
      : JSON.stringify(baseRecord))).toThrow("AUTH_ALLOWED_EMAILS_FILE");
    expect(() => readAuthConfig(env, (path) => path === "/keyring" ? expired
      : JSON.stringify({ ...baseRecord, environment: "release" }))).toThrow("AUTH_ALLOWED_EMAILS_FILE");
    expect(() => readAuthConfig(env, (path) => path === "/keyring" ? expired
      : JSON.stringify({ ...baseRecord, state: "revoked" }))).toThrow("AUTH_ALLOWED_EMAILS_FILE");
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

  it("permits real Google OAuth on loopback HTTP only with an explicit local opt-in", () => {
    const local = { ...valid, NODE_ENV: "production", GOOGLE_ISSUER: "https://accounts.google.com", LOCAL_HTTP_OAUTH: "true" };
    expect(readAuthConfig(local)).toMatchObject({ appOrigin: "http://localhost:8080", secureCookies: false, issuer: "https://accounts.google.com/" });
    expect(() => readAuthConfig({ ...local, LOCAL_HTTP_OAUTH: "false" })).toThrow("APP_ORIGIN");
    expect(() => readAuthConfig({ ...local, APP_ORIGIN: "http://192.168.1.2:8080" })).toThrow("LOCAL_HTTP_OAUTH");
    expect(() => readAuthConfig({ ...local, APP_ORIGIN: "http://localhost.example:8080" })).toThrow("LOCAL_HTTP_OAUTH");
    expect(() => readAuthConfig({ ...local, GOOGLE_ISSUER: "http://127.0.0.1:3100" })).toThrow("GOOGLE_ISSUER");
  });

  it("allows a production-build OIDC fixture only when both endpoints are loopback", () => {
    const fixture = readAuthConfig({
      ...valid,
      NODE_ENV: "production",
      OIDC_TEST_FIXTURE: "true",
      APP_ORIGIN: "http://127.0.0.1:3000",
      GOOGLE_ISSUER: "http://127.0.0.1:3100",
      GOOGLE_CLIENT_ID: "synthetic-e2e-client"
    });
    expect(fixture).toMatchObject({ secureCookies: false, issuer: "http://127.0.0.1:3100/" });
    expect(() => readAuthConfig({
      ...valid,
      NODE_ENV: "production",
      OIDC_TEST_FIXTURE: "true",
      APP_ORIGIN: "http://dev.example.com",
      GOOGLE_ISSUER: "http://oidc.example.com",
      GOOGLE_CLIENT_ID: "synthetic-e2e-client"
    })).toThrow(ConfigError);
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

describe("beta signup configuration", () => {
  it("loads only an environment-bound web verification key", () => {
    const key = Buffer.alloc(32, 5).toString("base64url");
    const config = readBetaSignupConfig({ BETA_ENVIRONMENT: "development", BETA_CODE_INDEX_KID: "dev-2026-09",
      BETA_CODE_INDEX_KEY_FILE: "/run/secrets/beta_code_index_key" }, () => `${key}\n`);
    expect(config).toMatchObject({ environment: "development", indexKid: "dev-2026-09" });
    expect(config.indexKey).toEqual(Buffer.alloc(32, 5));
  });

  it("fails closed without echoing a secret path or malformed key", () => {
    const path = "/private/never-print-beta-key";
    try {
      readBetaSignupConfig({ BETA_ENVIRONMENT: "release", BETA_CODE_INDEX_KID: "release-kid",
        BETA_CODE_INDEX_KEY_FILE: path }, () => "wrong");
      throw new Error("expected failure");
    } catch (error) {
      expect(String(error)).toContain("BETA_CODE_INDEX_KEY_FILE");
      expect(String(error)).not.toContain(path);
    }
  });
});
