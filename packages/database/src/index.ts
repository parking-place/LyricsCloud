import { createDatabasePool } from "./pool.js";

export const CURRENT_SCHEMA_VERSION = "0500_prompts.sql";

export * from "./auth.js";
export * from "./owned.js";
export * from "./schema.js";
export * from "./songs.js";
export * from "./lyrics.js";
export * from "./rhymes.js";
export * from "./prompts.js";
export * from "./pool.js";

export type DatabaseHealthCode =
  | "DATABASE_AUTH_FAILED"
  | "DATABASE_TIMEOUT"
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_SCHEMA_OUTDATED"
  | "DATABASE_QUERY_FAILED";

export class DatabaseHealthError extends Error {
  constructor(readonly code: DatabaseHealthCode) {
    super(code);
    this.name = "DatabaseHealthError";
  }
}

export interface DatabaseHealth {
  readonly status: "ok";
  readonly schemaVersion: string;
}

export async function checkDatabase(databaseUrl: string): Promise<DatabaseHealth> {
  const pool = createDatabasePool(databaseUrl, 1);
  try {
    await pool.query("select 1");
    const result = await pool.query<{ applied: boolean }>(
      "select exists(select 1 from schema_migrations where name = $1) as applied",
      [CURRENT_SCHEMA_VERSION]
    );
    if (!result.rows[0]?.applied) throw new DatabaseHealthError("DATABASE_SCHEMA_OUTDATED");
    return { status: "ok", schemaVersion: CURRENT_SCHEMA_VERSION };
  } catch (error) {
    if (error instanceof DatabaseHealthError) throw error;
    throw new DatabaseHealthError(classifyDatabaseError(error));
  } finally {
    await pool.end();
  }
}

export function classifyDatabaseError(error: unknown): DatabaseHealthCode {
  const signatures = errorSignatures(error);
  if (signatures.some((value) => value === "28P01" || value === "28000")) return "DATABASE_AUTH_FAILED";
  if (signatures.some((value) => value === "ETIMEDOUT" || value === "CONNECT_TIMEOUT" || /timeout/i.test(value))) return "DATABASE_TIMEOUT";
  if (signatures.some((value) => ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "57P01", "57P03"].includes(value)
    || /ECONNREFUSED|connection terminated|server closed the connection/i.test(value))) return "DATABASE_UNAVAILABLE";
  if (signatures.some((value) => value === "42P01")) return "DATABASE_SCHEMA_OUTDATED";
  return "DATABASE_QUERY_FAILED";
}

function errorSignatures(error: unknown, depth = 0): string[] {
  if (depth > 2 || typeof error !== "object" || error === null) return [];
  const candidate = error as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown[] };
  return [
    typeof candidate.code === "string" ? candidate.code : "",
    typeof candidate.message === "string" ? candidate.message : "",
    ...errorSignatures(candidate.cause, depth + 1),
    ...(candidate.errors ?? []).flatMap((item) => errorSignatures(item, depth + 1))
  ].filter(Boolean);
}
