import { randomUUID } from "node:crypto";
import { parseCreateRhymeNoteInput, parseCreateSongInput, RhymeConflictError } from "@lyricscloud/domain";
import type { RhymeListInput } from "@lyricscloud/domain";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresRhymeStore } from "./rhymes.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const rhymes = enabled ? new PostgresRhymeStore(databaseUrl, 4) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("rhyme note PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("deduplicates create and duplicate requests without accepting changed payloads", async () => {
    const owner = users[0]!;
    const requestId = randomUUID();
    const input = parseCreateRhymeNoteInput({ requestId, title: "라임 기반", body: "air / chair", color: "blue" });
    const first = await rhymes!.createRhymeNote(owner, input);
    const replay = await rhymes!.createRhymeNote(owner, input);
    expect(replay).toMatchObject({ replayed: true, rhyme: { id: first.rhyme.id } });
    await expect(rhymes!.createRhymeNote(owner, { ...input, title: "재사용 공격" })).rejects.toBeInstanceOf(RhymeConflictError);

    const duplicateRequest = randomUUID();
    const duplicate = await rhymes!.duplicateRhymeNote(owner, first.rhyme.id, { requestId: duplicateRequest });
    expect(duplicate).toMatchObject({ replayed: false, rhyme: { body: input.body, color: "blue" } });
    expect(await rhymes!.duplicateRhymeNote(owner, first.rhyme.id, { requestId: duplicateRequest })).toMatchObject({ replayed: true, rhyme: { id: duplicate!.rhyme.id } });
  });

  it("normalizes owner tags across spaces, case and Unicode representation", async () => {
    const owner = users[0]!;
    const fire = await rhymes!.upsertTag(owner, "  FIRE\tTag ");
    const sameFire = await rhymes!.upsertTag(owner, "fire tag");
    const composed = await rhymes!.upsertTag(owner, "가");
    const decomposed = await rhymes!.upsertTag(owner, "가");
    expect(sameFire.id).toBe(fire.id);
    expect(sameFire.displayValue).toBe("FIRE Tag");
    expect(decomposed.id).toBe(composed.id);
  });

  it("rejects cross-owner tag and song links", async () => {
    const [alice, bob] = users as [string, string];
    const note = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "Alice note", body: "private" }))).rhyme;
    const bobTag = await rhymes!.upsertTag(bob, "Bob tag");
    const bobSong = (await songs!.createSong(bob, parseCreateSongInput({ requestId: randomUUID(), title: "Bob song" }))).song;
    await expect(rhymes!.attachTag(alice, note.id, bobTag.id)).rejects.toMatchObject({ code: "23503" });
    expect(await rhymes!.linkSong(alice, note.id, bobSong.id)).toBe(false);
    expect((await rhymes!.getRhymeNote(alice, note.id))!.tags).toEqual([]);
    expect((await rhymes!.getRhymeNote(alice, note.id))!.linkedSongIds).toEqual([]);
    expect(await rhymes!.getRhymeNote(bob, note.id)).toBeNull();
  });

  it("unlinks one song without deleting the note, tags or other links", async () => {
    const owner = users[0]!;
    const firstSong = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "첫 곡" }))).song;
    const secondSong = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "둘째 곡" }))).song;
    const note = (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "재사용 노트", body: "보존할 본문" }))).rhyme;
    const tag = await rhymes!.upsertTag(owner, "보존 태그");
    expect(await rhymes!.attachTag(owner, note.id, tag.id)).toBe(true);
    expect(await rhymes!.attachTag(owner, note.id, tag.id)).toBe(false);
    expect(await rhymes!.linkSong(owner, note.id, firstSong.id)).toBe(true);
    expect(await rhymes!.linkSong(owner, note.id, secondSong.id)).toBe(true);
    expect(await rhymes!.linkSong(owner, note.id, secondSong.id)).toBe(false);
    expect(await rhymes!.unlinkSong(owner, note.id, firstSong.id)).toBe(true);
    expect(await rhymes!.getRhymeNote(owner, note.id)).toMatchObject({ body: "보존할 본문", linkedSongIds: [secondSong.id], tags: [{ id: tag.id }] });
  });

  it("keeps tag attachment idempotent at the per-note limit", async () => {
    const owner = users[0]!;
    const note = (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "태그 한계", body: "limit" }))).rhyme;
    const tags = await Promise.all(Array.from({ length: 31 }, (_, index) => rhymes!.upsertTag(owner, `limit-${index}`)));
    for (const tag of tags.slice(0, 30)) expect(await rhymes!.attachTag(owner, note.id, tag.id)).toBe(true);
    expect(await rhymes!.attachTag(owner, note.id, tags[0]!.id)).toBe(false);
    await expect(rhymes!.attachTag(owner, note.id, tags[30]!.id)).rejects.toThrow("RHYME_TAG_LIMIT");
  });

  it("hides soft-deleted notes, tags and links while retaining independent originals", async () => {
    const owner = users[0]!;
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "연결 곡" }))).song;
    const note = (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "삭제 노트", body: "본문" }))).rhyme;
    const tag = await rhymes!.upsertTag(owner, "숨길 태그");
    await rhymes!.attachTag(owner, note.id, tag.id);
    await rhymes!.linkSong(owner, note.id, song.id);
    await withUser(owner, (client) => client.query("update tags set deleted_at=clock_timestamp() where id=$1", [tag.id]));
    expect((await rhymes!.getRhymeNote(owner, note.id))!.tags).toEqual([]);
    expect(await rhymes!.deleteRhymeNote(owner, note.id)).toBe(true);
    expect(await rhymes!.deleteRhymeNote(owner, note.id)).toBe(false);
    expect(await rhymes!.getRhymeNote(owner, note.id)).toBeNull();
    const retained = await pool!.query<{ notes: string; tags: string; links: string }>(`select
      (select count(*)::text from rhyme_notes where resource_id=$1) notes,
      (select count(*)::text from tags where id=$2) tags,
      (select count(*)::text from song_resource_links where linked_resource_id=$1) links`, [note.id, tag.id]);
    expect(retained.rows[0]).toEqual({ notes: "1", tags: "1", links: "1" });
  });

  it("lists owner-only notes with combined literal search, tag, song, sort and cursors", async () => {
    const [alice, bob] = users as [string, string];
    const marker = `list-${randomUUID()}`;
    const song = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: `${marker} 곡` }))).song;
    const tag = await rhymes!.upsertTag(alice, `${marker} 태그`);
    const matching = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker} Alpha`, body: "literal %_needle", isPinned: true }))).rhyme;
    const second = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker} Beta`, body: "another needle" }))).rhyme;
    const hidden = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker} Deleted`, body: "needle" }))).rhyme;
    await rhymes!.attachTag(alice, matching.id, tag.id); await rhymes!.attachTag(alice, second.id, tag.id);
    await rhymes!.linkSong(alice, matching.id, song.id); await rhymes!.linkSong(alice, second.id, song.id);
    await rhymes!.deleteRhymeNote(alice, hidden.id);
    await rhymes!.createRhymeNote(bob, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker} Foreign`, body: "needle" }));

    const input = (overrides: Partial<RhymeListInput> = {}): RhymeListInput => ({ sort: "title_asc", limit: 1, ...overrides });
    const literal = await rhymes!.listRhymeNotes(alice, input({ search: "%_needle", tagId: tag.id, songId: song.id }));
    expect(literal.items).toHaveLength(1);
    expect(literal.items[0]).toMatchObject({ id: matching.id, tags: [{ id: tag.id }], linkedSongs: [{ id: song.id, title: `${marker} 곡` }] });
    expect(literal.filters.tags.some(({ id }) => id === tag.id)).toBe(true);
    expect(literal.filters.songs.some(({ id }) => id === song.id)).toBe(true);

    const first = await rhymes!.listRhymeNotes(alice, input({ search: marker }));
    expect(first.totalCount).toBe(2); expect(first.nextCursor).toBeTruthy();
    const next = await rhymes!.listRhymeNotes(alice, input({ search: marker, cursor: first.nextCursor! }));
    expect(new Set([...first.items, ...next.items].map(({ id }) => id))).toEqual(new Set([matching.id, second.id]));
    await expect(rhymes!.listRhymeNotes(alice, input({ search: marker, sort: "updated_desc", cursor: first.nextCursor! })))
      .rejects.toThrow("RHYME_CURSOR_INVALID");
    expect((await rhymes!.listRhymeNotes(bob, input({ search: "%_needle" }))).items).toEqual([]);
  });
});

async function withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool!.connect();
  try {
    await client.query("begin");
    await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([rhymes?.close(), songs?.close(), pool?.end()]);
});
