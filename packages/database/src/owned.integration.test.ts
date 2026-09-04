import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAuthStore } from "./auth.js";
import { PostgresOwnedDataStore } from "./owned.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const store = enabled ? new PostgresOwnedDataStore(databaseUrl, 1) : null;
const authStore = enabled ? new PostgresAuthStore(databaseUrl) : null;
const users: string[] = [];

describe.runIf(enabled)("owner-scoped PostgreSQL boundary", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("ownership integration requires lyricscloud_test");
    const result = await pool.query<{ id: string }>("insert into app_users default values returning id");
    const second = await pool.query<{ id: string }>("insert into app_users default values returning id");
    users.push(result.rows[0]!.id, second.rows[0]!.id);
  });

  it("uses the authenticated ID even when input contains a forged owner_id", async () => {
    const [alice, bob] = users as [string, string];
    const profile = await store!.saveProfile(alice, {
      displayName: "Synthetic A",
      avatarUrl: null,
      owner_id: bob
    } as Parameters<PostgresOwnedDataStore["saveProfile"]>[1]);
    expect(profile.userId).toBe(alice);
    expect(await store!.getProfile(alice, alice)).toMatchObject({ userId: alice });
  });

  it("hides another user's profile from read, update, and delete", async () => {
    const [alice, bob] = users as [string, string];
    await store!.saveProfile(bob, { displayName: "Synthetic B", avatarUrl: null });
    expect(await store!.getProfile(bob, alice)).toBeNull();
    expect(await store!.updateProfile(bob, alice, { displayName: "Cross account" })).toBeNull();
    expect(await store!.deleteProfile(bob, alice)).toBe(false);
    expect(await store!.getProfile(alice, alice)).toMatchObject({ displayName: "Synthetic A" });
  });

  it("defaults to deny without context and clears pooled connection state", async () => {
    const client = await pool!.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      const result = await client.query<{ count: string }>("select count(*) from user_profiles");
      expect(result.rows[0]?.count).toBe("0");
      await client.query("rollback");
    } finally { client.release(); }

    const [alice, bob] = users as [string, string];
    for (let iteration = 0; iteration < 5; iteration += 1) {
      expect((await store!.getProfile(alice))?.userId).toBe(alice);
      expect((await store!.getProfile(bob))?.userId).toBe(bob);
      expect(await store!.verifyContextCleared()).toBe(true);
    }
  });

  it("denies an inactive user's own profile", async () => {
    const [alice] = users as [string, string];
    const now = new Date();
    await authStore!.createSession("synthetic-session-hash", alice, new Date(now.getTime() + 60_000), new Date(now.getTime() + 120_000), now);
    expect(await authStore!.readSession("synthetic-session-hash", now)).toMatchObject({ userId: alice });
    await pool!.query("update app_users set status = 'blocked' where id = $1", [alice]);
    expect(await authStore!.readSession("synthetic-session-hash", now)).toBeNull();
    expect(await store!.getProfile(alice)).toBeNull();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id = any($1::uuid[])", [users]);
  await store?.close();
  await authStore?.close();
  await pool?.end();
});
