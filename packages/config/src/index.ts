export type RuntimeName = "development" | "test" | "production";
export interface RuntimeConfig {
  readonly runtime: RuntimeName;
  readonly databaseUrl: string;
  readonly appVersion: string;
  readonly buildId: string;
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
    appVersion: env.APP_VERSION ?? "0.1.0",
    buildId: env.BUILD_ID ?? "local"
  };
}

function isSafeIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._-]+$/.test(value);
}
