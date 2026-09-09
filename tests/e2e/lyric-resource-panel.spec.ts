import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("lyric editor resource panel", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("returns the same owner-only contract for all four tabs", async ({ browser, context, page }) => {
    const alice = await createAccount(context, "자료 패널 앨리스");
    const bobContext = await browser.newContext({ baseURL: origin });
    const bob = await createAccount(bobContext, "자료 패널 밥");
    try {
      const fixture = await seedPanel(page);
      await createSong(bobContext.pages()[0] ?? await bobContext.newPage(), "다른 소유자 곡");
      const foreignPage = bobContext.pages()[0]!;
      await createRhyme(foreignPage, "다른 소유자 라임", "owner-secret");

      const songs = await readPanel(page, fixture.lyricId, "songs", "all");
      expect(songs).toMatchObject({ tab: "songs", scope: "all" });
      expect(songs.items.map((item: { id: string }) => item.id)).toContain(fixture.otherSongId);
      expect(songs.items.map((item: { id: string }) => item.id)).not.toContain(fixture.songId);

      const lyrics = await readPanel(page, fixture.lyricId, "lyrics", "linked");
      expect(lyrics.scope).toBe("all");
      expect(lyrics.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: fixture.lyricId, kind: "lyrics", availability: "current", status: "draft" }),
        expect.objectContaining({ id: fixture.otherLyricId, preview: expect.stringContaining("검색 가능한 다른 가사") })
      ]));

      const linkedRhymes = await readPanel(page, fixture.lyricId, "rhymes", "linked");
      expect(linkedRhymes.items).toEqual([expect.objectContaining({ id: fixture.linkedRhymeId, isLinked: true })]);
      const allRhymes = await readPanel(page, fixture.lyricId, "rhymes", "all", "needle-rhyme");
      expect(allRhymes.items).toEqual([expect.objectContaining({ id: fixture.unlinkedRhymeId, isLinked: false })]);
      expect(JSON.stringify(allRhymes)).not.toContain("owner-secret");

      const linkedPrompts = await readPanel(page, fixture.lyricId, "prompts", "linked");
      expect(linkedPrompts.items).toEqual([expect.objectContaining({ id: fixture.linkedPromptId, isLinked: true })]);
      expect((await bobContext.request.get(`/api/lyrics/${fixture.lyricId}/resources?tab=songs`)).status()).toBe(404);
      expect((await page.request.get(`/api/lyrics/${fixture.lyricId}/resources?tab=unsafe`)).status()).toBe(400);

      expect((await page.request.delete(`/api/rhymes/${fixture.unlinkedRhymeId}`, { headers })).status()).toBe(200);
      const afterDelete = await readPanel(page, fixture.lyricId, "rhymes", "all");
      expect(afterDelete.items.map((item: { id: string }) => item.id)).not.toContain(fixture.unlinkedRhymeId);
    } finally {
      await bobContext.close();
      await deleteAccounts([alice.userId, bob.userId]);
    }
  });

  test("preserves draft, selection and panel state across tabs, close and focus mode", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, "자료 패널 상태 사용자");
    try {
      const fixture = await seedPanel(page, 8);
      let failPromptOnce = true;
      await page.route(`**/api/lyrics/${fixture.lyricId}/resources?*`, async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get("tab") === "prompts" && failPromptOnce) {
          failPromptOnce = false;
          return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        }
        return route.continue();
      });
      await page.goto(`/lyrics/${fixture.lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const mobile = testInfo.project.name === "mobile";
      if (mobile) await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /≋ 다른 가사 .*자료/ }).click();
      const panel = mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
      await expect(panel).toBeVisible();
      await expect(panel.getByRole("tab", { name: "다른 가사" })).toHaveAttribute("aria-selected", "true");
      await expect(panel.getByText("검색 가능한 다른 가사 본문")).toBeVisible();

      await panel.getByRole("tab", { name: "다른 가사" }).focus();
      await panel.getByRole("tab", { name: "다른 가사" }).press("ArrowRight");
      await expect(panel.getByRole("tab", { name: "라임" })).toHaveAttribute("aria-selected", "true");
      await expect(panel.getByText("연결 라임")).toBeVisible();
      await panel.getByRole("button", { name: "전체 자료" }).click();
      const search = panel.getByRole("textbox", { name: "라임 검색" });
      await search.fill("needle-rhyme");
      await expect(panel.getByText("연결 안 된 라임")).toBeVisible();
      await panel.getByRole("tab", { name: "프롬프트" }).click();
      await expect(panel.getByText("자료를 불러오지 못했습니다")).toBeVisible();
      await panel.getByRole("button", { name: "다시 시도" }).click();
      await expect(panel.getByText("연결 프롬프트")).toBeVisible();

      await panel.getByRole("tab", { name: "라임" }).click();
      await expect(search).toHaveValue("needle-rhyme");
      const editor = page.locator(".cm-content");
      await editor.fill("[Verse]\n패널 뒤에도 남는 초안Z");
      await editor.focus();
      await page.keyboard.press("Control+End");
      await page.keyboard.press("Shift+ArrowLeft");

      if (mobile) {
        await search.fill("");
        await expect(panel.getByText("긴 목록 라임 7")).toBeVisible();
        await page.setViewportSize({ width: 360, height: 420 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
        await expect(panel.locator(".editor-resource-results")).toBeVisible();
        expect(await panel.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
        await panel.getByRole("button", { name: "닫기" }).click();
      } else {
        const width = panel.getByRole("slider", { name: "패널 너비" });
        await width.fill("344");
        await panel.getByRole("button", { name: "패널 접기" }).click();
        await page.getByRole("button", { name: "집중 모드", exact: true }).click();
        await page.getByRole("button", { name: "집중 모드 종료", exact: true }).click();
        await page.getByRole("button", { name: "자료 패널 펼치기" }).click();
        await expect(panel.getByRole("tab", { name: "라임" })).toHaveAttribute("aria-selected", "true");
        await expect(panel.getByRole("textbox", { name: "라임 검색" })).toHaveValue("needle-rhyme");
        await expect(width).toHaveValue("344");
        await panel.getByRole("button", { name: "패널 접기" }).click();
      }
      await expect(editor).toBeFocused();
      await page.keyboard.insertText("X");
      await expect(editor).toContainText("패널 뒤에도 남는 초안X");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${fixture.lyricId}`)).json()).lyric.body)
        .toBe("[Verse]\n패널 뒤에도 남는 초안X");
    } finally { await deleteAccounts([account.userId]); }
  });

  test("checks a target before switching and keeps the current page when it was deleted", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, "자료 전환 사용자");
    try {
      const fixture = await seedPanel(page);
      await page.goto(`/lyrics/${fixture.lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const mobile = testInfo.project.name === "mobile";
      if (mobile) await page.getByRole("button", { name: /≋ 다른 가사 .*자료/ }).click();
      const panel = mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
      await panel.getByRole("tab", { name: "라임" }).click();
      await panel.getByRole("button", { name: "전체 자료" }).click();
      await expect(panel.getByText("연결 안 된 라임")).toBeVisible();
      await page.request.delete(`/api/rhymes/${fixture.unlinkedRhymeId}`, { headers });
      const card = panel.locator("li", { hasText: "연결 안 된 라임" });
      await card.getByRole("button", { name: "자료 열기" }).click();
      await expect(page.getByRole("status").filter({ hasText: "삭제되었거나" })).toBeVisible();
      await expect(card.getByText("삭제됨", { exact: true })).toBeVisible();
      await expect(card.getByRole("button", { name: "자료 열기" })).toBeDisabled();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.lyricId}`));

      await panel.getByRole("tab", { name: "다른 가사" }).click();
      const other = panel.locator("li", { hasText: "다른 가사 버전" });
      await expect(other.getByRole("link", { name: "새 창에서 열기" })).toHaveAttribute("target", "_blank");
      await page.locator(".cm-content").fill("전환 전에 저장할 현재 초안");
      await other.getByRole("button", { name: "이 가사로 전환" }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.otherLyricId}`));
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${fixture.lyricId}`)).json()).lyric.body)
        .toBe("전환 전에 저장할 현재 초안");
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function seedPanel(page: Page, extraRhymes = 0) {
  const songId = await createSong(page, "현재 편집 곡");
  const lyricId = await createLyric(page, songId, "현재 가사", "[Verse]\n현재 본문");
  const otherLyricId = await createLyric(page, songId, "다른 가사 버전", "검색 가능한 다른 가사 본문", "revising");
  const otherSongId = await createSong(page, "다른 작업 곡");
  const linkedRhymeId = await createRhyme(page, "연결 라임", "linked rhyme body");
  const unlinkedRhymeId = await createRhyme(page, "연결 안 된 라임", "needle-rhyme body");
  await page.request.put(`/api/rhymes/${linkedRhymeId}/songs/${songId}`, { headers });
  for (let index = 0; index < extraRhymes; index += 1) await createRhyme(page, `긴 목록 라임 ${index}`, `scroll body ${index}`);
  const linkedPromptId = await createPrompt(page, "연결 프롬프트", ["linked", "female vocal"]);
  const unlinkedPromptId = await createPrompt(page, "전체 프롬프트", ["owner", "all"]);
  await page.request.put(`/api/prompts/${linkedPromptId}/songs/${songId}`, { headers });
  return { songId, lyricId, otherLyricId, otherSongId, linkedRhymeId, unlinkedRhymeId, linkedPromptId, unlinkedPromptId };
}

async function readPanel(page: Page, lyricId: string, tab: string, scope: string, search = "") {
  const params = new URLSearchParams({ tab, scope, ...(search ? { search } : {}) });
  const response = await page.request.get(`/api/lyrics/${lyricId}/resources?${params}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json();
}

async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(page: Page, songId: string, title: string, body: string, status = "draft"): Promise<string> {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body, status } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function createRhyme(page: Page, title: string, body: string): Promise<string> {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).rhyme.id as string;
}

async function createPrompt(page: Page, title: string, tokens: readonly string[]): Promise<string> {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens } });
  expect(response.status()).toBe(201);
  return (await response.json()).prompt.id as string;
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `resource-panel-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
