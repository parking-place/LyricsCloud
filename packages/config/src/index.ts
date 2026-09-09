import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

export type RuntimeName = "development" | "test" | "production";
export interface RuntimeConfig {
  readonly runtime: RuntimeName;
  readonly databaseUrl: string;
  readonly appVersion: string;
  readonly buildId: string;
}

export interface AuthConfig {
  readonly appOrigin: string;
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly sessionSecret: string;
  readonly allowedEmails: ReadonlySet<string>;
  readonly allowlistFingerprint?: string;
  readonly secureCookies: boolean;
}

export type AllowlistEnvironment = "development" | "release" | "test";
export const AUTH_ALLOWLIST_PURPOSE = "auth-bootstrap";
export const AUTH_EMAIL_NORMALIZATION_VERSION = "nfkc-trim-lower-v1";

export interface HmacAllowlistRecord {
  readonly formatVersion: 1;
  readonly environment: AllowlistEnvironment;
  readonly purpose: typeof AUTH_ALLOWLIST_PURPOSE;
  readonly normalizationVersion: typeof AUTH_EMAIL_NORMALIZATION_VERSION;
  readonly kid: string;
  readonly digest: string;
  readonly state: "active" | "revoked";
}

export interface HmacAllowlistKey {
  readonly kid: string;
  readonly key: string;
  readonly notAfter?: string;
}

export interface HmacAllowlistKeyring {
  readonly formatVersion: 1;
  readonly activeKid: string;
  readonly keys: readonly HmacAllowlistKey[];
}

export interface BetaSignupConfig {
  readonly environment: AllowlistEnvironment;
  readonly indexKid: string;
  readonly indexKey: Buffer;
  readonly fingerprint: string;
}

export class ConfigError extends Error {
  readonly code = "CONFIG_INVALID";
  constructor(readonly keys: readonly string[]) { super(`Invalid configuration keys: ${keys.join(", ")}`); }
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const invalid: string[] = [];
  const runtime = env.NODE_ENV;
  if (runtime !== "development" && runtime !== "test" && runtime !== "production") invalid.push("NODE_ENV");
  try {
    const database = new URL(env.DATABASE_URL ?? "");
    if (database.protocol !== "postgres:" && database.protocol !== "postgresql:") invalid.push("DATABASE_URL");
  } catch { invalid.push("DATABASE_URL"); }
  if (env.APP_VERSION !== undefined && !isSafeIdentifier(env.APP_VERSION)) invalid.push("APP_VERSION");
  if (env.BUILD_ID !== undefined && !isSafeIdentifier(env.BUILD_ID)) invalid.push("BUILD_ID");
  if (runtime === "production" && env.APP_VERSION !== "1.0.0") invalid.push("APP_VERSION");
  if (runtime === "production" && !/^[0-9a-f]{40}$/.test(env.BUILD_ID ?? "")) invalid.push("BUILD_ID");
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return {
    runtime: runtime as RuntimeName,
    databaseUrl: env.DATABASE_URL!,
    appVersion: env.APP_VERSION ?? "1.0.0",
    buildId: env.BUILD_ID ?? "local"
  };
}

function isSafeIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._-]+$/.test(value);
}

