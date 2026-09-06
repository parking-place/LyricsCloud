import { randomUUID } from "node:crypto";
import { parseCreateSongInput, type SongLinkResourceType, type SongListInput, type SongSort } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresSongStore, SongCursorError, type SongRecord } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const rootPool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const store = enabled ? new PostgresSongStore(databaseUrl, 4) : null;
const users: string[] = [];

describe.runIf(enabled)("song command and list store", () => {
  beforeAll(async () => {
    if (!rootPool || !store || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("song integration requires lyricscloud_test");
    const first = await rootPool.query<{ id: string }>("insert into app_users default values returning id");
    const second = await rootPool.query<{ id: string }>("insert into app_users default values returning id");
    users.push(first.rows[0]!.id, second.rows[0]!.id);
  });

  it("creates the resource pair once for a replayed request id", async () => {
    const [alice] = users as [string, string];
    const input = createInput({ title: "재시도 곡", requestId: randomUUID(), workNotes: "synthetic retry note" });
    const first = await store!.createSong(alice, input);
    const replay = await store!.createSong(alice, { ...input, title: "재전송에서 바뀐 값" });
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.song.id).toBe(first.song.id);
    expect(replay.song.title).toBe("재시도 곡");
    const counts = await rootPool!.query<{ resources: string; requests: string }>(`
      select count(*)::text as resources,
        (select count(*)::text from song_create_requests where owner_id = $1 and request_id = $2) as requests
      from resources where id = $3
    `, [alice, input.requestId, first.song.id]);
    expect(counts.rows[0]).toEqual({ resources: "1", requests: "1" });
  });

  it("updates fields and returns active owner-scoped dashboard counts", async () => {
    const [alice, bob] = users as [string, string];
    const created = await store!.createSong(alice, createInput({ title: "수정 전", requestId: randomUUID() }));
    const updated = await store!.updateSong(alice, created.song.id, {
      title: "수정 후", description: "합성 설명", workNotes: "합성 메모", status: "revising"
    });
    expect(updated).toMatchObject({ title: "수정 후", status: "revising", description: "합성 설명", workNotes: "합성 메모" });
    expect(await store!.setFavorite(alice, created.song.id, true)).toMatchObject({ isFavorite: true });
    expect(await store!.setPin(alice, created.song.id, true, 3)).toMatchObject({ isPinned: true, pinOrder: 3 });
    expect(await store!.setColor(alice, created.song.id, "blue")).toMatchObject({ color: "blue" });
    await seedDashboardResources(alice, created.song.id);
    expect(await store!.getSong(alice, created.song.id)).toMatchObject({
      counts: {
        lyrics: { value: 1, available: true },
        prompts: { value: 1, available: true },
        rhymes: { value: 1, available: true }
      }
    });
    expect(await store!.getSongDashboardCounts(alice, created.song.id)).toEqual({
      lyrics: { value: 1, available: true },
      prompts: { value: 1, available: true },
      rhymes: { value: 1, available: true }
    });
    expect(await store!.getSong(bob, created.song.id)).toBeNull();
    expect(await store!.updateSong(bob, created.song.id, { title: "침범" })).toBeNull();
    expect(await store!.setFavorite(bob, created.song.id, false)).toBeNull();
  });

  it("combines literal search, status filters, five stable keyset sorts, and total count", async () => {
    const [alice, bob] = users as [string, string];
    const marker = randomUUID().slice(0, 8);
    const fixtures = [
      { title: `${marker} 같은 제목`, status: "idea" as const, workNotes: "100%_literal", isPinned: true, pinOrder: 0 },
      { title: `${marker} 같은 제목`, status: "idea" as const },
      { title: `${marker} 가나다`, status: "completed" as const, isFavorite: true },
      { title: `${marker} Alpha`, status: "mixing" as const },
      { title: `${marker} 마지막`, status: "on_hold" as const }
    ];
    const created: SongRecord[] = [];
    for (const fixture of fixtures) {
      created.push((await store!.createSong(alice, createInput({ requestId: randomUUID(), ...fixture }))).song);
    }
    await store!.createSong(bob, createInput({ requestId: randomUUID(), title: `${marker} 타인 곡`, workNotes: "100%_literal" }));

    const literal = await store!.listSongs(alice, listInput({ search: "%_literal" }));
    expect(literal.items).toHaveLength(1);
    expect(literal.items[0]?.id).toBe(created[0]?.id);
    const caseInsensitive = await store!.listSongs(alice, listInput({ search: "alpha" }));
    expect(caseInsensitive.items.map(({ title }) => title)).toEqual([`${marker} Alpha`]);
    const filtered = await store!.listSongs(alice, listInput({ status: "completed" }));
    expect(filtered.items.map(({ title }) => title)).toEqual([`${marker} 가나다`]);

    for (const sort of ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"] satisfies SongSort[]) {
      const items = await collectPages(alice, { search: marker, sort, limit: 2 });
      expect(items).toHaveLength(fixtures.length);
      expect(new Set(items.map(({ id }) => id)).size).toBe(fixtures.length);
      expect(items[0]?.id).toBe(created[0]?.id);
    }
    const firstPage = await store!.listSongs(alice, listInput({ search: marker, limit: 2 }));
    expect(firstPage.totalCount).toBe(fixtures.length);
    expect(firstPage.capabilities).toEqual({ lyricsSearch: true, linkedResourceFilters: false });
    await expect(store!.listSongs(alice, listInput({ cursor: "not-a-cursor" }))).rejects.toBeInstanceOf(SongCursorError);
  });

  it("lists and atomically changes owner-scoped rhyme and prompt links", async () => {
    const [alice, bob] = users as [string, string];
    const song = (await store!.createSong(alice, createInput({ title: "연결 관리 곡", requestId: randomUUID() }))).song;
    const otherSong = (await store!.createSong(bob, createInput({ title: "타인 연결 곡", requestId: randomUUID() }))).song;
    const first = await seedLinkedResource(alice, "rhyme_note", "연결 라임", "light 100%_literal");
    const second = await seedLinkedResource(alice, "rhyme_note", "미연결 라임", "night 검색 본문");
    const deleted = await seedLinkedResource(alice, "rhyme_note", "삭제 라임", "숨김 본문", true);
    const other = await seedLinkedResource(bob, "rhyme_note", "타인 라임", "타인 본문");
    expect(await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [first], unlinkIds: [] }))
      .toEqual({ linkedIds: [first], unlinkedIds: [] });
    expect(await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [first], unlinkIds: [] }))
      .toEqual({ linkedIds: [first], unlinkedIds: [] });
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 }))?.items)
      .toMatchObject([{ id: first, title: "연결 라임", isLinked: true }]);
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "unlinked", search: "검색 본문", limit: 20 }))?.items)
      .toMatchObject([{ id: second, title: "미연결 라임", isLinked: false }]);
    const all = await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "all", search: "라임", limit: 1 });
    expect(all).toMatchObject({ totalCount: 2, items: [{ id: first, isLinked: true }] });
    expect(all?.nextCursor).toEqual(expect.any(String));
    expect((await store!.listSongLinks(alice, song.id, {
      type: "rhyme_note", state: "all", search: "라임", limit: 1, cursor: all!.nextCursor!
    }))?.items).toMatchObject([{ id: second, isLinked: false }]);
    await expect(store!.listSongLinks(alice, song.id, {
      type: "rhyme_note", state: "linked", search: "라임", limit: 1, cursor: all!.nextCursor!
    })).rejects.toBeInstanceOf(SongCursorError);

    expect(await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [second], unlinkIds: [first] }))
      .toEqual({ linkedIds: [second], unlinkedIds: [first] });
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 }))?.items)
      .toMatchObject([{ id: second, isLinked: true }]);
    expect((await rootPool!.query("select 1 from resources where id=$1 and deleted_at is null", [first])).rowCount).toBe(1);
    expect(await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [deleted], unlinkIds: [] })).toBeNull();
    expect(await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [other], unlinkIds: [] })).toBeNull();
    expect(await store!.listSongLinks(bob, song.id, { type: "rhyme_note", state: "all", limit: 20 })).toBeNull();
    expect(await store!.changeSongLinks(bob, song.id, { type: "rhyme_note", linkIds: [other], unlinkIds: [] })).toBeNull();
    expect(await store!.changeSongLinks(alice, otherSong.id, { type: "rhyme_note", linkIds: [first], unlinkIds: [] })).toBeNull();

    const prompt = await seedLinkedResource(alice, "prompt", "Suno 후보", "cinematic, female vocal");
    expect((await store!.listSongLinks(alice, song.id, { type: "prompt", state: "unlinked", search: "female vocal", limit: 20 }))?.items)
      .toMatchObject([{ id: prompt, preview: "cinematic, female vocal", isLinked: false }]);
  });

  it("hides links while a song or resource is deleted and restores the existing relation", async () => {
    const [alice] = users as [string, string];
    const song = (await store!.createSong(alice, createInput({ title: "복원 정책 곡", requestId: randomUUID() }))).song;
    const rhyme = await seedLinkedResource(alice, "rhyme_note", "복원 정책 라임", "relation survives restore");
    await store!.changeSongLinks(alice, song.id, { type: "rhyme_note", linkIds: [rhyme], unlinkIds: [] });

    await rootPool!.query("update resources set deleted_at=clock_timestamp() where id=$1", [rhyme]);
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 }))?.items).toEqual([]);
    expect((await rootPool!.query("select 1 from song_resource_links where song_resource_id=$1 and linked_resource_id=$2", [song.id, rhyme])).rowCount).toBe(1);
    await rootPool!.query("update resources set deleted_at=null where id=$1", [rhyme]);
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 }))?.items)
      .toMatchObject([{ id: rhyme, isLinked: true }]);

    expect(await store!.deleteSong(alice, song.id)).toBe(true);
    expect(await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 })).toBeNull();
    expect((await rootPool!.query("select 1 from song_resource_links where song_resource_id=$1 and linked_resource_id=$2", [song.id, rhyme])).rowCount).toBe(1);
    await rootPool!.query("update resources set deleted_at=null where id=$1", [song.id]);
    expect((await store!.listSongLinks(alice, song.id, { type: "rhyme_note", state: "linked", limit: 20 }))?.items)
      .toMatchObject([{ id: rhyme, isLinked: true }]);
  });

  it("soft deletes idempotently without exposing another owner's existence", async () => {
    const [alice, bob] = users as [string, string];
    const created = await store!.createSong(alice, createInput({ title: "삭제 대상", requestId: randomUUID() }));
    expect(await store!.deleteSong(bob, created.song.id)).toBe(false);
    expect(await store!.deleteSong(alice, created.song.id)).toBe(true);
    expect(await store!.deleteSong(alice, created.song.id)).toBe(false);
    expect(await store!.getSong(alice, created.song.id)).toBeNull();
    const listed = await store!.listSongs(alice, listInput({ search: "삭제 대상" }));
    expect(listed.items).toEqual([]);
  });
});

