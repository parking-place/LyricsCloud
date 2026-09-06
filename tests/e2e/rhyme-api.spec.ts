import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type BrowserContext } from "@playwright/test";
import type { RhymeNoteRecord } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
interface Actors { alice: BrowserContext; bob: BrowserContext; aliceId: string; bobId: string }

const test = base.extend<{ actors: Actors }>({
  actors: async ({ browser }, use) => {
    const aliceId = randomUUID(), bobId = randomUUID();
    const aliceToken = `rhyme-api-alice-${randomUUID()}`, bobToken = `rhyme-api-bob-${randomUUID()}`;
    const contexts: BrowserContext[] = [];
    try {
      await withE2eDatabase(async (pool) => {
        for (const [id, token, name] of [[aliceId, aliceToken, "라임 API 앨리스"], [bobId, bobToken, "라임 API 밥"]]) {
          await pool.query("insert into app_users(id,status) values($1,'active')", [id]);
          await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, name]);
          await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), id]);
        }
      });
      const alice = await browser.newContext({ baseURL: origin }), bob = await browser.newContext({ baseURL: origin });
      contexts.push(alice, bob);
      await alice.addCookies([{ name: "lc_session", value: aliceToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await bob.addCookies([{ name: "lc_session", value: bobToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await use({ alice, bob, aliceId, bobId });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [[aliceId, bobId]]).then(() => undefined));
    }
  }
});

async function create(request: APIRequestContext, input: Record<string, unknown> = {}): Promise<RhymeNoteRecord> {
  const response = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "합성 라임 노트", body: "air\nchair", ...input } });
  expect(response.status()).toBe(201); expect(response.headers()["cache-control"]).toContain("no-store");
  return (await response.json()).rhyme as RhymeNoteRecord;
}