export function readAuthConfig(
  env: NodeJS.ProcessEnv,
  readTextFile: (path: string) => string = (path) => readFileSync(path, "utf8")
): AuthConfig {
  const runtime = env.NODE_ENV;
  const invalid: string[] = [];
  let origin: URL | undefined;
  let issuer: URL | undefined;
  try { origin = new URL(env.APP_ORIGIN ?? ""); } catch { invalid.push("APP_ORIGIN"); }
  try { issuer = new URL(env.GOOGLE_ISSUER ?? "https://accounts.google.com"); } catch { invalid.push("GOOGLE_ISSUER"); }
  const localTestFixture = env.OIDC_TEST_FIXTURE === "true"
    && isLoopback(origin) && isLoopback(issuer);
  // Explicit PC-only opt-in for an existing localhost Google OAuth client.
  // Public/LAN origins and alternate issuers retain the production requirements.
  const localHttpOAuth = env.LOCAL_HTTP_OAUTH === "true" && isLoopback(origin);
  if (env.LOCAL_HTTP_OAUTH === "true" && !localHttpOAuth) invalid.push("LOCAL_HTTP_OAUTH");
  if (origin && !["http:", "https:"].includes(origin.protocol)) invalid.push("APP_ORIGIN");
  if (origin && (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password)) invalid.push("APP_ORIGIN");
  if (origin && runtime === "production" && origin.protocol !== "https:" && !localTestFixture && !localHttpOAuth) invalid.push("APP_ORIGIN");
  if (issuer && runtime !== "test" && issuer.href !== "https://accounts.google.com/" && !localTestFixture) invalid.push("GOOGLE_ISSUER");
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.startsWith("CHANGE_ME")) invalid.push("GOOGLE_CLIENT_ID");
  if (runtime === "production" && !env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") && !localTestFixture) invalid.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET.startsWith("CHANGE_ME")) invalid.push("GOOGLE_CLIENT_SECRET");
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || env.SESSION_SECRET.startsWith("CHANGE_ME")) invalid.push("SESSION_SECRET");
  const allowedEmailFile = env.AUTH_ALLOWED_EMAILS_FILE?.trim();
  const allowedEmailKey = allowedEmailFile ? "AUTH_ALLOWED_EMAILS_FILE" : "AUTH_ALLOWED_EMAILS";
  let allowedEmailSource = env.AUTH_ALLOWED_EMAILS ?? "";
  if (allowedEmailFile) {
    try { allowedEmailSource = readTextFile(allowedEmailFile); }
    catch { invalid.push(allowedEmailKey); allowedEmailSource = ""; }
  }
  const allowlistFormat = env.AUTH_ALLOWLIST_FORMAT ?? "legacy-plaintext";
  let allowedEmails: ReadonlySet<string> = new Set();
  let allowlistFingerprint = "invalid";
  if (allowlistFormat === "legacy-plaintext") {
    const legacy = parseAllowedEmails(allowedEmailSource);
    allowedEmails = legacy;
    allowlistFingerprint = fingerprint(allowedEmailSource);
    if (allowedEmailSource.length > 65_536 || legacy.size === 0
      || [...legacy].some((email) => !isEmailShape(email))) invalid.push(allowedEmailKey);
  } else if (allowlistFormat === "hmac-v1") {
    const environment = env.AUTH_ALLOWLIST_ENVIRONMENT;
    const keyringFile = env.AUTH_ALLOWLIST_HMAC_KEYRING_FILE?.trim();
    if (!isAllowlistEnvironment(environment)) invalid.push("AUTH_ALLOWLIST_ENVIRONMENT");
    if (!keyringFile) invalid.push("AUTH_ALLOWLIST_HMAC_KEYRING_FILE");
    if (isAllowlistEnvironment(environment) && keyringFile) {
      try {
        const keyringSource = readTextFile(keyringFile);
        const records = parseHmacAllowlistRecords(allowedEmailSource, environment);
        const keyring = parseHmacAllowlistKeyring(keyringSource);
        allowedEmails = new HmacEmailAllowlist(records, keyring, environment);
        allowlistFingerprint = fingerprint(`${allowedEmailSource}\u0000${keyringSource}\u0000${environment}`);
        if (allowedEmailSource.length > 1_048_576 || allowedEmails.size === 0) invalid.push(allowedEmailKey);
      } catch {
        invalid.push(allowedEmailKey, "AUTH_ALLOWLIST_HMAC_KEYRING_FILE");
      }
    }
  } else {
    invalid.push("AUTH_ALLOWLIST_FORMAT");
  }
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return {
    appOrigin: origin!.origin,
    issuer: issuer!.href,
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    sessionSecret: env.SESSION_SECRET!,
    allowedEmails,
    allowlistFingerprint,
    secureCookies: origin!.protocol === "https:"
  };
}

