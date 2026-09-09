import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const needle = "phase2 needle";

test.describe("0.7.0 unified private search", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("search and recent-search APIs preserve owner boundaries and mutation policy", async ({ browser, request: anonymous }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract only needs one browser project");
    const aliceContext = await browser.newContext({ baseURL: origin });
    const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "검색 API 앨리스");
    const bob = await createAccount(bobContext, "검색 API 밥");
    try {
      const fixture = await createSearchFixture(aliceContext.request);
      const response = await aliceContext.request.get(`/api/search?q=${encodeURIComponent(needle)}&type=all&limit=20`);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      const result = await response.json();
      expect(new Set(result.items.map((item: { type: string }) => item.type))).toEqual(new Set(["song", "lyrics", "rhyme_note", "prompt"]));
      expect(result.items.find((item: { id: string }) => item.id === fixture.lyricId)).toMatchObject({ matchField: "body" });

      expect((await bobContext.request.get(`/api/search?q=${encodeURIComponent(needle)}&type=all`)).status()).toBe(200);
      expect((await (await bobContext.request.get(`/api/search?q=${encodeURIComponent(needle)}&type=all`)).json()).items).toEqual([]);
      expect((await anonymous.get(`/api/search?q=${encodeURIComponent(needle)}`)).status()).toBe(401);

      const recorded = await aliceContext.request.post("/api/search/recent", { headers, data: { query: `  ${needle.toUpperCase()}  `, type: "lyrics" } });
      expect(recorded.status()).toBe(201);
      const recentId = (await recorded.json()).item.id as string;
      const refreshed = await aliceContext.request.post("/api/search/recent", { headers, data: { query: needle, type: "lyrics" } });
      expect((await refreshed.json()).item.id).toBe(recentId);
      expect((await (await aliceContext.request.get("/api/search/recent")).json()).items).toHaveLength(1);
      expect((await (await bobContext.request.get("/api/search/recent")).json()).items).toEqual([]);
      expect((await bobContext.request.delete(`/api/search/recent/${recentId}`, { headers })).status()).toBe(204);
      expect((await (await aliceContext.request.get("/api/search/recent")).json()).items).toHaveLength(1);
      expect((await aliceContext.request.delete("/api/search/recent", { headers: { Origin: "https://foreign.example" } })).status()).toBe(403);
      expect((await aliceContext.request.delete("/api/search/recent", { headers })).status()).toBe(204);
      expect((await (await aliceContext.request.get("/api/search/recent")).json()).items).toEqual([]);
    } finally {
      await Promise.all([aliceContext.close(), bobContext.close()]);
      await deleteAccounts([alice.userId, bob.userId]);
    }
  });

  test("debounces requests and keeps loading, empty, failure and stale responses deterministic", async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "request-state timing only needs one browser project");
    const account = await createAccount(context, "검색 상태 사용자");
    try {
      await page.goto("/search");
      const input = page.getByRole("searchbox", { name: "통합 검색어" });
      let slowRequested = false;
      await page.route("**/api/search?*", async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q");
        if (query === "slow first") {
          slowRequested = true;
          await new Promise((resolve) => setTimeout(resolve, 900));
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [syntheticResult("오래된 응답")], nextCursor: null }) }).catch(() => undefined);
        } else if (query === "fast second") {
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [syntheticResult("빠른 응답")], nextCursor: null }) });
        } else if (query === "empty result") {
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
        } else if (query === "failed result") {
          await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        } else await route.continue();
      });

      await input.fill("slow first");
      await expect.poll(() => slowRequested).toBe(true);
      await expect(page.locator(".search-results")).toHaveAttribute("aria-busy", "true");
      await input.fill("fast second");
      await expect(page.getByRole("heading", { name: "빠른 응답" })).toBeVisible();
      await page.waitForTimeout(1_000);
      await expect(page.getByRole("heading", { name: "오래된 응답" })).toHaveCount(0);

      await input.fill("empty result");
      await expect(page.getByRole("heading", { name: "검색 결과가 없습니다" })).toBeVisible();
      await input.fill("failed result");
      await expect(page.locator(".search-error")).toContainText("검색 결과를 불러오지 못했습니다");
      await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    } finally { await deleteAccounts([account.userId]); }
  });

  test("opens every resource type, restores URL and scroll, focuses lyric text, and manages recent searches", async ({ browser, context, page }, testInfo) => {
    test.setTimeout(100_000);
    if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 780 });
    const account = await createAccount(context, `검색 화면 ${testInfo.project.name}`);
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, "검색 화면 다른 사용자");
    try {
      const fixture = await createSearchFixture(page.request);
      await page.goto(`/search?q=${encodeURIComponent(needle)}`);
      await expect(page.getByRole("heading", { name: "통합 검색" })).toBeVisible();
      for (const label of ["곡", "가사", "라임 노트", "프롬프트"]) {
        await expect(page.getByRole("heading", { name: new RegExp(`^${label} `) })).toBeVisible();
      }
      await expect(page.getByText("<script>window.phase2Executed=true</script>", { exact: false })).toBeVisible();
      expect(await page.evaluate(() => (window as typeof window & { phase2Executed?: boolean }).phase2Executed ?? false)).toBe(false);
      expect(await page.locator("script").allTextContents()).not.toContain("window.phase2Executed=true");

      for (const [group, path] of [["곡", "/songs/"], ["라임 노트", "/rhymes/"], ["프롬프트", "/prompts/"]] as const) {
        const link = page.getByRole("heading", { name: new RegExp(`^${group} `) }).locator("..").getByRole("link").first();
        await link.click();
        await expect(page).toHaveURL(new RegExp(path));
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`/search\\?q=phase2\\+needle`));
      }

      await Promise.all(Array.from({ length: 24 }, (_, index) => createSong(page.request, `${needle} 스크롤 곡 ${String(index).padStart(2, "0")}`)));
      await page.reload();
      await expect(page.getByRole("button", { name: "검색 결과 더 보기" })).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: 320 }));
      await page.getByRole("heading", { name: /^곡 / }).locator("..").getByRole("link").last().click();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/search\\?q=phase2\\+needle`));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(300);

      await page.getByRole("button", { name: "가사", exact: true }).click();
      await expect(page).toHaveURL(/type=lyrics/);
      const input = page.getByRole("searchbox", { name: "통합 검색어" });
      await input.focus();
      await page.keyboard.press("ArrowDown");
      const lyricLink = page.getByRole("heading", { name: new RegExp(`^가사 `) }).locator("..").getByRole("link").first();
      await expect(lyricLink).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(input).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      await expect(input).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.lyricId}`));
      await expect(page.getByRole("status").filter({ hasText: "검색 결과와 일치하는 첫 위치" })).toBeVisible();
      await expect(page.locator(".cm-content")).toBeFocused();
      if (testInfo.project.name === "desktop") {
        await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe(needle);
      }
      await page.goBack();
      await expect(page).toHaveURL(/type=lyrics/);
      await expect(input).toHaveValue(needle);

      await page.request.post("/api/search/recent", { headers, data: { query: "recent private", type: "prompt" } });
      await page.goto("/search");
      const recent = page.getByRole("button", { name: /recent private/ }).first();
      await expect(recent).toBeVisible();
      const secondDevice = await context.newPage();
      if (testInfo.project.name === "desktop") await secondDevice.setViewportSize({ width: 360, height: 780 });
      await secondDevice.goto("/search");
      await expect(secondDevice.getByRole("button", { name: /recent private/ }).first()).toBeVisible();
      await secondDevice.close();
      await expect((await (await otherContext.request.get("/api/search/recent")).json()).items).toEqual([]);
      await recent.click();
      await expect(page).toHaveURL(/q=recent\+private.*type=prompt/);
      await page.getByRole("button", { name: "검색어 지우기" }).click();
      await expect(page.getByRole("button", { name: /recent private/ }).first()).toBeVisible();
      await page.getByRole("button", { name: "최근 검색어 recent private 지우기" }).click();
      await expect(page.getByRole("button", { name: /recent private/ })).toHaveCount(0);

      await page.goto(`/songs/${fixture.songId}`);
      await expect(page.getByRole("heading", { name: "요청한 자료를 열 수 없습니다" })).toHaveCount(0);
      await page.goto(`/songs/${other.foreignSongId ?? randomUUID()}`);
      await expect(page.getByRole("heading", { name: "요청한 자료를 열 수 없습니다" })).toBeVisible();
      await expect(page.getByText("다른 사용자의 비밀 제목", { exact: true })).toHaveCount(0);
      await page.goto("/lyrics/not-a-valid-id");
      await expect(page.getByRole("heading", { name: "요청한 자료를 열 수 없습니다" })).toBeVisible();
    } finally {
      await Promise.all([otherContext.close()]);
      await deleteAccounts([account.userId, other.userId]);
    }
  });
});