afterAll(async () => {
  if (rootPool && users.length) await rootPool.query("delete from app_users where id = any($1::uuid[])", [users]);
  await store?.close();
  await rootPool?.end();
});

function createInput(overrides: Record<string, unknown>) {
  return parseCreateSongInput({ requestId: randomUUID(), title: "합성 곡", ...overrides });
}

function listInput(overrides: Partial<SongListInput>): SongListInput {
  return { sort: "updated_desc", limit: 20, ...overrides };
}

async function collectPages(ownerId: string, input: SongListInput): Promise<SongRecord[]> {
  const result: SongRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await store!.listSongs(ownerId, { ...input, ...(cursor ? { cursor } : {}) });
    result.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return result;
}

async function seedDashboardResources(ownerId: string, songId: string) {
  const activeLyric = randomUUID();
  const deletedLyric = randomUUID();
  const activePrompt = randomUUID();
  const deletedPrompt = randomUUID();
  const activeRhyme = randomUUID();
  const deletedRhyme = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    for (const [id, deleted] of [[activeLyric, false], [deletedLyric, true]] as const) {
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'lyrics',$3)", [id, ownerId, `가사 ${id}`]);
      await client.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'본문')", [id, ownerId, songId]);
      if (deleted) await client.query("update resources set deleted_at=clock_timestamp() where id=$1", [id]);
    }
    for (const [id, type, deleted] of [[activePrompt, "prompt", false], [deletedPrompt, "prompt", true], [activeRhyme, "rhyme_note", false], [deletedRhyme, "rhyme_note", true]] as const) {
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,$3,$4)", [id, ownerId, type, `${type} ${id}`]);
      if (type === "prompt") await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,'prompt')", [id, ownerId]);
      else await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'rhyme')", [id, ownerId]);
      await client.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,$4)", [ownerId, songId, id, type]);
      if (deleted) await client.query("update resources set deleted_at=clock_timestamp() where id=$1", [id]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function seedLinkedResource(ownerId: string, type: SongLinkResourceType, title: string, preview: string, deleted = false) {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,$3,$4)", [id, ownerId, type, title]);
    if (type === "prompt") await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)", [id, ownerId, preview]);
    else await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [id, ownerId, preview]);
    if (deleted) await client.query("update resources set deleted_at=clock_timestamp() where id=$1", [id]);
    await client.query("commit");
    return id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}