export function readBetaSignupConfig(
  env: NodeJS.ProcessEnv,
  readTextFile: (path: string) => string = (path) => readFileSync(path, "utf8")
): BetaSignupConfig {
  const invalid: string[] = [];
  const environment = env.BETA_ENVIRONMENT;
  const indexKid = env.BETA_CODE_INDEX_KID;
  const indexKeyFile = env.BETA_CODE_INDEX_KEY_FILE?.trim();
  if (!isAllowlistEnvironment(environment)) invalid.push("BETA_ENVIRONMENT");
  if (!safeKid(indexKid)) invalid.push("BETA_CODE_INDEX_KID");
  if (!indexKeyFile) invalid.push("BETA_CODE_INDEX_KEY_FILE");
  let indexKey = Buffer.alloc(0);
  if (indexKeyFile) {
    try {
      const source = readTextFile(indexKeyFile).trim();
      if (!/^[A-Za-z0-9_-]{43}$/u.test(source)) throw new Error();
      indexKey = Buffer.from(source, "base64url");
      if (indexKey.length !== 32) throw new Error();
    } catch {
      invalid.push("BETA_CODE_INDEX_KEY_FILE");
    }
  }
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return {
    environment: environment as AllowlistEnvironment,
    indexKid: indexKid!,
    indexKey,
    fingerprint: fingerprint(`${environment}\u0000${indexKid}\u0000${indexKey.toString("base64url")}`)
  };
}

function isLoopback(url: URL | undefined): boolean {
  return Boolean(url && url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
}

export function normalizeEmail(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase();
}

function parseAllowedEmails(source: string): Set<string> {
  const entries = source.split(/\r?\n/u).flatMap((line) => {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith("#") ? [] : trimmed.split(",");
  });
  return new Set(entries.map(normalizeEmail).filter(Boolean));
}

export function hmacAllowlistDigest(normalizedEmail: string, environment: AllowlistEnvironment, key: Buffer): string {
  if (key.length !== 32) throw new Error("AUTH_ALLOWLIST_KEY_INVALID");
  const email = normalizeEmail(normalizedEmail);
  if (!isEmailShape(email)) throw new Error("AUTH_ALLOWLIST_EMAIL_INVALID");
  return createHmac("sha256", key)
    .update(`lyricscloud|${AUTH_ALLOWLIST_PURPOSE}|v1|${environment}|${AUTH_EMAIL_NORMALIZATION_VERSION}|${email}`, "utf8")
    .digest("hex");
}

export function parseHmacAllowlistRecords(source: string, environment: AllowlistEnvironment): HmacAllowlistRecord[] {
  const records = source.split(/\r?\n/u).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const value: unknown = JSON.parse(trimmed);
    if (!isHmacAllowlistRecord(value) || value.environment !== environment) throw new Error("AUTH_ALLOWLIST_RECORD_INVALID");
    return [value];
  });
  const identities = new Set<string>();
  for (const record of records) {
    const identity = `${record.environment}\u0000${record.kid}\u0000${record.digest}`;
    if (identities.has(identity)) throw new Error("AUTH_ALLOWLIST_RECORD_DUPLICATE");
    identities.add(identity);
  }
  return records;
}

