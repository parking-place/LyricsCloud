import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000"; const headers = { Origin: origin };

test.describe("0.7.0 unified favorites and pins", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps saved metadata content-free, owner private and atomically ordered", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract runs once");
    const aliceContext = await browser.newContext({ baseURL: origin }); const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "저장 앨리스"); const bob = await createAccount(bobContext, "저장 밥");
    try {
      const fixture = await createFixture(aliceContext.request);
      for (const id of Object.values(fixture)) expect((await aliceContext.request.put(`/api/saved/${id}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
      for (const id of [fixture.songId, fixture.lyricId, fixture.promptId]) expect((await aliceContext.request.put(`/api/saved/${id}/pin`, { headers, data: { value: true } })).status()).toBe(200);
      expect((await bobContext.request.put(`/api/saved/${fixture.songId}/favorite`, { headers, data: { value: true } })).status()).toBe(404);
      expect((await aliceContext.request.put(`/api/saved/${fixture.songId}/favorite`, { headers: { Origin: "https://foreign.example" }, data: { value: false } })).status()).toBe(403);

      const order = [fixture.promptId, fixture.songId, fixture.lyricId];
      expect((await aliceContext.request.put("/api/saved/pins/order", { headers, data: { ids: order } })).status()).toBe(200);
      expect((await bobContext.request.put("/api/saved/pins/order", { headers, data: { ids: order } })).status()).toBe(409);
      const concurrent = await Promise.all([
        aliceContext.request.put("/api/saved/pins/order", { headers, data: { ids: [...order].reverse() } }),
        aliceContext.request.put("/api/saved/pins/order", { headers, data: { ids: order } })
      ]);
      expect(concurrent.map((item) => item.status())).toEqual([200, 200]);
      const response = await aliceContext.request.get(`/api/saved?type=all&scope=all&song=${fixture.songId}&status=all`);
      expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store");
      const items = (await response.json()).items as Array<Record<string, unknown>>;
      expect(new Set(items.map((item) => item.type))).toEqual(new Set(["song", "lyrics", "rhyme_note", "prompt"]));
      const pinned = items.filter((item) => item.isPinned);
      expect(new Set(pinned.map((item) => item.id))).toEqual(new Set(order));
      expect(pinned.map((item) => item.pinOrder).sort()).toEqual([0, 1, 2]);
      expect(JSON.stringify(items)).not.toContain("비공개 본문");
      for (const item of items) { expect(item).not.toHaveProperty("body"); expect(item).not.toHaveProperty("memo"); }
      expect((await (await aliceContext.request.get(`/api/songs/${fixture.songId}`)).json()).song).toMatchObject({ isFavorite: true, isPinned: true });
      expect((await (await aliceContext.request.get(`/api/lyrics/${fixture.lyricId}`)).json()).lyric).toMatchObject({ isFavorite: true, isPinned: true });
      expect((await (await aliceContext.request.get(`/api/rhymes/${fixture.rhymeId}`)).json()).rhyme).toMatchObject({ isFavorite: true, isPinned: false });
      expect((await (await aliceContext.request.get(`/api/prompts/${fixture.promptId}`)).json()).prompt).toMatchObject({ isFavorite: true, isPinned: true });
      expect((await (await bobContext.request.get("/api/saved")).json()).items).toEqual([]);

      await withE2eDatabase((pool) => pool.query("update resources set deleted_at=clock_timestamp() where id=$1", [fixture.rhymeId]).then(() => undefined));
      expect(((await (await aliceContext.request.get("/api/saved")).json()).items as Array<{ id: string }>).some(({ id }) => id === fixture.rhymeId)).toBe(false);
      await withE2eDatabase((pool) => pool.query("update resources set deleted_at=null where id=$1", [fixture.rhymeId]).then(() => undefined));
      expect(((await (await aliceContext.request.get("/api/saved")).json()).items as Array<{ id: string }>).some(({ id }) => id === fixture.rhymeId)).toBe(true);
    } finally { await Promise.all([aliceContext.close(), bobContext.close()]); await deleteAccounts([alice.userId, bob.userId]); }
  });

  test("filters deep links and preserves accessible pin order", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, `저장 화면 ${testInfo.project.name}`);
    try {
      const fixture = await createFixture(page.request);
      for (const id of Object.values(fixture)) await page.request.put(`/api/saved/${id}/favorite`, { headers, data: { value: true } });
      for (const id of [fixture.songId, fixture.lyricId, fixture.promptId]) await page.request.put(`/api/saved/${id}/pin`, { headers, data: { value: true } });
      await page.goto("/favorites");
      await expect(page.getByRole("heading", { name: "즐겨찾기", exact: true })).toBeVisible();
      await expect(page.locator(".pinned-grid .saved-card")).toHaveCount(3);
      await expect(page.locator(".favorite-list .saved-card")).toHaveCount(1);
      await page.getByRole("link", { name: "가사", exact: true }).click();
      await expect(page).toHaveURL(/type=lyrics/); await expect(page.locator(".saved-card")).toHaveCount(1);
      await page.goto("/favorites");
      const first = page.locator(".pinned-grid .saved-card").first(); const firstTitle = await first.getByRole("heading").textContent();
      await first.getByRole("button", { name: /뒤로 이동/ }).click();
      await expect(page.getByRole("status")).toContainText("핀 순서를 저장했습니다");
      const fresh = await context.newPage(); await fresh.goto("/favorites");
      await expect(fresh.locator(".pinned-grid .saved-card").nth(1).getByRole("heading")).toHaveText(firstTitle!); await fresh.close();
      await expect(first).toHaveAttribute("draggable", "true");
      if (testInfo.project.name === "desktop") {
        let release!: () => void; let reached!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; }); const intercepted = new Promise<void>((resolve) => { reached = resolve; });
        await page.route(`**/api/saved/${fixture.songId}/favorite`, async (route) => { reached(); await gate; await route.continue(); }, { times: 1 });
        const card = page.locator(".saved-card", { hasText: "저장 곡" });
        await card.getByRole("button", { name: "저장 곡 즐겨찾기 해제" }).click(); await intercepted;
        await card.getByRole("button", { name: "저장 곡 즐겨찾기 설정" }).click();
        await card.getByRole("button", { name: "저장 곡 즐겨찾기 해제" }).click(); release();
        await expect.poll(async () => ((await (await page.request.get(`/api/songs/${fixture.songId}`)).json()).song.isFavorite)).toBe(false);
      }
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function createFixture(request: APIRequestContext) {
  const song = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "저장 곡", workNotes: "비공개 본문 메모", status: "revising" } });
  expect(song.status()).toBe(201); const songId = (await song.json()).song.id as string;
  const lyric = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "저장 가사", body: "비공개 본문 가사", memo: "비공개 본문 메모", status: "revising" } });
  expect(lyric.status()).toBe(201); const lyricId = (await lyric.json()).lyric.id as string;
  const rhyme = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "저장 라임", body: "비공개 본문 라임" } });
  expect(rhyme.status()).toBe(201); const rhymeId = (await rhyme.json()).rhyme.id as string;
  const prompt = await request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title: "저장 프롬프트", tokens: ["비공개 본문 프롬프트"] } });
  expect(prompt.status()).toBe(201); const promptId = (await prompt.json()).prompt.id as string;
  expect((await request.post(`/api/songs/${songId}/links`, { headers, data: { type: "rhyme_note", linkIds: [rhymeId], unlinkIds: [] } })).status()).toBe(200);
  expect((await request.post(`/api/songs/${songId}/links`, { headers, data: { type: "prompt", linkIds: [promptId], unlinkIds: [] } })).status()).toBe(200);
  return { songId, lyricId, rhymeId, promptId };
}
async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `saved-${randomUUID()}`;
  await withE2eDatabase(async (pool) => { await pool.query("insert into app_users(id,status) values($1,'active')", [userId]); await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]); await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]); });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); return { userId };
}
async function deleteAccounts(ids: readonly string[]) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined)); }
