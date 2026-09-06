import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { PostgresAuthStore } from "./auth.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const store = enabled ? new PostgresAuthStore(databaseUrl) : null;
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const createdUsers: string[] = [];

describe.runIf(enabled)("PostgreSQL auth store", () => {
  it("logs out all sessions of the authenticated owner without revoking another owner or a later login", async () => {
    if (!store || !pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires lyricscloud_test");
    const now = new Date();
    const expiry = new Date(now.getTime() + 60_000);
    const owner = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
    const other = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
    createdUsers.push(owner, other);
    const [first, second, foreign, later] = Array.from({ length: 4 }, () => randomUUID());
    await store.createSession(first!, owner, expiry, expiry, now);
    await store.createSession(second!, owner, expiry, expiry, now);
    await store.createSession(foreign!, other, expiry, expiry, now);
    await store.revokeSession(first!, now);
    expect(await store.readSession(first!, now)).toBeNull();
    expect(await store.readSession(second!, now)).toBeNull();
    expect(await store.readSession(foreign!, now)).toMatchObject({ userId: other });
    await store.createSession(later!, owner, expiry, expiry, now);
    await store.revokeSession(first!, now);
    await store.revokeSession("unknown", now);
    expect(await store.readSession(later!, now)).toMatchObject({ userId: owner });
  });

  it("consumes a transaction once and maps repeat login without storing provider credentials", async () => {
    if (!store || !pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("AUTH_DATABASE_INTEGRATION requires lyricscloud_test");
    const suffix = randomUUID();
    const stateHash = `state-${suffix}`;
    const now = new Date();
    await store.registerTransaction(stateHash, new Date(now.getTime() + 60_000));
    expect(await store.consumeTransaction(stateHash, now)).toBe(true);
    expect(await store.consumeTransaction(stateHash, now)).toBe(false);

    const identity = { issuer: "https://accounts.google.com", subject: `subject-${suffix}`, email: `synthetic-${suffix}@example.test`, emailVerified: true };
    const first = await store.upsertIdentity(identity, now);
    const second = await store.upsertIdentity({ ...identity, email: `updated-${suffix}@example.test` }, now);
    createdUsers.push(first);
    expect(second).toBe(first);

    const columns = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name in ('auth_identities', 'oauth_transactions', 'auth_sessions')`
    );
    expect(columns.rows.map((row) => row.column_name)).not.toEqual(expect.arrayContaining(["access_token", "refresh_token", "authorization_code", "id_token"]));
  });
});

afterAll(async () => {
  if (pool && createdUsers.length) await pool.query("delete from app_users where id = any($1::uuid[])", [createdUsers]);
  await store?.close();
  await pool?.end();
});
