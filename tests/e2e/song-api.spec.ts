import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fixtureUsers, hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("song API owner and command contract", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song API integration");

  test("create replay, CRUD, metadata, list cursor, and soft delete stay owner-scoped", async ({ browser }, testInfo) => {
    const aliceUserId = randomUUID();
    const bobUserId = randomUUID();
    const aliceToken = `song-api-alice-${randomUUID()}`;
    const bobToken = `song-api-bob-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      for (const [userId, token, displayName] of [
        [aliceUserId, aliceToken, "곡 API 앨리스"],
        [bobUserId, bobToken, "곡 API 밥"]
      ]) {
        await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
        await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
        await pool.query(`
          insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
          values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')
        `, [hashToken(token), userId]);
      }
    });
    const alice = await browser.newContext({ baseURL: origin });
    const bob = await browser.newContext({ baseURL: origin });
    await alice.addCookies([{ name: "lc_session", value: aliceToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
    await bob.addCookies([{ name: "lc_session", value: bobToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const marker = `${testInfo.project.name}-${randomUUID().slice(0, 8)}`;
    const requestId = randomUUID();
    const createBody = { requestId, title: ` API 곡 ${marker} `, workNotes: "100%_literal", status: "idea" };

    const csrf = await alice.request.post("/api/songs", { data: createBody });
    expect(csrf.status()).toBe(403);
    const invalid = await alice.request.post("/api/songs", {
      headers: { Origin: origin }, data: { requestId: "bad", title: " " }
    });
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).error).toMatchObject({
      code: "VALIDATION_FAILED",
      issues: expect.arrayContaining([{ field: "requestId", code: "uuid_required" }, { field: "title", code: "required" }])
    });

    const createdResponse = await alice.request.post("/api/songs", { headers: { Origin: origin }, data: createBody });
    expect(createdResponse.status()).toBe(201);
    expect(createdResponse.headers()["cache-control"]).toContain("no-store");
    const created = await createdResponse.json();
    expect(created).toMatchObject({ replayed: false, song: { title: `API 곡 ${marker}`, lyricCount: 0 } });
    const songId = created.song.id as string;

    const replay = await alice.request.post("/api/songs", {
      headers: { Origin: origin }, data: { ...createBody, title: "바뀌면 안 됨" }
    });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({ replayed: true, song: { id: songId, title: `API 곡 ${marker}` } });

    expect((await bob.request.get(`/api/songs/${songId}`)).status()).toBe(404);
    expect((await bob.request.patch(`/api/songs/${songId}`, {
      headers: { Origin: origin }, data: { title: "침범" }
    })).status()).toBe(404);
    expect((await bob.request.put(`/api/songs/${songId}/favorite`, {
      headers: { Origin: origin }, data: { value: true }
    })).status()).toBe(404);

    const updated = await alice.request.patch(`/api/songs/${songId}`, {
      headers: { Origin: origin },
      data: { title: `수정 곡 ${marker}`, description: "합성 설명", workNotes: "합성 메모", status: "revising" }
    });
    expect(updated.status()).toBe(200);
    expect(await updated.json()).toMatchObject({ song: { title: `수정 곡 ${marker}`, status: "revising" } });
    for (const [path, data, expected] of [
      ["favorite", { value: true }, { isFavorite: true }],
      ["pin", { value: true, pinOrder: 2 }, { isPinned: true, pinOrder: 2 }],
      ["color", { value: "red" }, { color: "red" }]
    ] as const) {
      const response = await alice.request.put(`/api/songs/${songId}/${path}`, { headers: { Origin: origin }, data });
      expect(response.status()).toBe(200);
      expect((await response.json()).song).toMatchObject(expected);
    }

    for (let index = 0; index < 3; index += 1) {
      const response = await alice.request.post("/api/songs", {
        headers: { Origin: origin },
        data: { requestId: randomUUID(), title: `목록 ${marker} ${index}`, status: index === 0 ? "completed" : "idea" }
      });
      expect(response.status()).toBe(201);
    }
    const firstPage = await alice.request.get(`/api/songs?search=${encodeURIComponent(marker)}&sort=title_asc&limit=2`);
    expect(firstPage.status()).toBe(200);
    const first = await firstPage.json();
    expect(first.totalCount).toBe(4);
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(first.capabilities).toEqual({ lyricsSearch: true, linkedResourceFilters: false });
    const second = await (await alice.request.get(
      `/api/songs?search=${encodeURIComponent(marker)}&sort=title_asc&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`
    )).json();
    expect(second.items).toHaveLength(2);
    expect(new Set([...first.items, ...second.items].map((song: { id: string }) => song.id)).size).toBe(4);

    const detail = await alice.request.get(`/api/songs/${songId}`);
    expect(await detail.json()).toMatchObject({
      song: { counts: { lyrics: { value: 0, available: true }, prompts: { value: 0, available: true }, rhymes: { value: 0, available: true } } }
    });

    const rhymeResponse = await alice.request.post("/api/rhymes", { headers: { Origin: origin }, data: {
      requestId: randomUUID(), title: `연결 API 라임 ${marker}`, body: "literal 100%_candidate"
    } });
    expect(rhymeResponse.status()).toBe(201);
    const rhymeId = (await rhymeResponse.json()).rhyme.id as string;
    const promptResponse = await alice.request.post("/api/prompts", { headers: { Origin: origin }, data: {
      requestId: randomUUID(), title: `연결 API 프롬프트 ${marker}`, tokens: ["cinematic", "candidate token"]
    } });
    expect(promptResponse.status()).toBe(201);
    const promptId = (await promptResponse.json()).prompt.id as string;
    const candidates = await alice.request.get(`/api/songs/${songId}/links?type=rhyme_note&state=unlinked&search=${encodeURIComponent("%_candidate")}`);
    expect(candidates.status()).toBe(200);
    expect(candidates.headers()["cache-control"]).toContain("no-store");
    expect(await candidates.json()).toMatchObject({ totalCount: 1, items: [{ id: rhymeId, isLinked: false }] });
    expect((await alice.request.get(`/api/songs/${songId}/links?type=lyrics`)).status()).toBe(400);
    expect((await alice.request.post(`/api/songs/${songId}/links`, { data: { type: "rhyme_note", linkIds: [rhymeId], unlinkIds: [] } })).status()).toBe(403);
    expect((await bob.request.get(`/api/songs/${songId}/links?type=rhyme_note`)).status()).toBe(404);
    expect((await bob.request.post(`/api/songs/${songId}/links`, { headers: { Origin: origin }, data: {
      type: "rhyme_note", linkIds: [rhymeId], unlinkIds: []
    } })).status()).toBe(404);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const linked = await alice.request.post(`/api/songs/${songId}/links`, { headers: { Origin: origin }, data: {
        type: "rhyme_note", linkIds: [rhymeId, rhymeId], unlinkIds: []
      } });
      expect(linked.status()).toBe(200);
      expect(await linked.json()).toEqual({ linkedIds: [rhymeId], unlinkedIds: [] });
    }
    expect(await (await alice.request.get(`/api/songs/${songId}/links?type=rhyme_note&state=linked`)).json())
      .toMatchObject({ totalCount: 1, items: [{ id: rhymeId, isLinked: true }] });
    expect((await alice.request.post(`/api/songs/${songId}/links`, { headers: { Origin: origin }, data: {
      type: "prompt", linkIds: [promptId], unlinkIds: []
    } })).status()).toBe(200);
    expect(await (await alice.request.get(`/api/songs/${songId}`)).json()).toMatchObject({ song: { counts: {
      lyrics: { value: 0, available: true }, prompts: { value: 1, available: true }, rhymes: { value: 1, available: true }
    } } });
    expect(await (await alice.request.post(`/api/songs/${songId}/links`, { headers: { Origin: origin }, data: {
      type: "rhyme_note", linkIds: [], unlinkIds: [rhymeId]
    } })).json()).toEqual({ linkedIds: [], unlinkedIds: [rhymeId] });
    expect((await alice.request.get(`/api/rhymes/${rhymeId}`)).status()).toBe(200);

    expect(await (await bob.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: false });
    expect(await (await alice.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: true });
    expect(await (await alice.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: false });
    expect((await alice.request.get(`/api/songs/${songId}`)).status()).toBe(404);

    await alice.close();
    await bob.close();
    await withE2eDatabase((pool) => pool.query("delete from app_users where id = any($1::uuid[])", [[aliceUserId, bobUserId]]).then(() => undefined));
  });

  test("unauthenticated requests fail without exposing song data", async ({ request }) => {
    const response = await request.get(`/api/songs?ownerId=${fixtureUsers.alice.id}`);
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
    const links = await request.get(`/api/songs/${randomUUID()}/links?type=prompt`);
    expect(links.status()).toBe(401);
    expect(await links.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });
});
