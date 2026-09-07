import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresRecentWorkStore } from "./recent-work.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const rootPool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const store = enabled ? new PostgresRecentWorkStore(databaseUrl, 4) : null;
const users: string[] = [];

describe.runIf(enabled)("private recent work", () => {
  beforeAll(async () => {
    if (!rootPool || !store || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("recent work integration requires lyricscloud_test");
    users.push(
      (await rootPool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id,
      (await rootPool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id
    );
  });

  it("separates update and open time without touching resource updated_at", async () => {
    const [alice] = users as [string, string];
    const song = await seedSong(alice, "최근 곡", "remember chorus");
    const before = (await rootPool!.query<{ updated_at: Date }>("select updated_at from resources where id=$1", [song])).rows[0]!.updated_at;
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await store!.recordOpen(alice, song)).toBe(true);
    const after = (await rootPool!.query<{ updated_at: Date }>("select updated_at from resources where id=$1", [song])).rows[0]!.updated_at;
    expect(after.toISOString()).toBe(before.toISOString());
    expect(await store!.listRecentWork(alice, { type: "all", limit: 50 })).toContainEqual(expect.objectContaining({
      id: song, activityKind: "opened", hasWorkNote: true
    }));
  });

  it("keeps owner positions private and excludes deleted resources and lyrics with deleted parents", async () => {
    const [alice, bob] = users as [string, string];
    const parent = await seedSong(alice, "위치 부모", "");
    const lyric = await seedLyric(alice, parent, "위치 가사", "[Verse]\nline\n[Hook]\nchorus", "memo");
    const saved = await store!.saveLyricPosition(alice, lyric, {
      cursorOffset: 24, songformLabel: "Hook", songformOccurrence: 1, scrollTop: 321, viewport: "mobile"
    });
    expect(saved).toMatchObject({ cursorOffset: 24, songformLabel: "Hook", viewport: "mobile" });
    expect(await store!.getLyricPosition(bob, lyric)).toBeNull();
    expect((await store!.listRecentWork(alice, { type: "lyrics", limit: 50 }))[0]).toMatchObject({
      id: lyric, parentSong: { id: parent, title: "위치 부모" }, hasWorkNote: true, position: { cursorOffset: 24 }
    });
    await rootPool!.query("update resources set deleted_at=clock_timestamp() where id=$1", [parent]);
    expect(await store!.getLyricPosition(alice, lyric)).toBeNull();
    expect((await store!.listRecentWork(alice, { type: "all", limit: 50 })).some(({ id }) => id === lyric)).toBe(false);
  });

  it("returns active linked song context while never returning body or memo fields", async () => {
    const [alice] = users as [string, string];
    const song = await seedSong(alice, "연결 곡", "private notes");
    const rhyme = await seedRhyme(alice, "같은 제목", "private rhyme body");
    const prompt = await seedPrompt(alice, "같은 제목", "private prompt body");
    await rootPool!.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
      values($1,$2,$3,'rhyme_note'),($1,$2,$4,'prompt')`, [alice, song, rhyme, prompt]);
    const items = await store!.listRecentWork(alice, { type: "all", limit: 50 });
    for (const id of [rhyme, prompt]) {
      const item = items.find((candidate) => candidate.id === id)!;
      expect(item.parentSong).toEqual({ id: song, title: "연결 곡" });
      expect(item.linkedSongCount).toBe(1);
      expect(Object.keys(item)).not.toContain("body");
      expect(Object.keys(item)).not.toContain("memo");
    }
  });

  it("rejects wrong types and inaccessible or deleted open targets", async () => {
    const [alice, bob] = users as [string, string];
    const rhyme = await seedRhyme(alice, "비공개", "body");
    expect(await store!.recordOpen(bob, rhyme)).toBe(false);
    await rootPool!.query("update resources set deleted_at=clock_timestamp() where id=$1", [rhyme]);
    expect(await store!.recordOpen(alice, rhyme)).toBe(false);
    await expect(store!.saveLyricPosition(alice, rhyme, {
      cursorOffset: 0, songformLabel: null, songformOccurrence: null, scrollTop: 0, viewport: "desktop"
    })).resolves.toBeNull();
  });
});

afterAll(async () => {
  if (rootPool && users.length) await rootPool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await store?.close();
  await rootPool?.end();
});

async function seedSong(ownerId: string, title: string, workNotes: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'song',$3)", [id, ownerId, title]);
    await client.query("insert into songs(resource_id,owner_id,work_notes) values($1,$2,$3)", [id, ownerId, workNotes]);
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function seedLyric(ownerId: string, songId: string, title: string, body: string, memo: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'lyrics',$3)", [id, ownerId, title]);
    await client.query("insert into lyrics(resource_id,owner_id,song_id,body,memo) values($1,$2,$3,$4,$5)", [id, ownerId, songId, body, memo]);
    await client.query("commit");
    return id;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function seedRhyme(ownerId: string, title: string, body: string): Promise<string> {
  const id = randomUUID();
  const client = await rootPool!.connect();
  try {
    await client.query("begin");
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'rhyme_note',$3)", [id, ownerId, title]);
    await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [id, ownerId, body]);
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
