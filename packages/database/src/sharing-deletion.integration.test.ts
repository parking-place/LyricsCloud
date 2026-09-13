import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLifecycleStore } from "./lifecycle.js";
import { PostgresLyricSharingStore } from "./lyric-sharing.js";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresPublicLyricSharingStore } from "./public-lyric-sharing.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 4 }) : null;
const lifecycle = enabled ? new PostgresLifecycleStore(databaseUrl, 2) : null;
const selected = enabled ? new PostgresLyricSharingStore(databaseUrl, 2) : null;
const publicLinks = enabled ? new PostgresPublicLyricSharingStore(databaseUrl, 2) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 2) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const users: string[] = [];
let owner = ""; let writer = ""; let writerSharingId = "";

describe.runIf(enabled)("sharing deletion capability fence", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (const name of ["삭제 소유자", "삭제 작성자"]) {
      const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      users.push(id); await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, name]);
    }
    [owner, writer] = users as [string, string];
    writerSharingId = (await selected!.getOwnIdentity(writer))!.sharingId;
  });

  it("revokes a selected writer on delete and does not revive it on trash restore", async () => {
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "selected 삭제" }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ requestId: randomUUID(), title: "selected", body: "보존" }, song.id)))!.lyric;
    const granted = (await selected!.grantRead(owner, lyric.id, writerSharingId, randomUUID()))!.grant;
    const writable = (await selected!.setGrantAccess(owner, lyric.id, granted.id, "write", randomUUID()))!.grant;
    expect(await lyrics!.deleteLyric(owner, lyric.id)).toBe(true);
    const deleted = (await pool!.query<{ state: string; permission_epoch: string; write_enabled: boolean; write_epoch: string }>(
      "select state,permission_epoch::text,write_enabled,write_epoch::text from lyric_read_grants where id=$1", [granted.id])).rows[0]!;
    expect(deleted).toEqual({ state: "revoked", permission_epoch: String(writable.permissionEpoch + 1),
      write_enabled: false, write_epoch: String(writable.writeEpoch + 1) });
    await lifecycle!.restore(owner, [{ kind: "resource", id: lyric.id }]);
    expect(await selected!.getSharedLyric(writer, lyric.id)).toBeNull();
    expect((await lyrics!.getLyric(owner, lyric.id))!.body).toBe("보존");
  });

  it("revokes a public writer on parent-song delete and keeps the old link dead after restore", async () => {
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "public 삭제" }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ requestId: randomUUID(), title: "public", body: "공개 보존" }, song.id)))!.lyric;
    const digest = "7".repeat(64);
    const issued = (await publicLinks!.issue(owner, lyric.id, { requestId: randomUUID(), tokenDigest: digest,
      expiresAt: new Date(Date.now() + 86_400_000), fields: { ownerDisplayName: false, status: false, updatedAt: false } }))!.link;
    const writable = (await publicLinks!.setAccess(owner, lyric.id, issued.id, {
      requestId: randomUUID(), access: "write", confirmation: "public-guest-write-v1"
    }))!.link;
    expect(await songs!.deleteSong(owner, song.id)).toBe(true);
    const deleted = (await pool!.query<{ state: string; permission_epoch: string; write_enabled: boolean; write_epoch: string }>(
      "select state,permission_epoch::text,write_enabled,write_epoch::text from lyric_public_read_links where id=$1", [issued.id])).rows[0]!;
    expect(deleted).toEqual({ state: "revoked", permission_epoch: String(writable.permissionEpoch + 1),
      write_enabled: false, write_epoch: String(writable.writeEpoch + 1) });
    await lifecycle!.restore(owner, [{ kind: "resource", id: song.id }]);
    expect(await publicLinks!.readProjection(digest)).toBeNull();
    expect((await lyrics!.getLyric(owner, lyric.id))!.body).toBe("공개 보존");
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([lifecycle?.close(), selected?.close(), publicLinks?.close(), lyrics?.close(), songs?.close(), pool?.end()]);
});
