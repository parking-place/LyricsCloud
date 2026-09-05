import { randomUUID } from "node:crypto";
import { LyricConflictError, LyricValidationError, parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 3 }) : null;
const store = enabled ? new PostgresLyricStore(databaseUrl, 5) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 3) : null;
const users: string[] = [];
let alice: string;
let bob: string;
async function song(ownerId = alice) {
  return (await songs!.createSong(ownerId, parseCreateSongInput({ title: "합성 부모 곡", requestId: randomUUID() }))).song;
}
function input(songId: string, fields: Record<string, unknown> = {}) {
  return parseCreateLyricInput({ title: "가사 초안", requestId: randomUUID(), ...fields }, songId);
}

describe.runIf(enabled)("lyrics ownership, concurrency and current text", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("lyrics integration requires lyricscloud_test");
    for (let i = 0; i < 2; i++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
    [alice, bob] = users as [string, string];
  });

  it("roundtrips plain text, creates independent same-title versions and updates counts", async () => {
    const parent = await song();
    const body = "[Verse]\n한글 English 🎵\n\n<script>alert('synthetic')</script>\r\n[Hook]\n끝";
    const first = (await store!.createLyric(alice, input(parent.id, { body, memo: "별도 메모" })))!.lyric;
    const second = (await store!.createLyric(alice, input(parent.id)))!.lyric;
    expect(first.id).not.toBe(second.id);
    expect(await store!.getLyric(alice, first.id)).toMatchObject({ body, memo: "별도 메모", title: second.title });
    expect(await songs!.getSong(alice, parent.id)).toMatchObject({ lyricCount: 2, counts: { lyrics: { value: 2, available: true } } });
    expect((await songs!.listSongs(alice, { sort: "updated_desc", limit: 100 })).items.find(({ id }) => id === parent.id)?.lyricCount).toBe(2);
    const edited = await store!.updateLyricCurrent(alice, first.id, { rowVersion: first.rowVersion, body: "변경", memo: "새 메모", title: "편집본", status: "final", isFavorite: true, isPinned: true, pinOrder: 2 });
    expect(edited).toMatchObject({ body: "변경", title: "편집본", status: "final", isFavorite: true, isPinned: true, pinOrder: 2 });
    expect(edited!.rowVersion).toBeGreaterThan(first.rowVersion);
    expect((await store!.getLyric(alice, second.id))!.body).toBe("");
    expect((await store!.listSongLyrics(alice, parent.id))!.map(({ id }) => id)).toEqual([first.id, second.id]);
  });

  it("serializes repeated create/duplicate keys and rejects reuse for a different operation or source", async () => {
    const parent = await song();
    const request = input(parent.id, { title: "🎵".repeat(200), body: "복제 원문", memo: "메모", status: "revising" });
    const created = await Promise.all(Array.from({ length: 4 }, () => store!.createLyric(alice, request)));
    expect(new Set(created.map((result) => result!.lyric.id)).size).toBe(1);
    expect(created.filter((result) => !result!.replayed)).toHaveLength(1);
    const original = created[0]!.lyric;
    expect((await store!.createLyric(alice.toUpperCase(), { ...request, requestId: request.requestId.toUpperCase(), songId: parent.id.toUpperCase() }))!.lyric.id).toBe(original.id);
    const requestId = randomUUID();
    const copies = await Promise.all(Array.from({ length: 4 }, () => store!.duplicateLyric(alice, original.id, { requestId })));
    expect(new Set(copies.map((result) => result!.lyric.id)).size).toBe(1);
    expect(copies.filter((result) => !result!.replayed)).toHaveLength(1);
    expect(copies[0]!.lyric).toMatchObject({ body: original.body, memo: original.memo, status: original.status, isFavorite: false, isPinned: false });
    expect([...copies[0]!.lyric.title]).toHaveLength(200);
    expect(copies[0]!.lyric.title.endsWith(" (복사본)")).toBe(true);
    expect((await store!.getLyric(alice, original.id))!.title).toBe(original.title);
    await expect(store!.duplicateLyric(alice, original.id, { requestId: request.requestId })).rejects.toBeInstanceOf(LyricConflictError);
    await expect(store!.createLyric(alice, { ...request, songId: (await song()).id })).rejects.toBeInstanceOf(LyricConflictError);
    await store!.deleteLyric(alice, original.id);
    expect(await store!.createLyric(alice, request)).toBeNull();
  });

  it("rejects stale concurrent saves without losing either committed metadata or body", async () => {
    const original = (await store!.createLyric(alice, input((await song()).id)))!.lyric;
    const results = await Promise.allSettled([
      store!.updateLyricCurrent(alice, original.id, { rowVersion: original.rowVersion, body: "A", title: "A title" }),
      store!.updateLyricCurrent(alice, original.id, { rowVersion: original.rowVersion, body: "B", title: "B title" })
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(LyricConflictError);
    const saved = (await store!.getLyric(alice, original.id))!;
    expect(saved.title).toBe(`${saved.body} title`);
  });

  it("blocks cross-owner CRUD and list and applies service validation before SQL", async () => {
    const parent = await song();
    const original = (await store!.createLyric(alice, input(parent.id)))!.lyric;
    expect(await store!.createLyric(bob, input(parent.id))).toBeNull();
    expect(await store!.getLyric(bob, original.id)).toBeNull();
    expect(await store!.listSongLyrics(bob, parent.id)).toBeNull();
    expect(await store!.updateLyricCurrent(bob, original.id, { rowVersion: 1, body: "침범" })).toBeNull();
    expect(await store!.duplicateLyric(bob, original.id, { requestId: randomUUID() })).toBeNull();
    expect(await store!.deleteLyric(bob, original.id)).toBe(false);
    expect(() => store!.createLyric(alice, { ...input(parent.id), body: "x".repeat(100001) })).toThrow(LyricValidationError);
    expect(() => store!.updateLyricCurrent(alice, original.id, { rowVersion: 1, memo: "x".repeat(10001) })).toThrow(LyricValidationError);
    const maximum = "🎵".repeat(100000);
    expect((await store!.updateLyricCurrent(alice, original.id, { rowVersion: original.rowVersion, body: maximum }))!.body).toBe(maximum);
  });

  it("preserves prior deletion batches while song deletion hides only then-active lyrics", async () => {
    const parent = await song();
    const prior = (await store!.createLyric(alice, input(parent.id)))!.lyric;
    const active = (await store!.createLyric(alice, input(parent.id)))!.lyric;
    expect(await store!.deleteLyric(alice, prior.id)).toBe(true);
    const previous = (await pool!.query<{ deletion_batch_id: string }>("select deletion_batch_id from resources where id = $1", [prior.id])).rows[0]!.deletion_batch_id;
    expect(await songs!.getSong(alice, parent.id)).toMatchObject({ lyricCount: 1 });
    expect(await songs!.deleteSong(alice, parent.id)).toBe(true);
    expect(await songs!.deleteSong(alice, parent.id)).toBe(false);
    const rows = (await pool!.query<{ id: string; deletion_batch_id: string }>("select id, deletion_batch_id from resources where id = any($1::uuid[])", [[parent.id, prior.id, active.id]])).rows;
    const batch = (id: string) => rows.find((row) => row.id === id)!.deletion_batch_id;
    expect(batch(parent.id)).toBe(batch(active.id));
    expect(batch(prior.id)).toBe(previous);
    expect(batch(prior.id)).not.toBe(batch(parent.id));
    expect(await store!.getLyric(alice, active.id)).toBeNull();
    expect(await store!.updateLyricCurrent(alice, active.id, { rowVersion: active.rowVersion, status: "final" })).toBeNull();
    expect(await store!.deleteLyric(alice, active.id)).toBe(false);
    expect(await store!.createLyric(alice, input(parent.id))).toBeNull();
  });

  it("finds active lyric titles and bodies only inside the owning song", async () => {
    const marker = `lyric-${randomUUID().slice(0, 8)}`;
    const parent = await song(alice);
    const otherParent = await song(bob);
    const active = (await store!.createLyric(alice, input(parent.id, { title: `${marker} 제목`, body: `본문 ${marker}-body` })))!.lyric;
    await store!.createLyric(bob, input(otherParent.id, { title: `${marker} 타인 제목`, body: `타인 ${marker}-foreign` }));
    expect((await songs!.listSongs(alice, { search: `${marker}-body`, sort: "updated_desc", limit: 20 })).items.map(({ id }) => id)).toEqual([parent.id]);
    expect((await songs!.listSongs(bob, { search: `${marker}-body`, sort: "updated_desc", limit: 20 })).items).toEqual([]);
    expect((await songs!.listSongs(alice, { search: `${marker}-foreign`, sort: "updated_desc", limit: 20 })).items).toEqual([]);
    await store!.deleteLyric(alice, active.id);
    expect((await songs!.listSongs(alice, { search: marker, sort: "updated_desc", limit: 20 })).items).toEqual([]);
  });

  it("leaves no active orphan when parent deletion races creation", async () => {
    for (let index = 0; index < 4; index++) {
      const parent = await song();
      await Promise.all([store!.createLyric(alice, input(parent.id)), songs!.deleteSong(alice, parent.id)]);
      const result = await pool!.query<{ count: string }>(`select count(*)::text as count from lyrics l join resources r on r.id = l.resource_id
        where l.song_id = $1 and r.deleted_at is null`, [parent.id]);
      expect(result.rows[0]!.count).toBe("0");
    }
  });

  it("enforces default-deny RLS, owner FK, subtype completeness and active parent at the database boundary", async () => {
    const parent = await song();
    const original = (await store!.createLyric(alice, input(parent.id)))!.lyric;
    const client = await pool!.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      expect((await client.query("select resource_id from lyrics")).rowCount).toBe(0);
      await client.query("select set_config('app.user_id', $1, true)", [bob]);
      expect((await client.query("select resource_id from lyrics where resource_id = $1", [original.id])).rowCount).toBe(0);
      await expect(client.query("insert into lyrics(resource_id,owner_id,song_id) values ($1,$2,$3)", [randomUUID(), bob, parent.id])).rejects.toMatchObject({ code: "23503" });
      await client.query("rollback");
      await client.query("begin");
      await client.query("insert into resources(id,owner_id,type,title) values ($1,$2,'lyrics','합성 orphan')", [randomUUID(), alice]);
      await expect(client.query("commit")).rejects.toMatchObject({ code: "23503" });
      await client.query("rollback");
      await songs!.deleteSong(alice, parent.id);
      await client.query("begin");
      await expect(client.query("insert into lyrics(resource_id,owner_id,song_id) values ($1,$2,$3)", [randomUUID(), alice, parent.id])).rejects.toMatchObject({ code: "23503" });
    } finally { await client.query("rollback"); client.release(); }
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id = any($1::uuid[])", [users]);
  await store?.close(); await songs?.close(); await pool?.end();
});