test.describe("rhyme note API", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("creates idempotently, validates exact text, edits metadata and manages normalized tags", async ({ actors }) => {
    const request = actors.alice.request;
    const requestId = randomUUID();
    const input = { requestId, title: "  라임 🎵  ", body: "한글\r\n<script>text only</script>", color: "blue" };
    const firstResponse = await request.post("/api/rhymes", { headers, data: input });
    expect(firstResponse.status()).toBe(201);
    const first = (await firstResponse.json()).rhyme as RhymeNoteRecord;
    expect(first).toMatchObject({ title: "라임 🎵", body: "한글\n<script>text only</script>", color: "blue", tags: [] });
    const replay = await request.post("/api/rhymes", { headers, data: input });
    expect(replay.status()).toBe(200); expect(await replay.json()).toMatchObject({ replayed: true, rhyme: { id: first.id } });
    const reused = await request.post("/api/rhymes", { headers, data: { ...input, title: "다른 제목" } });
    expect(reused.status()).toBe(409); expect(await reused.json()).toMatchObject({ error: { code: "CONFLICT" } });

    const update = await request.patch(`/api/rhymes/${first.id}`, { headers, data: { rowVersion: first.rowVersion, title: "수정 제목", isFavorite: true, isPinned: true, pinOrder: 0, color: "red" } });
    expect(update.status()).toBe(200);
    const changed = (await update.json()).rhyme as RhymeNoteRecord;
    expect(changed).toMatchObject({ title: "수정 제목", isFavorite: true, isPinned: true, pinOrder: 0, color: "red" });

    const tag = await request.post(`/api/rhymes/${first.id}/tags`, { headers, data: { value: "  FIRE\tTag " } });
    expect(tag.status()).toBe(200);
    const tagged = (await tag.json()).rhyme as RhymeNoteRecord;
    expect(tagged.tags).toHaveLength(1); expect(tagged.tags[0]).toMatchObject({ displayValue: "FIRE Tag", normalizedValue: "fire tag" });
    const duplicateTag = await request.post(`/api/rhymes/${first.id}/tags`, { headers, data: { value: "fire tag" } });
    expect((await duplicateTag.json()).rhyme.tags).toHaveLength(1);
    const removed = await request.delete(`/api/rhymes/${first.id}/tags/${tagged.tags[0]!.id}`, { headers });
    expect(removed.status()).toBe(200); expect(await removed.json()).toEqual({ removed: true });
    expect((await (await request.get(`/api/rhymes/${first.id}`)).json()).rhyme.tags).toEqual([]);

    const songResponse = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "연결할 %_ 곡" } });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    const candidates = await request.get(`/api/rhymes/${first.id}/songs?search=%25_&limit=20`);
    expect(candidates.status()).toBe(200);
    expect(await candidates.json()).toMatchObject({ items: [{ id: songId, title: "연결할 %_ 곡", isLinked: false }] });
    expect((await request.put(`/api/rhymes/${first.id}/songs/${songId}`, { headers })).status()).toBe(200);
    expect(await (await request.put(`/api/rhymes/${first.id}/songs/${songId}`, { headers })).json()).toEqual({ linked: true });
    expect((await (await request.get(`/api/rhymes/${first.id}/songs`)).json()).items[0]).toMatchObject({ id: songId, isLinked: true });
    expect((await (await request.get(`/api/rhymes?song=${songId}`)).json()).items).toHaveLength(1);
    expect(await (await request.delete(`/api/rhymes/${first.id}/songs/${songId}`, { headers })).json()).toEqual({ removed: true });
    expect(await (await request.delete(`/api/rhymes/${first.id}/songs/${songId}`, { headers })).json()).toEqual({ removed: false });
    expect((await (await request.get(`/api/rhymes?song=${songId}`)).json()).items).toEqual([]);

    const sync = await request.post(`/collaboration/documents/${first.id}`, { headers });
    expect(sync.ok()).toBe(true);
    const staleBody = await request.patch(`/api/rhymes/${first.id}`, { headers, data: { rowVersion: changed.rowVersion, body: "REST로 덮어쓰기 금지" } });
    expect(staleBody.status()).toBe(409);
  });

  test("rejects invalid, cross-owner, unauthenticated and wrong-origin mutations, then soft deletes", async ({ actors, request: anonymous }) => {
    for (const data of [
      { requestId: "bad", title: "제목" }, { requestId: randomUUID(), title: " " },
      { requestId: randomUUID(), title: "가".repeat(201) }, { requestId: randomUUID(), title: "제목", body: "나".repeat(100_001) }
    ]) {
      const response = await actors.alice.request.post("/api/rhymes", { headers, data });
      expect(response.status()).toBe(400); expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
    const rhyme = await create(actors.alice.request);
    const paths = [
      { method: "GET", path: `/api/rhymes/${rhyme.id}` },
      { method: "PATCH", path: `/api/rhymes/${rhyme.id}`, data: { rowVersion: rhyme.rowVersion, title: "침범" } },
      { method: "POST", path: `/api/rhymes/${rhyme.id}/tags`, data: { value: "침범" } },
      { method: "GET", path: `/api/rhymes/${rhyme.id}/songs` },
      { method: "DELETE", path: `/api/rhymes/${rhyme.id}` }
    ];
    for (const item of paths) {
      const unauth = await anonymous.fetch(item.path, { method: item.method, headers, data: item.data });
      expect(unauth.status()).toBe(401);
      const cross = await actors.bob.request.fetch(item.path, { method: item.method, headers, data: item.data });
      expect(cross.status()).toBe(item.method === "DELETE" ? 200 : 404);
      if (item.method !== "GET") expect((await actors.alice.request.fetch(item.path, { method: item.method, data: item.data })).status()).toBe(403);
    }
    const foreignSong = await actors.bob.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "다른 owner 곡" } });
    const foreignSongId = (await foreignSong.json()).song.id as string;
    expect((await actors.alice.request.put(`/api/rhymes/${rhyme.id}/songs/${foreignSongId}`, { headers })).status()).toBe(404);
    expect((await actors.alice.request.put(`/api/rhymes/${rhyme.id}/songs/${foreignSongId}`)).status()).toBe(403);
    expect((await actors.alice.request.get(`/api/rhymes/${rhyme.id}`)).status()).toBe(200);
    expect(await (await actors.alice.request.delete(`/api/rhymes/${rhyme.id}`, { headers })).json()).toEqual({ deleted: true });
    expect(await (await actors.alice.request.delete(`/api/rhymes/${rhyme.id}`, { headers })).json()).toEqual({ deleted: false });
    expect((await actors.alice.request.get(`/api/rhymes/${rhyme.id}`)).status()).toBe(404);
  });
});
