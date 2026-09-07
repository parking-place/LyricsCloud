import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const needle = "phase5 vertical needle";

test.describe("0.7.0 navigation release regression", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("searches a lyric, edits its Hook, and resumes the same section from recent work", async ({ context, page }, testInfo) => {
    test.setTimeout(100_000);
    const account = await createAccount(context, `탐색 수직 흐름 ${testInfo.project.name}`);
    try {
      const fixture = await createLyricFixture(page.request, "Phase 5 수직 흐름 곡", "Phase 5 수직 흐름 가사");
      await page.goto(`/search?q=${encodeURIComponent(needle)}&type=lyrics`);
      await page.getByRole("link", { name: /Phase 5 수직 흐름 가사/ }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.lyricId}`));
      await expect(page.getByRole("status").filter({ hasText: "검색 결과와 일치하는 첫 위치" })).toBeVisible();

      if (testInfo.project.name === "mobile") {
        await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /송폼 2/ }).click();
        await page.getByRole("dialog", { name: "송폼 이동" }).getByRole("button", { name: "Hook 구간으로 이동" }).click();
      } else {
        await page.getByRole("complementary", { name: "송폼 목차" }).getByRole("button", { name: "Hook 구간으로 이동" }).click();
      }
      const editor = page.locator(".cm-content");
      await expect(editor).toBeFocused();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText(" 이어쓰기 완료");
      await expect.poll(async () => {
        const response = await page.request.get(`/api/lyrics/${fixture.lyricId}`);
        return ((await response.json()).lyric.body as string).endsWith("이어쓰기 완료");
      }, { timeout: 20_000 }).toBe(true);
      await expect.poll(async () => {
        const response = await page.request.get("/api/recent?type=lyrics");
        const items = (await response.json()).items as Array<{ id: string; position: { songformLabel: string | null } | null }>;
        return items.find(({ id }) => id === fixture.lyricId)?.position?.songformLabel;
      }, { timeout: 10_000 }).toBe("Hook");

      await page.goto("/recent?type=lyrics");
      const card = page.locator(".recent-card", { hasText: "Phase 5 수직 흐름 가사" });
      await expect(card).toContainText("마지막 위치 · Hook");
      await card.getByRole("link", { name: "계속 편집 →" }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.lyricId}`));
      await expect(page.getByRole("status").filter({ hasText: /마지막 (Hook 구간|편집 위치)/ })).toBeVisible();
      await expect(editor).toContainText("이어쓰기 완료");
      await page.keyboard.insertText(" 복귀 위치 확인");
      await expect.poll(async () => {
        const response = await page.request.get(`/api/lyrics/${fixture.lyricId}`);
        return ((await response.json()).lyric.body as string).includes(`${needle} 복귀 위치 확인 이어쓰기 완료`);
      }, { timeout: 20_000 }).toBe(true);
    } finally {
      await deleteAccounts([account.userId]);
    }
  });

  test("restores a filtered pinned lyric URL in a separate mobile device context", async ({ browser, context, page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "cross-device contract runs once");
    const account = await createAccount(context, "탐색 새 기기 사용자");
    let mobile: BrowserContext | undefined;
    try {
      const fixture = await createLyricFixture(page.request, "Phase 5 필터 곡", "Phase 5 필터 가사");
      expect((await page.request.put(`/api/saved/${fixture.lyricId}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
      expect((await page.request.put(`/api/saved/${fixture.lyricId}/pin`, { headers, data: { value: true } })).status()).toBe(200);
      const deepLink = `/favorites?type=lyrics&scope=pinned&song=${fixture.songId}&status=revising`;
      await page.goto(deepLink);
      await expect(page.locator(".saved-card")).toHaveCount(1);
      await expect(page.locator(".saved-card")).toContainText("Phase 5 필터 가사");

      mobile = await browser.newContext({ baseURL: origin, viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
      await addSessionCookie(mobile, account.token);
      const fresh = await mobile.newPage();
      await fresh.goto(deepLink);
      await expect(fresh).toHaveURL(new RegExp(`type=lyrics.*scope=pinned.*song=${fixture.songId}.*status=revising`));
      await expect(fresh.locator(".saved-card")).toHaveCount(1);
      await expect(fresh.locator(".saved-card")).toContainText("Phase 5 필터 가사");
      expect(await fresh.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      await mobile?.close();
      await deleteAccounts([account.userId]);
    }
  });

  test("keeps search, recent work and saved resources isolated from another owner and deleted rows", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "data boundary contract runs once");
    const aliceContext = await browser.newContext({ baseURL: origin });
    const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "탐색 격리 앨리스");
    const bob = await createAccount(bobContext, "탐색 격리 밥");
    try {
      const aliceFixture = await createLyricFixture(aliceContext.request, `${needle} 앨리스 곡`, "앨리스 비공개 가사");
      const bobFixture = await createLyricFixture(bobContext.request, `${needle} 밥 곡`, "밥 비공개 가사");
      for (const [request, fixture] of [[aliceContext.request, aliceFixture], [bobContext.request, bobFixture]] as const) {
        expect((await request.put(`/api/saved/${fixture.songId}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
        expect((await request.post(`/api/recent/${fixture.songId}/open`, { headers })).status()).toBe(204);
      }

      await assertOnlyOwns(aliceContext.request, aliceFixture.songId, bobFixture.songId);
      await assertOnlyOwns(bobContext.request, bobFixture.songId, aliceFixture.songId);

      await withE2eDatabase((pool) => pool.query("update resources set deleted_at=clock_timestamp() where id=$1", [aliceFixture.songId]).then(() => undefined));
      const search = await aliceContext.request.get(`/api/search?q=${encodeURIComponent(needle)}&type=all`);
      expect((await search.json()).items).toEqual([]);
      expect((await (await aliceContext.request.get("/api/recent")).json()).items).toEqual([]);
      expect((await (await aliceContext.request.get("/api/saved")).json()).items).toEqual([]);
      expect((await bobContext.request.put(`/api/saved/${aliceFixture.songId}/favorite`, { headers, data: { value: true } })).status()).toBe(404);
    } finally {
      await Promise.all([aliceContext.close(), bobContext.close()]);
      await deleteAccounts([alice.userId, bob.userId]);
    }
  });

  test("captures stable loading, empty, failure, retry and empty-list states", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, `탐색 시각 상태 ${testInfo.project.name}`);
    let releaseLoading!: () => void;
    const loadingGate = new Promise<void>((resolve) => { releaseLoading = resolve; });
    let errorAttempts = 0;
    try {
      await page.goto("/recent");
      await expect(page.getByRole("heading", { name: "표시할 최근 작업이 없습니다." })).toBeVisible();
      await expect(page).toHaveScreenshot(`0.7.0-phase5-recent-empty-${testInfo.project.name}.png`);
      await page.goto("/favorites");
      await expect(page.getByRole("heading", { name: "표시할 자료가 없습니다." })).toBeVisible();
      await expect(page).toHaveScreenshot(`0.7.0-phase5-favorites-empty-${testInfo.project.name}.png`);

      await page.route("**/api/search?*", async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q");
        if (query === "visual loading") {
          await loadingGate;
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
        } else if (query === "visual error" && errorAttempts++ === 0) {
          await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        } else {
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [syntheticResult()], nextCursor: null }) });
        }
      });
      await page.goto("/search");
      const input = page.getByRole("searchbox", { name: "통합 검색어" });
      await input.fill("visual loading");
      await expect(page.locator(".search-results")).toHaveAttribute("aria-busy", "true");
      await expect(page).toHaveScreenshot(`0.7.0-phase5-search-loading-${testInfo.project.name}.png`);
      releaseLoading();
      await expect(page.getByRole("heading", { name: "검색 결과가 없습니다" })).toBeVisible();
      await expect(page).toHaveScreenshot(`0.7.0-phase5-search-empty-${testInfo.project.name}.png`);

      await input.fill("visual error");
      await expect(page.locator(".search-error")).toBeVisible();
      await expect(page).toHaveScreenshot(`0.7.0-phase5-search-error-${testInfo.project.name}.png`);
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.getByRole("heading", { name: "재시도 복구 결과" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      releaseLoading();
      await deleteAccounts([account.userId]);
    }
  });
});