function syntheticResult(title: string) {
  return { id: randomUUID(), type: "song", title, matchField: "title", preview: title, linkedSongIds: [], score: 400, updatedAt: new Date().toISOString() };
}

async function createSearchFixture(request: APIRequestContext) {
  const songId = await createSong(request, `${needle} 대표 곡`);
  const lyricResponse = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "본문 딥링크 가사", body: `[Verse]\n앞부분\n\n[Hook (2)]\n${needle} <script>window.phase2Executed=true</script>`
  } });
  expect(lyricResponse.status()).toBe(201);
  const lyricId = (await lyricResponse.json()).lyric.id as string;
  const rhymeResponse = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: `${needle} 라임`, body: "air chair" } });
  expect(rhymeResponse.status()).toBe(201);
  const promptResponse = await request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title: `${needle} 프롬프트`, tokens: ["cinematic", needle] } });
  expect(promptResponse.status()).toBe(201);
  return { songId, lyricId };
}

async function createSong(request: APIRequestContext, title: string) {
  const response = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `unified-search-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const foreignSongId = displayName.includes("다른 사용자") ? await createSong(context.request, "다른 사용자의 비밀 제목") : undefined;
  return { userId, foreignSongId };
}

async function deleteAccounts(userIds: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [userIds]).then(() => undefined));
}