export function parseHmacAllowlistKeyring(source: string): HmacAllowlistKeyring {
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== "object") throw new Error("AUTH_ALLOWLIST_KEYRING_INVALID");
  const candidate = value as Partial<HmacAllowlistKeyring>;
  if (candidate.formatVersion !== 1 || !safeKid(candidate.activeKid) || !Array.isArray(candidate.keys)
    || candidate.keys.length < 1 || candidate.keys.length > 8) throw new Error("AUTH_ALLOWLIST_KEYRING_INVALID");
  const kids = new Set<string>();
  for (const key of candidate.keys) {
    if (!key || typeof key !== "object" || !safeKid(key.kid) || kids.has(key.kid)
      || typeof key.key !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(key.key)
      || Buffer.from(key.key, "base64url").length !== 32
      || (key.notAfter !== undefined && !validFutureOrPastTimestamp(key.notAfter))) {
      throw new Error("AUTH_ALLOWLIST_KEYRING_INVALID");
    }
    kids.add(key.kid);
  }
  const active = candidate.keys.find((key) => key.kid === candidate.activeKid);
  if (!active || active.notAfter !== undefined) throw new Error("AUTH_ALLOWLIST_KEYRING_INVALID");
  return candidate as HmacAllowlistKeyring;
}

class HmacEmailAllowlist implements ReadonlySet<string> {
  readonly #records: readonly HmacAllowlistRecord[];
  readonly #keys: ReadonlyMap<string, { key: Buffer; notAfter?: number }>;
  readonly #environment: AllowlistEnvironment;

  constructor(records: readonly HmacAllowlistRecord[], keyring: HmacAllowlistKeyring, environment: AllowlistEnvironment) {
    this.#records = records;
    this.#environment = environment;
    this.#keys = new Map(keyring.keys.map((entry) => [entry.kid, {
      key: Buffer.from(entry.key, "base64url"),
      ...(entry.notAfter ? { notAfter: Date.parse(entry.notAfter) } : {})
    }]));
    for (const record of records) if (!this.#keys.has(record.kid)) throw new Error("AUTH_ALLOWLIST_KID_MISSING");
  }

  get size(): number {
    const now = Date.now();
    return this.#records.filter((record) => {
      const key = this.#keys.get(record.kid);
      return record.state === "active" && key && (key.notAfter === undefined || key.notAfter > now);
    }).length;
  }

  has(value: string): boolean {
    const normalized = normalizeEmail(value);
    if (!isEmailShape(normalized)) return false;
    const now = Date.now();
    return this.#records.some((record) => {
      if (record.state !== "active") return false;
      const key = this.#keys.get(record.kid);
      if (!key || (key.notAfter !== undefined && key.notAfter <= now)) return false;
      const candidate = hmacAllowlistDigest(normalized, this.#environment, key.key);
      return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(record.digest, "hex"));
    });
  }

  *values(): SetIterator<string> {
    for (const record of this.#records) if (record.state === "active") yield `hmac:${record.kid}:${record.digest}`;
  }
  keys(): SetIterator<string> { return this.values(); }
  *entries(): SetIterator<[string, string]> { for (const value of this.values()) yield [value, value]; }
  [Symbol.iterator](): SetIterator<string> { return this.values(); }
  forEach(callbackfn: (value: string, value2: string, set: ReadonlySet<string>) => void, thisArg?: unknown): void {
    for (const value of this.values()) callbackfn.call(thisArg, value, value, this);
  }
}

function isHmacAllowlistRecord(value: unknown): value is HmacAllowlistRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<HmacAllowlistRecord>;
  return record.formatVersion === 1 && isAllowlistEnvironment(record.environment)
    && record.purpose === AUTH_ALLOWLIST_PURPOSE
    && record.normalizationVersion === AUTH_EMAIL_NORMALIZATION_VERSION
    && safeKid(record.kid) && typeof record.digest === "string" && /^[0-9a-f]{64}$/u.test(record.digest)
    && (record.state === "active" || record.state === "revoked");
}

function isAllowlistEnvironment(value: unknown): value is AllowlistEnvironment {
  return value === "development" || value === "release" || value === "test";
}

function safeKid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/u.test(value);
}

function validFutureOrPastTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
    && Number.isFinite(Date.parse(value));
}

function isEmailShape(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value);
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
