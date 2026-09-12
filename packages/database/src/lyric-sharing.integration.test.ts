import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLyricSharingStore, SharingConflictError } from "./lyric-sharing.js";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 4 }) : null;
const sharing = enabled ? new PostgresLyricSharingStore(databaseUrl, 5) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 3) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 3) : null;
const users: string[] = [];
let owner: string; let reader: string; let stranger: string;
let ownerSharingId: string; let readerSharingId: string;

describe.runIf(enabled)("selected lyric read sharing", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("sharing integration requires lyricscloud_test");
    for (const displayName of ["소유자", "읽는 사람", "무관한 사람"]) {
      const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      users.push(id);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, displayName]);
    }
    [owner, reader, stranger] = users as [string, string, string];
    ownerSharingId = (await pool.query<{ sharing_id: string }>("select sharing_id from user_profiles where owner_id=$1", [owner])).rows[0]!.sharing_id;
    readerSharingId = (await pool.query<{ sharing_id: string }>("select sharing_id from user_profiles where owner_id=$1", [reader])).rows[0]!.sharing_id;
  });

  it("exposes only the opaque self sharing identity", async () => {
    await expect(sharing!.getOwnIdentity(reader)).resolves.toEqual({ sharingId: readerSharingId, displayName: "읽는 사람" });
    expect(readerSharingId).not.toBe(reader);
    expect(ownerSharingId).not.toBe(owner);
  });

  it("grants one lyric idempotently while keeping owner APIs and private fields isolated", async () => {
    const song = (await songs!.createSong(owner, parseCreateSongInput({ title: "비공개 곡", requestId: randomUUID() }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ title: "공유 제목", body: "공유 본문", memo: "절대 비공개 메모", requestId: randomUUID() }, song.id)))!.lyric;
    const requestId = randomUUID();
    const [first, duplicate] = await Promise.all([
      sharing!.grantRead(owner, lyric.id, readerSharingId, requestId),
      sharing!.grantRead(owner, lyric.id, readerSharingId, requestId)
    ]);
    expect(new Set([first!.grant.id, duplicate!.grant.id])).toHaveLength(1);
    expect([first!.replayed, duplicate!.replayed].sort()).toEqual([false, true]);
    await expect(lyrics!.getLyric(reader, lyric.id)).resolves.toBeNull();
    await expect(lyrics!.updateLyricCurrent(reader, lyric.id, { rowVersion: lyric.rowVersion, body: "침범" })).resolves.toBeNull();
    await expect(sharing!.getSharedLyric(reader, lyric.id)).resolves.toEqual(expect.objectContaining({
      id: lyric.id, title: "공유 제목", body: "공유 본문", ownerDisplayName: "소유자",
      access: { mode: "read", permissionEpoch: 1 }
    }));
    expect(JSON.stringify(await sharing!.getSharedLyric(reader, lyric.id))).not.toContain("절대 비공개 메모");
    await expect(sharing!.getSharedLyric(stranger, lyric.id)).resolves.toBeNull();
    await expect(sharing!.getSharedLyric(reader, song.id)).resolves.toBeNull();

    await expect(sharing!.grantRead(owner, lyric.id, readerSharingId, requestId)).resolves.toMatchObject({ replayed: true });
    await expect(sharing!.grantRead(owner, lyric.id, ownerSharingId, randomUUID())).resolves.toBeNull();
    await expect(sharing!.grantRead(owner, lyric.id, randomUUID(), randomUUID())).resolves.toBeNull();

    const other = (await lyrics!.createLyric(owner, parseCreateLyricInput({ title: "다른 가사", requestId: randomUUID() }, song.id)))!.lyric;
    await expect(sharing!.grantRead(owner, other.id, readerSharingId, requestId)).rejects.toBeInstanceOf(SharingConflictError);

    const client = await pool!.connect();
    try {
      await client.query("begin"); await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [reader]);
      expect((await client.query("select id from resources where id=$1", [lyric.id])).rowCount).toBe(1);
      expect((await client.query("select resource_id from lyrics where resource_id=$1", [lyric.id])).rowCount).toBe(1);
      expect((await client.query("select id from resources where id=$1", [song.id])).rowCount).toBe(0);
      expect((await client.query("select resource_id from lyrics where song_id=$1", [song.id])).rowCount).toBe(1);
      await expect(client.query("update lyrics set body='침범' where resource_id=$1", [lyric.id])).resolves.toMatchObject({ rowCount: 0 });
      await client.query("rollback");
    } finally { await client.query("rollback").catch(() => undefined); client.release(); }

    expect(await sharing!.revokeRead(owner, lyric.id, first!.grant.id)).toBe(true);
    expect(await sharing!.revokeRead(owner, lyric.id, first!.grant.id)).toBe(false);
    await expect(sharing!.getSharedLyric(reader, lyric.id)).resolves.toBeNull();
    const regranted = await sharing!.grantRead(owner, lyric.id, readerSharingId, randomUUID());
    expect(regranted!.grant.permissionEpoch).toBeGreaterThan(first!.grant.permissionEpoch);

    await pool!.query("update app_users set status='blocked' where id=$1", [reader]);
    await expect(sharing!.getSharedLyric(reader, lyric.id)).resolves.toBeNull();
    await pool!.query("update app_users set status='active' where id=$1", [reader]);
    await pool!.query("update lyric_read_grants set expires_at=now()-interval '1 second' where id=$1", [regranted!.grant.id]);
    await expect(sharing!.getSharedLyric(reader, lyric.id)).resolves.toBeNull();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([sharing?.close(), lyrics?.close(), songs?.close(), pool?.end()]);
});
