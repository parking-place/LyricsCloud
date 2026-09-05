import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fixtureTokens, fixtureUsers } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("song API owner and command contract", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song API integration");

  test("create replay, CRUD, metadata, list cursor, and soft delete stay owner-scoped", async ({ browser }, testInfo) => {
    const alice = await browser.newContext({ baseURL: origin });
    const bob = await browser.newContext({ baseURL: origin });
    await alice.addCookies([{ name: "lc_session", value: fixtureTokens.alice, url: origin, httpOnly: true, sameSite: "Lax" }]);
    await bob.addCookies([{ name: "lc_session", value: fixtureTokens.bob, url: origin, httpOnly: true, sameSite: "Lax" }]);
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
    expect(first.capabilities).toEqual({ lyricsSearch: false, linkedResourceFilters: false });
    const second = await (await alice.request.get(
      `/api/songs?search=${encodeURIComponent(marker)}&sort=title_asc&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`
    )).json();
    expect(second.items).toHaveLength(2);
    expect(new Set([...first.items, ...second.items].map((song: { id: string }) => song.id)).size).toBe(4);

    const detail = await alice.request.get(`/api/songs/${songId}`);
    expect(await detail.json()).toMatchObject({
      song: { counts: { lyrics: { value: 0, available: false }, prompts: { value: 0, available: false }, rhymes: { value: 0, available: false } } }
    });

    expect(await (await bob.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: false });
    expect(await (await alice.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: true });
    expect(await (await alice.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } })).json()).toEqual({ deleted: false });
    expect((await alice.request.get(`/api/songs/${songId}`)).status()).toBe(404);

    await alice.close();
    await bob.close();
  });

  test("unauthenticated requests fail without exposing song data", async ({ request }) => {
    const response = await request.get(`/api/songs?ownerId=${fixtureUsers.alice.id}`);
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });
});
