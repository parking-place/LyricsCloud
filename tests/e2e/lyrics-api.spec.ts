import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type BrowserContext } from "@playwright/test";
import type { LyricRecord } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
interface Actors { alice: BrowserContext; bob: BrowserContext; aliceId: string; bobId: string }

const test = base.extend<{ actors: Actors }>({
  actors: async ({ browser }, use) => {
    const aliceId = randomUUID();
    const bobId = randomUUID();
    const aliceToken = `lyric-api-alice-${randomUUID()}`;
    const bobToken = `lyric-api-bob-${randomUUID()}`;
    const contexts: BrowserContext[] = [];
    try {
      await withE2eDatabase(async (pool) => {
        for (const [userId, token, displayName] of [
          [aliceId, aliceToken, "가사 API 앨리스"], [bobId, bobToken, "가사 API 밥"]
        ]) {
          await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
          await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
          await pool.query(`insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
            values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')`, [hashToken(token), userId]);
        }
      });
      const alice = await browser.newContext({ baseURL: origin });
      contexts.push(alice);
      const bob = await browser.newContext({ baseURL: origin });
      contexts.push(bob);
      await alice.addCookies([{ name: "lc_session", value: aliceToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await bob.addCookies([{ name: "lc_session", value: bobToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await use({ alice, bob, aliceId, bobId });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
      await withE2eDatabase(async (pool) => {
        await pool.query("delete from app_users where id = any($1::uuid[])", [[aliceId, bobId]]);
      });
    }
  }
});

async function createSong(request: APIRequestContext, title = "합성 가사 테스트 곡"): Promise<string> {
  const response = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(request: APIRequestContext, songId: string, data: Record<string, unknown> = {}): Promise<LyricRecord> {
  const response = await request.post(`/api/songs/${songId}/lyrics`, {
    headers, data: { requestId: randomUUID(), title: "합성 가사", ...data }
  });
  expect(response.status()).toBe(201);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const result = await response.json();
  expect(result.replayed).toBe(false);
  return result.lyric as LyricRecord;
}

async function getLyric(request: APIRequestContext, lyricId: string): Promise<LyricRecord> {
  const response = await request.get(`/api/lyrics/${lyricId}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return (await response.json()).lyric as LyricRecord;
}

async function assertCount(request: APIRequestContext, songId: string, count: number): Promise<void> {
  const detail = await request.get(`/api/songs/${songId}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ song: { lyricCount: count, counts: {
    lyrics: { value: count, available: true }, prompts: { value: 0, available: true }, rhymes: { value: 0, available: true }
  } } });
  const response = await request.get("/api/songs");
  expect(response.status()).toBe(200);
  const list = await response.json();
  expect(list.items.find((song: { id: string }) => song.id === songId)).toMatchObject({ lyricCount: count });
  expect(list.capabilities).toMatchObject({ lyricsSearch: true });
}

test.describe("independent lyric API contract", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for lyric API integration");

  test("Unicode and HTML remain exact text, same-title lyrics stay independent, and current versions protect updates", async ({ actors }) => {
    const request = actors.alice.request;
    const songId = await createSong(request);
    await assertCount(request, songId, 0);
    const body = "  [Verse]\r\n합성 한글 English 👩‍🎤 e\u0301\t\r\n\r\n[Hook]\n<script>globalThis.synthetic = true</script>\n<img src=x onerror=alert(1)> & < >\n  ";
    const memo = "  본문과 분리한 합성 작업 메모\n두 번째 줄  ";
    const first = await createLyric(request, songId, { title: "  같은 제목  ", body, memo, status: "revising" });
    const second = await createLyric(request, songId, { title: "같은 제목" });
    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({ songId, title: "같은 제목", body, memo, status: "revising", isFavorite: false, isPinned: false, pinOrder: null });
    expect(second).toMatchObject({ title: "같은 제목", body: "", memo: "", status: "draft" });
    const fetched = await getLyric(request, first.id);
    expect(Buffer.from(fetched.body, "utf8").equals(Buffer.from(body, "utf8"))).toBe(true);
    expect(fetched.memo).toBe(memo);
    await assertCount(request, songId, 2);

    const updatedBody = `${body}\n[Outro]\n합성 마지막 줄 🎵`;
    const response = await request.patch(`/api/lyrics/${first.id}`, { headers, data: {
      rowVersion: first.rowVersion, title: "수정한 첫 가사", body: updatedBody, memo: "수정 메모", status: "final",
      isFavorite: true, isPinned: true, pinOrder: 3
    } });
    expect(response.status()).toBe(200);
    const updated = (await response.json()).lyric as LyricRecord;
    expect(updated).toMatchObject({ title: "수정한 첫 가사", body: updatedBody, memo: "수정 메모", status: "final", isFavorite: true, isPinned: true, pinOrder: 3 });
    expect(updated.rowVersion).toBeGreaterThan(first.rowVersion);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(first.updatedAt).getTime());
    expect(await getLyric(request, second.id)).toMatchObject({ title: "같은 제목", body: "", memo: "", rowVersion: second.rowVersion });

    const stale = await request.patch(`/api/lyrics/${first.id}`, { headers, data: { rowVersion: first.rowVersion, body: "덮어쓰면 안 되는 오래된 내용" } });
    expect(stale.status()).toBe(409);
    expect(await stale.json()).toMatchObject({ error: { code: "VERSION_CONFLICT" } });
    expect(await getLyric(request, first.id)).toMatchObject({ body: updatedBody, rowVersion: updated.rowVersion });

    const listResponse = await request.get(`/api/songs/${songId}/lyrics`);
    expect(listResponse.status()).toBe(200);
    expect(listResponse.headers()["cache-control"]).toContain("no-store");
    const list = (await listResponse.json()).items as LyricRecord[];
    expect(list.map((lyric) => lyric.id)).toEqual([first.id, second.id]);
    const unpinned = await request.patch(`/api/lyrics/${first.id}`, { headers, data: {
      rowVersion: updated.rowVersion, isPinned: false, isFavorite: false, status: "on_hold"
    } });
    expect(unpinned.status()).toBe(200);
    expect((await unpinned.json()).lyric).toMatchObject({ isPinned: false, pinOrder: null, isFavorite: false, status: "on_hold" });
  });

  test("validation rejects invalid content and metadata without changing the stored current version", async ({ actors }) => {
    const request = actors.alice.request;
    const songId = await createSong(request);
    for (const invalid of [
      { requestId: "bad" }, { title: " " }, { title: "가".repeat(201) }, { body: "가".repeat(100_001) },
      { memo: "가".repeat(10_001) }, { body: { type: "doc", content: [] } }, { body: "invalid\u0000text" },
      { body: "\ud800" }, { status: "completed" }
    ]) {
      const response = await request.post(`/api/songs/${songId}/lyrics`, { headers,
        data: { requestId: randomUUID(), title: "검증용 합성 가사", ...invalid } });
      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
    await assertCount(request, songId, 0);
    const lyric = await createLyric(request, songId, { title: "🎵".repeat(200), body: "가".repeat(100_000), memo: "메".repeat(10_000) });
    expect((await getLyric(request, lyric.id)).body).toBe(lyric.body);
    for (const data of [
      { title: "토큰 누락" }, { rowVersion: 0, title: "잘못된 토큰" }, { rowVersion: lyric.rowVersion },
      { rowVersion: lyric.rowVersion, body: ["리치 텍스트 금지"] }, { rowVersion: lyric.rowVersion, memo: "메".repeat(10_001) },
      { rowVersion: lyric.rowVersion, isFavorite: "true" }, { rowVersion: lyric.rowVersion, isPinned: true, pinOrder: -1 },
      { rowVersion: lyric.rowVersion, pinOrder: 2 }
    ]) {
      const response = await request.patch(`/api/lyrics/${lyric.id}`, { headers, data });
      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
    expect(await getLyric(request, lyric.id)).toEqual(lyric);
    await assertCount(request, songId, 1);
  });

  test("concurrent creation and duplication each create one independent resource and replay safely", async ({ actors }) => {
    const request = actors.alice.request;
    const songId = await createSong(request);
    const createInput = { requestId: randomUUID(), title: "동시 생성 원본", body: "[Verse]\n합성 원본 🎵", memo: "보존할 메모", status: "revising" };
    const responses = await Promise.all(Array.from({ length: 4 }, () => request.post(`/api/songs/${songId}/lyrics`, { headers, data: createInput })));
    expect(responses.map((response) => response.status()).sort()).toEqual([200, 200, 200, 201]);
    const results = await Promise.all(responses.map((response) => response.json()));
    expect(new Set(results.map((result) => result.lyric.id)).size).toBe(1);
    expect(results.filter((result) => result.replayed === false)).toHaveLength(1);
    const original = results[0].lyric as LyricRecord;
    const replay = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: { ...createInput, title: "재전송으로 바뀌면 안 됨" } });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, lyric: { id: original.id, title: createInput.title } });

    const metadataResponse = await request.patch(`/api/lyrics/${original.id}`, { headers, data: {
      rowVersion: original.rowVersion, isFavorite: true, isPinned: true, pinOrder: 2
    } });
    expect(metadataResponse.status()).toBe(200);
    const source = (await metadataResponse.json()).lyric as LyricRecord;
    const duplicateInput = { requestId: randomUUID() };
    const duplicates = await Promise.all(Array.from({ length: 4 }, () => request.post(`/api/lyrics/${source.id}/duplicate`, { headers, data: duplicateInput })));
    expect(duplicates.map((response) => response.status()).sort()).toEqual([200, 200, 200, 201]);
    const copies = await Promise.all(duplicates.map((response) => response.json()));
    expect(new Set(copies.map((result) => result.lyric.id)).size).toBe(1);
    expect(copies.filter((result) => result.replayed === false)).toHaveLength(1);
    const copy = copies[0].lyric as LyricRecord;
    expect(copy.id).not.toBe(source.id);
    expect(copy).toMatchObject({ songId, title: `${source.title} (복사본)`, body: source.body, memo: source.memo, status: source.status,
      isFavorite: false, isPinned: false, pinOrder: null });
    const duplicateReplay = await request.post(`/api/lyrics/${source.id}/duplicate`, { headers, data: duplicateInput });
    expect(duplicateReplay.status()).toBe(200);
    expect(await duplicateReplay.json()).toMatchObject({ replayed: true, lyric: { id: copy.id } });
    expect(await getLyric(request, source.id)).toEqual(source);
    const editedCopy = await request.patch(`/api/lyrics/${copy.id}`, { headers, data: { rowVersion: copy.rowVersion, body: "복사본만 바뀐 합성 내용" } });
    expect(editedCopy.status()).toBe(200);
    expect((await getLyric(request, source.id)).body).toBe(source.body);
    await assertCount(request, songId, 2);

    // A request UUID belongs to its owner, so another account can reuse it safely.
    const bobSong = await createSong(actors.bob.request);
    const bobCopy = await createLyric(actors.bob.request, bobSong, createInput);
    expect(bobCopy.id).not.toBe(source.id);
    await assertCount(actors.bob.request, bobSong, 1);
  });

  test("all lyric routes enforce authentication, owner boundaries, and mutation origin checks", async ({ actors, request: anonymous }) => {
    const songId = await createSong(actors.alice.request);
    const lyric = await createLyric(actors.alice.request, songId, { body: "타 계정에 노출되면 안 되는 합성 원문" });
    const endpoints = [
      { method: "GET", path: `/api/songs/${songId}/lyrics` },
      { method: "POST", path: `/api/songs/${songId}/lyrics`, data: { requestId: randomUUID(), title: "교차 생성" } },
      { method: "GET", path: `/api/lyrics/${lyric.id}` },
      { method: "PATCH", path: `/api/lyrics/${lyric.id}`, data: { rowVersion: lyric.rowVersion, body: "교차 수정", isFavorite: true, isPinned: true } },
      { method: "DELETE", path: `/api/lyrics/${lyric.id}` },
      { method: "POST", path: `/api/lyrics/${lyric.id}/duplicate`, data: { requestId: randomUUID() } }
    ];
    for (const { method, path, ...options } of endpoints) {
      const unauthenticated = await anonymous.fetch(path, { method, headers, ...options });
      expect(unauthenticated.status()).toBe(401);
      expect(await unauthenticated.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
      const crossOwner = await actors.bob.request.fetch(path, { method, headers, ...options });
      expect(crossOwner.status()).toBe(method === "DELETE" ? 200 : 404);
      if (method === "DELETE") expect(await crossOwner.json()).toEqual({ deleted: false });
      else expect(await crossOwner.text()).not.toContain(lyric.body);
      if (method !== "GET") {
        expect((await actors.alice.request.fetch(path, { method, ...options })).status()).toBe(403);
        expect((await actors.alice.request.fetch(path, { method, headers: { Origin: "https://invalid.example" }, ...options })).status()).toBe(403);
      }
    }
    expect(await getLyric(actors.alice.request, lyric.id)).toEqual(lyric);
    await assertCount(actors.alice.request, songId, 1);
    const missingId = randomUUID();
    expect((await actors.alice.request.get(`/api/songs/${missingId}/lyrics`)).status()).toBe(404);
    expect((await actors.alice.request.post(`/api/songs/${missingId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "없는 곡" } })).status()).toBe(404);
    expect((await actors.alice.request.get(`/api/lyrics/${missingId}`)).status()).toBe(404);
    expect((await actors.alice.request.patch(`/api/lyrics/${missingId}`, { headers, data: { rowVersion: 1, title: "없는 가사" } })).status()).toBe(404);
    expect((await actors.alice.request.post(`/api/lyrics/${missingId}/duplicate`, { headers, data: { requestId: randomUUID() } })).status()).toBe(404);
    expect(await (await actors.alice.request.delete(`/api/lyrics/${missingId}`, { headers })).json()).toEqual({ deleted: false });
  });

  test("lyric deletion updates counts and song deletion hides only active children in its own deletion batch", async ({ actors }) => {
    const request = actors.alice.request;
    const songId = await createSong(request);
    const otherSongId = await createSong(request, "보존할 별도 곡");
    const first = await createLyric(request, songId);
    const second = await createLyric(request, songId);
    const third = await createLyric(request, songId);
    const unrelated = await createLyric(request, otherSongId);
    await assertCount(request, songId, 3);
    expect(await (await request.delete(`/api/lyrics/${first.id}`, { headers })).json()).toEqual({ deleted: true });
    expect(await (await request.delete(`/api/lyrics/${first.id}`, { headers })).json()).toEqual({ deleted: false });
    await assertCount(request, songId, 2);
    const list = await (await request.get(`/api/songs/${songId}/lyrics`)).json();
    expect(list.items.map((lyric: LyricRecord) => lyric.id).sort()).toEqual([second.id, third.id].sort());
    expect((await request.get(`/api/lyrics/${first.id}`)).status()).toBe(404);
    expect((await request.patch(`/api/lyrics/${first.id}`, { headers, data: { rowVersion: first.rowVersion, isFavorite: true } })).status()).toBe(404);
    expect((await request.post(`/api/lyrics/${first.id}/duplicate`, { headers, data: { requestId: randomUUID() } })).status()).toBe(404);
    const priorDeletion = await withE2eDatabase(async (pool) => (await pool.query(
      "select deleted_at::text, deletion_batch_id from resources where id = $1", [first.id]
    )).rows[0]);
    expect(priorDeletion.deleted_at).not.toBeNull();
    expect(priorDeletion.deletion_batch_id).not.toBeNull();

    expect(await (await request.delete(`/api/songs/${songId}`, { headers })).json()).toEqual({ deleted: true });
    expect(await (await request.delete(`/api/songs/${songId}`, { headers })).json()).toEqual({ deleted: false });
    for (const lyricId of [second.id, third.id]) {
      expect((await request.get(`/api/lyrics/${lyricId}`)).status()).toBe(404);
      expect((await request.patch(`/api/lyrics/${lyricId}`, { headers, data: { rowVersion: 1, body: "삭제 뒤 수정" } })).status()).toBe(404);
      expect((await request.post(`/api/lyrics/${lyricId}/duplicate`, { headers, data: { requestId: randomUUID() } })).status()).toBe(404);
      expect(await (await request.delete(`/api/lyrics/${lyricId}`, { headers })).json()).toEqual({ deleted: false });
    }
    expect((await request.get(`/api/songs/${songId}/lyrics`)).status()).toBe(404);
    expect((await request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "삭제 뒤 생성" } })).status()).toBe(404);
    expect(await getLyric(request, unrelated.id)).toEqual(unrelated);
    await assertCount(request, otherSongId, 1);

    await withE2eDatabase(async (pool) => {
      const result = await pool.query("select id, deleted_at::text, deletion_batch_id from resources where id = any($1::uuid[])",
        [[songId, first.id, second.id, third.id, unrelated.id]]);
      expect(result.rows).toHaveLength(5);
      const parent = result.rows.find((row) => row.id === songId);
      expect(parent.deletion_batch_id).toEqual(expect.any(String));
      for (const lyricId of [second.id, third.id]) {
        expect(result.rows.find((row) => row.id === lyricId)).toMatchObject({ deleted_at: parent.deleted_at, deletion_batch_id: parent.deletion_batch_id });
      }
      expect(result.rows.find((row) => row.id === first.id)).toMatchObject(priorDeletion);
      expect(priorDeletion.deletion_batch_id).not.toBe(parent.deletion_batch_id);
      expect(result.rows.find((row) => row.id === unrelated.id)).toMatchObject({ deleted_at: null, deletion_batch_id: null });
      const integrity = await pool.query(`select
        (select count(*) from lyrics l left join resources r on r.id = l.resource_id where r.id is null)::integer as orphan_lyrics,
        (select count(*) from resources r left join lyrics l on l.resource_id = r.id where r.type = 'lyrics' and l.resource_id is null)::integer as orphan_resources`);
      expect(integrity.rows[0]).toEqual({ orphan_lyrics: 0, orphan_resources: 0 });
    });
  });
});