async function assertOnlyOwns(request: APIRequestContext, ownId: string, foreignId: string) {
  const searchItems = (await (await request.get(`/api/search?q=${encodeURIComponent(needle)}&type=all`)).json()).items as Array<{ id: string }>;
  expect(searchItems.some(({ id }) => id === ownId)).toBe(true);
  expect(searchItems.some(({ id }) => id === foreignId)).toBe(false);
  const recentItems = (await (await request.get("/api/recent")).json()).items as Array<{ id: string }>;
  expect(recentItems.some(({ id }) => id === ownId)).toBe(true);
  expect(recentItems.some(({ id }) => id === foreignId)).toBe(false);
  const savedItems = (await (await request.get("/api/saved")).json()).items as Array<{ id: string }>;
  expect(savedItems.some(({ id }) => id === ownId)).toBe(true);
  expect(savedItems.some(({ id }) => id === foreignId)).toBe(false);
}

function syntheticResult() {
  return { id: randomUUID(), type: "song", title: "재시도 복구 결과", matchField: "title", preview: "재시도 복구 결과", linkedSongIds: [], score: 400, updatedAt: "2026-09-07T00:00:00.000Z" };
}

async function createLyricFixture(request: APIRequestContext, songTitle: string, lyricTitle: string) {
  const song = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: songTitle, status: "revising" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: lyricTitle, body: `[Verse]\n도입부\n\n[Hook]\n${needle}`, status: "revising"
  } });
  expect(lyric.status()).toBe(201);
  return { songId, lyricId: (await lyric.json()).lyric.id as string };
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `navigation-release-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await addSessionCookie(context, token);
  return { userId, token };
}

async function addSessionCookie(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
