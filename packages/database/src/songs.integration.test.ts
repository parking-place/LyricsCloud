import { randomUUID } from "node:crypto";
import { parseCreateSongInput, type SongListInput, type SongSort } from "@lyricscloud/domain";
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

  it("updates fields and explicit metadata while returning honest dashboard availability", async () => {
    const [alice, bob] = users as [string, string];
    const created = await store!.createSong(alice, createInput({ title: "수정 전", requestId: randomUUID() }));
    const updated = await store!.updateSong(alice, created.song.id, {
      title: "수정 후", description: "합성 설명", workNotes: "합성 메모", status: "revising"
    });
    expect(updated).toMatchObject({ title: "수정 후", status: "revising", description: "합성 설명", workNotes: "합성 메모" });
    expect(await store!.setFavorite(alice, created.song.id, true)).toMatchObject({ isFavorite: true });
    expect(await store!.setPin(alice, created.song.id, true, 3)).toMatchObject({ isPinned: true, pinOrder: 3 });
    expect(await store!.setColor(alice, created.song.id, "blue")).toMatchObject({ color: "blue" });
    expect(await store!.getSong(alice, created.song.id)).toMatchObject({
      counts: {
        lyrics: { value: 0, available: true },
        prompts: { value: 0, available: false },
        rhymes: { value: 0, available: false }
      }
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
