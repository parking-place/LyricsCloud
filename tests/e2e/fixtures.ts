import { createHash } from "node:crypto";
import { Pool } from "pg";

export const fixtureUsers = {
  alice: {
    id: "00000000-0000-4000-8000-0000000000a1",
    subject: "e2e-alice",
    email: "alice@example.invalid",
    displayName: "앨리스 테스트"
  },
  bob: {
    id: "00000000-0000-4000-8000-0000000000b2",
    subject: "e2e-bob",
    email: "bob@example.invalid",
    displayName: "밥 테스트"
  },
  visual: {
    id: "00000000-0000-4000-8000-0000000000c3",
    subject: "e2e-visual",
    email: "visual@example.invalid",
    displayName: "테스트 사용자"
  }
} as const;

export const fixtureTokens = {
  alice: "e2e-alice-session-token-not-a-secret",
  bob: "e2e-bob-session-token-not-a-secret",
  visual: "e2e-visual-session-token-not-a-secret"
} as const;

export function e2eDatabaseUrl(): string | undefined {
  return process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export async function withE2eDatabase<T>(work: (pool: Pool) => Promise<T>): Promise<T> {
  const databaseUrl = e2eDatabaseUrl();
  if (!databaseUrl) throw new Error("E2E_DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 2_000 });
  try { return await work(pool); } finally { await pool.end(); }
}
