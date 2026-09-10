import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateEnvironment } from "./check-environment.mjs";

const schema = JSON.parse(await readFile(new URL("../config/environment-schema.1.0.7.json", import.meta.url), "utf8"));
const common = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:secret@db/app",
  APP_VERSION: "1.0.7",
  BUILD_ID: "a".repeat(40),
  APP_CHANNEL: "release"
};

assert(validateEnvironment("web", {
  ...common,
  APP_ORIGIN: "https://lyrics.example",
  GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret",
  SESSION_SECRET: "s".repeat(32),
  AUTH_ALLOWED_EMAILS_FILE: "/run/secrets/allowed",
  AUTH_ALLOWLIST_FORMAT: "hmac-v1",
  AUTH_ALLOWLIST_ENVIRONMENT: "release",
  AUTH_ALLOWLIST_HMAC_KEYRING_FILE: "/run/secrets/allowlist-keyring",
  BETA_ENVIRONMENT: "release",
  BETA_CODE_INDEX_KID: "release-v1",
  BETA_CODE_INDEX_KEY_FILE: "/run/secrets/beta-index",
  COLLABORATION_INTERNAL_URL: "http://collaboration:3001"
}));
assert(validateEnvironment("collaboration", { ...common, APP_ORIGIN: "https://lyrics.example", COLLABORATION_PORT: "3001" }));
assert(validateEnvironment("worker", { ...common, WORKER_HEALTH_PORT: "3002" }));
assert(validateEnvironment("migrate", common));
assert(validateEnvironment("admin", {
  ...common,
  BETA_ENVIRONMENT: "release",
  BETA_CODE_INDEX_KID: "release-v1",
  BETA_CODE_INDEX_KEY_FILE: "/run/secrets/beta-index",
  BETA_CODE_AEAD_KEY_FILE: "/run/secrets/beta-aead",
  BETA_CODE_TTL_HOURS: "24"
}));
assert(validateEnvironment("backup", {
  NODE_ENV: "production", APP_VERSION: "1.0.7", BUILD_ID: "a".repeat(40), APP_CHANNEL: "release",
  BACKUP_STORAGE_ID: "external-1", BACKUP_REPOSITORY_DIR: "/backup/repository",
  PGPASSWORD_FILE: "/run/secrets/postgres", AGE_RECIPIENT_FILE: "/run/secrets/age"
}));
assert.throws(() => validateEnvironment("web", { ...common, APP_PHASE: "p9" }), /Invalid environment keys/);
for (const name of ["DATABASE_URL", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"]) assert.equal(schema.properties[name]["x-secret"], true);
for (const name of ["AUTH_ALLOWED_EMAILS_FILE", "AUTH_ALLOWLIST_HMAC_KEYRING_FILE", "BETA_CODE_INDEX_KEY_FILE", "BETA_CODE_AEAD_KEY_FILE"]) {
  assert.equal(schema.properties[name]["x-secret-file"], true);
}

console.log("1.0.7 release environment: 6 service contracts and secret-file boundaries PASS");
