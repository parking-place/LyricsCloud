import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { PostgresNativeAuthStore } from "./native-auth.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const store = enabled ? new PostgresNativeAuthStore(databaseUrl) : null;
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const createdUsers: string[] = [];

describe.runIf(enabled)("PostgreSQL native read auth store", () => {
  it("atomically exchanges one authorized PKCE grant into one read session", async () => {
    if (!store || !pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const owner = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
    createdUsers.push(owner);
    const now = new Date();
    const input = {
      transactionHash: `transaction-${randomUUID()}`,
      stateHash: `state-${randomUUID()}`,
      pkceChallenge: "c".repeat(43),
      redirectUriHash: `redirect-${randomUUID()}`,
      expiresAt: new Date(now.getTime() + 600_000),
      now
    };
    await store.registerNativeTransaction(input);
    expect((await pool.query("select count(*)::int count from native_sessions where user_id=$1", [owner])).rows[0].count).toBe(0);
    const codeHash = `code-${randomUUID()}`;
    expect(await store.authorizeNativeTransaction({ transactionHash: input.transactionHash, userId: owner,
      codeHash, codeExpiresAt: new Date(now.getTime() + 60_000), now })).toBe(true);
    expect(await store.authorizeNativeTransaction({ transactionHash: input.transactionHash, userId: owner,
      codeHash: `other-${randomUUID()}`, codeExpiresAt: new Date(now.getTime() + 60_000), now })).toBe(false);

    const exchange = { transactionHash: input.transactionHash, stateHash: input.stateHash,
      pkceChallenge: input.pkceChallenge, redirectUriHash: input.redirectUriHash, codeHash,
      sessionTokenHash: `session-${randomUUID()}`, sessionExpiresAt: new Date(now.getTime() + 86_400_000),
      sessionAbsoluteExpiresAt: new Date(now.getTime() + 172_800_000), now };
    expect(await store.exchangeNativeTransaction({ ...exchange, pkceChallenge: "x".repeat(43) })).toBeNull();
    expect(await store.exchangeNativeTransaction(exchange)).toBe(owner);
    expect(await store.exchangeNativeTransaction({ ...exchange, sessionTokenHash: `replay-${randomUUID()}` })).toBeNull();
    expect(await store.readNativeSession(exchange.sessionTokenHash, now)).toMatchObject({ userId: owner });
    expect((await pool.query("select scope from native_sessions where token_hash=$1", [exchange.sessionTokenHash])).rows[0].scope)
      .toBe("read");
    await store.revokeNativeSession(exchange.sessionTokenHash, now);
    expect(await store.readNativeSession(exchange.sessionTokenHash, now)).toBeNull();
  });

  it("keeps grant and session tables inaccessible to the application RLS role", async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const permissions = await pool.query<{ transaction_select: boolean; session_select: boolean }>(`select
      has_table_privilege('lyricscloud_app','native_auth_transactions','select') transaction_select,
      has_table_privilege('lyricscloud_app','native_sessions','select') session_select`);
    expect(permissions.rows[0]).toEqual({ transaction_select: false, session_select: false });
  });
});

afterAll(async () => {
  if (pool && createdUsers.length) await pool.query("delete from app_users where id = any($1::uuid[])", [createdUsers]);
  await store?.close();
  await pool?.end();
});
