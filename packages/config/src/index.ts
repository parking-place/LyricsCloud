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
  readonly secureCookies: boolean;
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
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return {
    runtime: runtime as RuntimeName,
    databaseUrl: env.DATABASE_URL!,
    appVersion: env.APP_VERSION ?? "0.6.0",
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
  if (origin && !["http:", "https:"].includes(origin.protocol)) invalid.push("APP_ORIGIN");
  if (origin && (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password)) invalid.push("APP_ORIGIN");
  if (origin && runtime === "production" && origin.protocol !== "https:" && !localTestFixture) invalid.push("APP_ORIGIN");
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
  const allowedEmails = parseAllowedEmails(allowedEmailSource);
  if (allowedEmailSource.length > 65_536 || allowedEmails.size === 0
    || [...allowedEmails].some((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) invalid.push(allowedEmailKey);
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return {
    appOrigin: origin!.origin,
    issuer: issuer!.href,
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    sessionSecret: env.SESSION_SECRET!,
    allowedEmails,
    secureCookies: origin!.protocol === "https:"
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
