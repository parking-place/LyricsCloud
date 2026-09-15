import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAuthStore } from "./auth.js";
import { PostgresOwnedDataStore } from "./owned.js";
import { PostgresExportStore } from "./export.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const url = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: url }) : null;
const auth = enabled ? new PostgresAuthStore(url) : null;
const owned = enabled ? new PostgresOwnedDataStore(url) : null;
const exporter = enabled ? new PostgresExportStore(url) : null;
const users: string[] = [];
let alice = "";
let bob = "";

describe.runIf(enabled)("1.1.7a owner profile customization", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(url)) throw new Error("test database required");
    const old = await pool.query<{ id: string }>("insert into app_users default values returning id");
    alice = old.rows[0]!.id;
    users.push(alice);
    await pool.query(`insert into user_profiles(owner_id,display_name,avatar_url)
      values($1,'Unclassified legacy','https://example.test/legacy.png')`, [alice]);
    await pool.query(`insert into auth_identities(issuer,subject,user_id,email,email_verified,display_name,avatar_url)
      values('https://accounts.google.com',$1,$2,'legacy@example.test',true,'Google old','https://example.test/google-old.png')`,
      [randomUUID(), alice]);
    bob = await auth!.upsertIdentity({ issuer: "https://accounts.google.com", subject: randomUUID(),
      email: "new@example.test", emailVerified: true, displayName: "Google Bob",
      avatarUrl: "https://example.test/bob.png" }, new Date());
    users.push(bob);
  });

  it("does not infer an override or overwrite unclassified legacy values on login", async () => {
    const subject = (await pool!.query<{ subject: string }>(
      "select subject from auth_identities where user_id=$1", [alice])).rows[0]!.subject;
    await auth!.upsertIdentity({ issuer: "https://accounts.google.com", subject,
      email: "legacy@example.test", emailVerified: true, displayName: "Google refreshed",
      avatarUrl: "https://example.test/google-new.png" }, new Date());
    expect(await owned!.getProfile(alice)).toMatchObject({ displayName: "Unclassified legacy",
      avatarUrl: "https://example.test/legacy.png", displayNameSource: "legacy_unclassified",
      avatarSource: "legacy_unclassified" });
  });

  it("changes only the requested field, rejects stale tabs, and resets to latest provider", async () => {
    const before = (await owned!.getProfile(alice))!;
    const changed = await owned!.patchProfile(alice, { expectedRowVersion: before.rowVersion,
      displayName: "  Writer Alice  " });
    expect(changed.state).toBe("saved");
    if (changed.state !== "saved") throw new Error("unexpected result");
    expect(changed.profile).toMatchObject({ displayName: "  Writer Alice  ",
      avatarUrl: "https://example.test/legacy.png", displayNameSource: "override" });
    expect(await sharingDisplayName(alice)).toBe("  Writer Alice  ");
    const stale = await owned!.patchProfile(alice, { expectedRowVersion: before.rowVersion,
      displayName: "Stale writer" });
    expect(stale).toMatchObject({ state: "conflict", profile: { displayName: "  Writer Alice  " } });
    const subject = (await pool!.query<{ subject: string }>(
      "select subject from auth_identities where user_id=$1", [alice])).rows[0]!.subject;
    await auth!.upsertIdentity({ issuer: "https://accounts.google.com", subject,
      email: "legacy@example.test", emailVerified: true, displayName: "Google latest",
      avatarUrl: "https://example.test/google-latest.png" }, new Date());
    expect(await owned!.getProfile(alice)).toMatchObject({ displayName: "  Writer Alice  ",
      avatarUrl: "https://example.test/legacy.png" });
    const reset = await owned!.patchProfile(alice, { expectedRowVersion: changed.profile.rowVersion,
      displayName: null, avatar: null });
    expect(reset).toMatchObject({ state: "saved", profile: { displayName: "Google latest",
      avatarUrl: "https://example.test/google-latest.png", displayNameSource: "provider",
      avatarSource: "provider" } });
    expect(await sharingDisplayName(alice)).toBe("Google latest");
  });

  it("stores only owner WebP bytes and atomically replaces/removes the old photo", async () => {
    const bytes = Buffer.from("RIFFsynthetic-WEBP-binary");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const before = (await owned!.getProfile(alice))!;
    const first = await owned!.replaceAvatarPhoto(alice, before.rowVersion, bytes, hash);
    expect(first.state).toBe("saved");
    if (first.state !== "saved") throw new Error("unexpected result");
    expect(first.profile.avatarUrl).toMatch(/^\/api\/profile\/avatar\?photo=/);
    expect(await owned!.getCurrentAvatarPhoto(alice)).toMatchObject({ bytes, sha256: hash });
    expect(await owned!.getCurrentAvatarPhoto(bob)).toBeNull();
    const denied = await pool!.connect();
    try {
      await denied.query("begin");
      await denied.query("set local role lyricscloud_app");
      await denied.query("select set_config('app.user_id',$1,true)", [bob]);
      expect((await denied.query("select id from profile_avatar_photos where owner_id=$1", [alice])).rowCount).toBe(0);
      await expect(denied.query("insert into profile_avatar_photos(owner_id,webp_bytes,content_sha256) values($1,$2,$3)",
        [alice, bytes, hash])).rejects.toHaveProperty("code", "42501");
      await denied.query("rollback");
    } finally { denied.release(); }
    const replacement = await owned!.replaceAvatarPhoto(alice, first.profile.rowVersion,
      Buffer.from("replacement"), createHash("sha256").update("replacement").digest("hex"));
    expect(replacement.state).toBe("saved");
    expect((await pool!.query("select count(*)::int count from profile_avatar_photos where owner_id=$1", [alice])).rows[0]!.count).toBe(1);
    if (replacement.state !== "saved") throw new Error("unexpected result");
    const reset = await owned!.patchProfile(alice, { expectedRowVersion: replacement.profile.rowVersion, avatar: null });
    expect(reset).toMatchObject({ state: "saved", profile: {
      avatarUrl: "https://example.test/google-latest.png", avatarSource: "provider" } });
    expect(await owned!.getCurrentAvatarPhoto(alice)).toBeNull();
    expect((await pool!.query("select count(*)::int count from profile_avatar_photos where owner_id=$1", [alice])).rows[0]!.count).toBe(0);
  });

  it("serializes an OAuth provider refresh against a user edit without silently discarding either", async () => {
    const subject = (await pool!.query<{ subject: string }>(
      "select subject from auth_identities where user_id=$1", [bob])).rows[0]!.subject;
    const before = (await owned!.getProfile(bob))!;
    const [edit] = await Promise.all([
      owned!.patchProfile(bob, { expectedRowVersion: before.rowVersion, displayName: "Custom Bob" }),
      auth!.upsertIdentity({ issuer: "https://accounts.google.com", subject,
        email: "new@example.test", emailVerified: true, displayName: "Google Bob refreshed",
        avatarUrl: "https://example.test/bob-refreshed.png" }, new Date())
    ]);
    const after = (await owned!.getProfile(bob))!;
    expect((await pool!.query("select provider_display_name from user_profiles where owner_id=$1", [bob]))
      .rows[0]!.provider_display_name).toBe("Google Bob refreshed");
    if (edit.state === "saved") {
      expect(after).toMatchObject({ displayName: "Custom Bob", displayNameSource: "override" });
    } else {
      expect(edit.state).toBe("conflict");
      expect(after).toMatchObject({ displayName: "Google Bob refreshed", displayNameSource: "provider" });
    }
  });

  it("exports private photo bytes and deletes them with their owner account", async () => {
    const data = Buffer.from("private-avatar-photo");
    const profile = (await owned!.getProfile(bob))!;
    expect((await owned!.replaceAvatarPhoto(bob, profile.rowVersion, data,
      createHash("sha256").update(data).digest("hex"))).state).toBe("saved");
    const snapshot = await exporter!.openSnapshot(bob);
    try {
      const records = [];
      for await (const record of snapshot.records()) if (record.section === "profileAvatarPhotos") records.push(record);
      expect(records).toHaveLength(1);
      expect(records[0]!.data.webp_base64).toBe(data.toString("base64"));
    } finally { await snapshot.close(); }
    await pool!.query("delete from app_users where id=$1", [bob]);
    users.splice(users.indexOf(bob), 1);
    expect((await pool!.query("select count(*)::int count from profile_avatar_photos where owner_id=$1", [bob])).rows[0]!.count).toBe(0);
  });

  it("does not orphan photos through legacy internal save/update/delete helpers", async () => {
    const data = Buffer.from("legacy-helper-photo");
    const hash = createHash("sha256").update(data).digest("hex");
    const photoCount = async () => (await pool!.query<{ count: number }>(
      "select count(*)::int count from profile_avatar_photos where owner_id=$1", [alice])).rows[0]!.count;
    let profile = (await owned!.getProfile(alice))!;
    expect((await owned!.replaceAvatarPhoto(alice, profile.rowVersion, data, hash)).state).toBe("saved");
    await owned!.saveProfile(alice, { displayName: "Legacy save", avatarUrl: null });
    expect(await photoCount()).toBe(0);
    profile = (await owned!.getProfile(alice))!;
    expect((await owned!.replaceAvatarPhoto(alice, profile.rowVersion, data, hash)).state).toBe("saved");
    await owned!.updateProfile(alice, alice, { avatarUrl: "https://example.test/legacy-return.png" });
    expect(await photoCount()).toBe(0);
    profile = (await owned!.getProfile(alice))!;
    expect((await owned!.replaceAvatarPhoto(alice, profile.rowVersion, data, hash)).state).toBe("saved");
    expect(await owned!.deleteProfile(alice, alice)).toBe(true);
    expect(await photoCount()).toBe(0);
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await owned?.close(); await auth?.close(); await exporter?.close(); await pool?.end();
});

async function sharingDisplayName(ownerId: string): Promise<string | null> {
  const client = await pool!.connect();
  try {
    await client.query("begin");
    await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
    const result = await client.query<{ display_name: string }>(
      "select display_name from app_sharing_identity($1)", [ownerId]);
    await client.query("commit");
    return result.rows[0]?.display_name ?? null;
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}
