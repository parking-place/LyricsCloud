export type RuntimeName = "development" | "test" | "production";
export interface RuntimeConfig { readonly runtime: RuntimeName; readonly databaseUrl: string; }

export class ConfigError extends Error {
  readonly code = "CONFIG_INVALID";
  constructor(readonly keys: readonly string[]) { super(`Invalid configuration keys: ${keys.join(", ")}`); }
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const invalid = [];
  const runtime = env.NODE_ENV;
  if (runtime !== "development" && runtime !== "test" && runtime !== "production") invalid.push("NODE_ENV");
  try {
    const database = new URL(env.DATABASE_URL ?? "");
    if (database.protocol !== "postgres:" && database.protocol !== "postgresql:") invalid.push("DATABASE_URL");
  } catch { invalid.push("DATABASE_URL"); }
  if (invalid.length) throw new ConfigError([...new Set(invalid)]);
  return { runtime: runtime as RuntimeName, databaseUrl: env.DATABASE_URL! };
}
