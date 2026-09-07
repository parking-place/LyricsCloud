import { randomUUID } from "node:crypto";
import { type UnifiedSearchInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresSearchStore, SearchCursorError } from "./search.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const rootPool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const store = enabled ? new PostgresSearchStore(databaseUrl, 4) : null;
const users: string[] = [];

describe.runIf(enabled)("unified private search", () => {
  beforeAll(async () => {
    if (!rootPool || !store || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) {
      throw new Error("search integration requires lyricscloud_test");
    }
    users.push(
      (await rootPool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id,
      (await rootPool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id
    );
  });

  it("ranks title exact, prefix, contains, tag and body while returning common metadata", async () => {
    const [alice, bob] = users as [string, string];
    const parent = await seedSong(alice, "검색 부모 곡");
    const exact = await seedSong(alice, "ＦＩＲＥ");
    const prefix = await seedLyric(alice, parent, "Fire Verse 1", "제목 우선 본문");
    const contains = await seedRhyme(alice, "Cold fire note", "다른 본문");
    const tag = await seedRhyme(alice, "태그 일치", "본문 아님", "ＦＩＲＥ tag");
    const prompt = await seedPrompt(alice, "프롬프트 태그", "female vocal, fire synth");
    const body = await seedLyric(alice, parent, "본문 일치", "한글과 FIRE 그리고 숫자 808");
    await seedSong(bob, "FIRE");

    const result = await store!.search(alice, input("fire"));
    expect(result.items.map(({ score }) => score)).toEqual([600, 500, 400, 300, 300, 200]);
    expect(result.items.find(({ id }) => id === exact)).toMatchObject({ score: 600, matchField: "title" });
    expect(result.items.find(({ id }) => id === prefix)).toMatchObject({ score: 500, matchField: "title" });
    expect(result.items.find(({ id }) => id === contains)).toMatchObject({ score: 400, matchField: "title" });
    expect(result.items.find(({ id }) => id === tag)).toMatchObject({ score: 300, matchField: "tag" });
    expect(result.items.find(({ id }) => id === prompt)).toMatchObject({ score: 300, matchField: "tag" });
    expect(result.items.find(({ id }) => id === body)).toMatchObject({ score: 200, matchField: "body" });
    expect(result.items.find(({ id }) => id === prefix)?.linkedSongIds).toEqual([parent]);
    expect(result.items.some(({ title }) => title === "ＦＩＲＥ")).toBe(true);
    expect(await store!.search(bob, input("fire"))).toMatchObject({ items: [{ title: "FIRE" }] });
  });

  it("treats percent, underscore, backslash and quotes literally and normalizes mixed text", async () => {
    const [alice] = users as [string, string];
    const parent = await seedSong(alice, "특수문자 부모");
    const special = await seedLyric(alice, parent, "특수문자", "100% _air \\path 'quoted' Verse １\n한 글");
    for (const query of ["100%", "_air", "\\path", "'quoted'", "verse 1", "한\n  글"]) {
      expect((await store!.search(alice, input(query))).items.map(({ id }) => id)).toContain(special);
    }
  });

  it("excludes deleted resources through title, tag and body paths", async () => {
    const [alice] = users as [string, string];
    const parent = await seedSong(alice, "삭제 검색 부모");
    const title = await seedSong(alice, "hiddenneedle 제목");
    const body = await seedLyric(alice, parent, "삭제 본문", "hiddenneedle body");
    const tag = await seedRhyme(alice, "삭제 태그", "다른 본문", "hiddenneedle tag");
    await rootPool!.query("update resources set deleted_at=clock_timestamp() where id=any($1::uuid[])", [[title, body, tag]]);
    expect((await store!.search(alice, input("hiddenneedle"))).items).toEqual([]);
  });

  it("supports type filters and stable opaque pagination", async () => {
    const [alice] = users as [string, string];
    const marker = `page-${randomUUID().slice(0, 8)}`;
    const ids = await Promise.all(Array.from({ length: 5 }, (_, index) => seedSong(alice, `${marker}-${index}`)));
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await store!.search(alice, { ...input(marker, "song", 2), ...(cursor ? { cursor } : {}) });
      seen.push(...page.items.map(({ id }) => id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(seen)).toEqual(new Set(ids));
    const first = await store!.search(alice, input(marker, "song", 2));
    await expect(store!.search(alice, { ...input("different", "song", 2), cursor: first.nextCursor! }))
      .rejects.toBeInstanceOf(SearchCursorError);
    expect((await store!.search(alice, input(marker, "lyrics"))).items).toEqual([]);
    await expect(store!.search(alice, input("   "))).rejects.toThrow("SEARCH_INPUT_INVALID");
  });

  it("keeps a bounded recent-search list private, refreshes duplicates and supports removal", async () => {
    const [alice, bob] = users as [string, string];
    const first = await store!.recordRecentSearch(alice, { query: "  ＦＩＲＥ  ", type: "all" });
    const refreshed = await store!.recordRecentSearch(alice, { query: "fire", type: "all" });
    expect(refreshed.id).toBe(first.id);
    expect(await store!.listRecentSearches(bob)).toEqual([]);

    for (let index = 0; index < 10; index += 1) {
      await store!.recordRecentSearch(alice, { query: `recent-${index}`, type: index % 2 ? "lyrics" : "song" });
    }
    const recent = await store!.listRecentSearches(alice);
    expect(recent).toHaveLength(8);
    expect(recent[0]).toMatchObject({ query: "recent-9", type: "lyrics" });
    expect(recent.some(({ id }) => id === first.id)).toBe(false);
    expect(await store!.deleteRecentSearch(bob, recent[0]!.id)).toBe(false);
    expect(await store!.deleteRecentSearch(alice, recent[0]!.id)).toBe(true);
    expect(await store!.clearRecentSearches(alice)).toBe(7);
    expect(await store!.listRecentSearches(alice)).toEqual([]);
  });

  it("keeps the recent-search bound under concurrent writes", async () => {
    const [alice] = users as [string, string];
    await Promise.all(Array.from({ length: 16 }, (_, index) => store!.recordRecentSearch(alice, {
      query: `concurrent-${index}`,
      type: index % 2 === 0 ? "all" : "lyrics"
    })));
    expect(await store!.listRecentSearches(alice)).toHaveLength(8);
  });
});

afterAll(async () => {
  if (rootPool && users.length) await rootPool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await store?.close();
  await rootPool?.end();
});

function input(query: string, type: UnifiedSearchInput["type"] = "all", limit = 20): UnifiedSearchInput {
  return { query, type, limit };
}

async function seedSong(ownerId: string, title: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'song',$3)", [id, ownerId, title]);
    await client.query("insert into songs(resource_id,owner_id) values($1,$2)", [id, ownerId]);
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function seedLyric(ownerId: string, songId: string, title: string, body: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'lyrics',$3)", [id, ownerId, title]);
    await client.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,$4)", [id, ownerId, songId, body]);
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function seedRhyme(ownerId: string, title: string, body: string, tag?: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'rhyme_note',$3)", [id, ownerId, title]);
    await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [id, ownerId, body]);
    if (tag) {
      const tagId = (await client.query<{ id: string }>(
        "insert into tags(owner_id,display_value,normalized_value) values($1,$2,'generated') returning id", [ownerId, tag]
      )).rows[0]!.id;
      await client.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [ownerId, id, tagId]);
    }
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function seedPrompt(ownerId: string, title: string, plainText: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt',$3)", [id, ownerId, title]);
    await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)", [id, ownerId, plainText]);
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
