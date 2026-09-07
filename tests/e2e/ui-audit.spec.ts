import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const evidenceRoot = path.join(process.cwd(), "docs/runbooks/evidence/0.9.0-phase1");

const viewports = [
  { name: "pc", width: 1440, height: 1000, mobile: false },
  { name: "narrow-pc", width: 1024, height: 768, mobile: false },
  { name: "tablet", width: 768, height: 1024, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true }
] as const;

test.describe("0.9.0 UI audit baseline", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("captures all 15 mockup screens at the four canonical viewports", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the audit creates its own four viewport contexts");
    test.setTimeout(240_000);
    const setup = await browser.newContext({ baseURL: origin });
    const account = await createAccount(setup, "UI 감사 합성 사용자");
    const fixture = await seedFixture(setup.request, account.userId);
    await setup.close();

    const screens = [
      { id: "01-auth", path: "/auth?error=AUTH_PROVIDER_UNAVAILABLE", selector: ".auth-layout" },
      { id: "02-songs", path: "/songs", selector: ".songs-page" },
      { id: "03-song-form", path: "/songs/new", selector: ".song-form-page" },
      { id: "04-song-dashboard", path: `/songs/${fixture.songId}`, selector: ".dashboard-page" },
      { id: "05-lyrics-editor", path: `/lyrics/${fixture.lyricId}`, selector: ".lyric-editor-page" },
      { id: "06-rhyme-notes", path: "/rhymes", selector: ".rhymes-page" },
      { id: "07-rhyme-editor", path: `/rhymes/${fixture.rhymeId}`, selector: ".rhyme-editor-page" },
      { id: "08-prompts", path: "/prompts", selector: ".prompts-page" },
      { id: "09-prompt-editor", path: `/prompts/${fixture.promptId}`, selector: ".prompt-editor-page" },
      { id: "10-search", path: "/search?q=감사&type=all", selector: ".search-page" },
      { id: "11-recent", path: "/recent", selector: ".recent-page" },
      { id: "12-favorites", path: "/favorites", selector: ".favorites-page" },
      { id: "13-trash", path: "/trash", selector: ".trash-page" },
      { id: "14-templates", path: "/templates", selector: ".templates-page" },
      { id: "15-settings", path: "/settings", selector: ".settings-page" }
    ] as const;

    try {
      for (const viewport of viewports) {
        const directory = path.join(evidenceRoot, viewport.name);
        await mkdir(directory, { recursive: true });
        const context = await browser.newContext({
          baseURL: origin,
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.mobile,
          hasTouch: viewport.mobile,
          colorScheme: "dark",
          locale: "ko-KR",
          timezoneId: "Asia/Seoul",
          serviceWorkers: "block",
          reducedMotion: "reduce"
        });
        const page = await context.newPage();
        await freezeVisualMotion(page);

        for (const screen of screens) {
          if (screen.id === "02-songs") {
            await context.addCookies([{ name: "lc_session", value: account.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
          }
          const response = await page.goto(screen.path, { waitUntil: "domcontentloaded" });
          expect(response?.status(), `${viewport.name}/${screen.id}`).toBeLessThan(400);
          await expect(page.locator(screen.selector).last()).toBeVisible({ timeout: 20_000 });
          await waitForStableScreen(page, screen.id);
          await page.screenshot({ path: path.join(directory, `${screen.id}.png`), fullPage: true });
        }
        await context.close();
      }
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `ui-audit-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query(
      "insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')",
      [hashToken(token), userId]
    );
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, token };
}

async function seedFixture(request: APIRequestContext, userId: string) {
  const songTitle = "감사 기준 합성 곡";
  const song = await request.post("/api/songs", { headers, data: {
    requestId: randomUUID(), title: songTitle, description: "네 뷰포트에서 같은 내용을 확인하는 합성 설명",
    workNotes: "후렴의 리듬을 다시 확인하기", status: "revising", color: "blue", isFavorite: true, isPinned: true
  } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;

  const lyric = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "감사 기준 가사", body: "[Intro]\n합성 데이터로 시작해\n\n[Verse 1]\n개인 정보 없이 확인해\n\n[Hook]\n네 화면에서도 흐름을 이어가",
    memo: "두 번째 줄 호흡 확인", status: "revising"
  } });
  expect(lyric.status()).toBe(201);
  const lyricId = (await lyric.json()).lyric.id as string;

  const rhyme = await request.post("/api/rhymes", { headers, data: {
    requestId: randomUUID(), title: "감사 기준 라임", body: "flow / glow / know\n이어가 / 피어나 / 기억나", color: "green", isFavorite: true, isPinned: true
  } });
  expect(rhyme.status()).toBe(201);
  const rhymeId = (await rhyme.json()).rhyme.id as string;
  expect((await request.post(`/api/rhymes/${rhymeId}/tags`, { headers, data: { value: "합성" } })).status()).toBe(200);

  const prompt = await request.post("/api/prompts", { headers, data: {
    requestId: randomUUID(), title: "감사 기준 프롬프트", tokens: ["Warm pop", "Clear vocal", "Bright synth", "Mid tempo"]
  } });
  expect(prompt.status()).toBe(201);
  const promptId = (await prompt.json()).prompt.id as string;

  expect((await request.post(`/api/songs/${songId}/links`, { headers, data: { type: "rhyme_note", linkIds: [rhymeId], unlinkIds: [] } })).status()).toBe(200);
  expect((await request.post(`/api/songs/${songId}/links`, { headers, data: { type: "prompt", linkIds: [promptId], unlinkIds: [] } })).status()).toBe(200);
  for (const id of [songId, lyricId, rhymeId, promptId]) {
    expect((await request.put(`/api/saved/${id}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
    expect((await request.put(`/api/saved/${id}/pin`, { headers, data: { value: true } })).status()).toBe(200);
    expect((await request.post(`/api/recent/${id}/open`, { headers })).status()).toBe(204);
  }

  const template = await request.post("/api/templates", { headers, data: {
    requestId: randomUUID(), type: "lyrics", title: "감사 기준 송폼", lyricBody: "[Verse]\n\n[Hook]\n\n[Outro]"
  } });
  expect(template.status()).toBe(201);

  const deletedSong = await createSong(request, "휴지통 합성 곡");
  const deletedLyric = await createLyric(request, songId, "휴지통 합성 가사");
  const deletedRhyme = await createRhyme(request, "휴지통 합성 라임");
  const deletedPrompt = await createPrompt(request, "휴지통 합성 프롬프트");
  expect((await request.delete(`/api/songs/${deletedSong}`, { headers })).status()).toBe(200);
  expect((await request.delete(`/api/lyrics/${deletedLyric}`, { headers })).status()).toBe(200);
  expect((await request.delete(`/api/rhymes/${deletedRhyme}`, { headers })).status()).toBe(200);
  await withE2eDatabase(async (pool) => {
    await pool.query("update resources set deleted_at='2026-09-08T00:00:00Z' where id=$1 and owner_id=$2", [deletedPrompt, userId]);
    await pool.query("update resources set updated_at='2026-09-08T00:00:00Z' where owner_id=$1", [userId]);
  });
  return { songId, lyricId, rhymeId, promptId, songTitle };
}

async function createSong(request: APIRequestContext, title: string) {
  const response = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(request: APIRequestContext, songId: string, title: string) {
  const response = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body: "[Verse]\n합성 휴지통 본문" } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function createRhyme(request: APIRequestContext, title: string) {
  const response = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body: "합성 휴지통 본문" } });
  expect(response.status()).toBe(201);
  return (await response.json()).rhyme.id as string;
}

async function createPrompt(request: APIRequestContext, title: string) {
  const response = await request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens: ["Synthetic", "Archived"] } });
  expect(response.status()).toBe(201);
  return (await response.json()).prompt.id as string;
}

async function freezeVisualMotion(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
    document.documentElement.append(style);
  });
}

async function waitForStableScreen(page: import("@playwright/test").Page, id: string) {
  if (["02-songs", "06-rhyme-notes", "08-prompts", "10-search", "14-templates"].includes(id)) {
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
  }
  if (["05-lyrics-editor", "07-rhyme-editor"].includes(id)) {
    await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
  }
  if (id === "09-prompt-editor") await expect(page.locator("#prompt-title")).toBeEnabled({ timeout: 20_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(250);
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
