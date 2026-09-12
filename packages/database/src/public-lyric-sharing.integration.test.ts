import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresPublicLyricSharingStore, PublicLinkConflictError } from "./public-lyric-sharing.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 4 }) : null;
const sharing = enabled ? new PostgresPublicLyricSharingStore(databaseUrl, 5) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 3) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 3) : null;
const users: string[] = [];
let owner: string; let stranger: string;

describe.runIf(enabled)("public lyric read links", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("public sharing integration requires lyricscloud_test");
    for (const displayName of ["owner@example.invalid", "stranger"]) {
      const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      users.push(id); await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, displayName]);
    }
    [owner, stranger] = users as [string, string];
  });

  it("issues one-time links, exposes the selected projection, and atomically revokes old capabilities", async () => {
    const song = (await songs!.createSong(owner, parseCreateSongInput({ title: "private parent", requestId: randomUUID() }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ title: "public title", body: "public body",
      memo: "private memo", requestId: randomUUID() }, song.id)))!.lyric;
    const requestId = randomUUID(); const firstDigest = "1".repeat(64);
    const input = { requestId, tokenDigest: firstDigest, expiresAt: new Date(Date.now() + 86_400_000),
      fields: { ownerDisplayName: true, status: false, updatedAt: false } };
    const [first, replay] = await Promise.all([sharing!.issue(owner, lyric.id, input), sharing!.issue(owner, lyric.id, input)]);
    expect(new Set([first!.link.id, replay!.link.id])).toHaveLength(1);
    expect([first!.replayed, replay!.replayed].sort()).toEqual([false, true]);
    await expect(sharing!.readProjection(firstDigest)).resolves.toMatchObject({ title: "public title", body: "public body",
      ownerDisplayName: "공유자", permissionEpoch: 1 });
    expect(JSON.stringify(await sharing!.readProjection(firstDigest))).not.toContain("private memo");
    expect(await sharing!.list(stranger, lyric.id)).toBeNull();
    expect(await sharing!.revoke(stranger, lyric.id, first!.link.id)).toBeNull();
    await expect(sharing!.issue(owner, lyric.id, { ...input, tokenDigest: "2".repeat(64),
      expiresAt: new Date(input.expiresAt.getTime() + 1000) })).rejects.toBeInstanceOf(PublicLinkConflictError);

    const second = await sharing!.issue(owner, lyric.id, { ...input, requestId: randomUUID(), tokenDigest: "3".repeat(64) });
    expect(second!.link.permissionEpoch).toBeGreaterThan(first!.link.permissionEpoch);
    await expect(sharing!.readProjection(firstDigest)).resolves.toBeNull();
    await expect(sharing!.readProjection("3".repeat(64))).resolves.toMatchObject({ linkId: second!.link.id });
    expect(await sharing!.revoke(owner, lyric.id, second!.link.id)).toBe(true);
    expect(await sharing!.revoke(owner, lyric.id, second!.link.id)).toBe(false);
    await expect(sharing!.readProjection("3".repeat(64))).resolves.toBeNull();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([sharing?.close(), lyrics?.close(), songs?.close(), pool?.end()]);
});
