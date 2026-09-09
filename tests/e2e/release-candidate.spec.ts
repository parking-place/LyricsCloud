import { createHash, randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.9.0 release candidate", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("opens all 15 product screens and preserves mobile back and rotation behavior", async ({ context, page }, testInfo) => {
    test.skip(testInfo.config.metadata.releaseCandidate0905 !== true, "runs in the dedicated five-browser release matrix");
    test.setTimeout(180_000);
    await page.goto("/auth?error=AUTH_PROVIDER_UNAVAILABLE");
    await expect(page.locator(".auth-layout")).toBeVisible();
    await expectSingleDocumentStructure(page);

    const account = await createAccount(context, `0.9 출시 후보 ${testInfo.project.name}`);
    try {
      const fixture = await seedFixture(page);
      const screens = [
        ["02-songs", "/songs", ".songs-page"],
        ["03-song-form", "/songs/new", ".song-form-page"],
        ["04-song-dashboard", `/songs/${fixture.songId}`, ".dashboard-page"],
        ["05-lyrics-editor", `/lyrics/${fixture.lyricId}`, ".lyric-editor-page"],
        ["06-rhyme-notes", "/rhymes", ".rhymes-page"],
        ["07-rhyme-editor", `/rhymes/${fixture.rhymeId}`, ".rhyme-editor-page"],
        ["08-prompts", "/prompts", ".prompts-page"],
        ["09-prompt-editor", `/prompts/${fixture.promptId}`, ".prompt-editor-page"],
        ["10-search", "/search?q=출시&type=all", ".search-page"],
        ["11-recent", "/recent", ".recent-page"],
        ["12-favorites", "/favorites", ".favorites-page"],
        ["13-trash", "/trash", ".trash-page"],
        ["14-templates", "/templates", ".templates-page"],
        ["15-settings", "/settings", ".settings-page"]
      ] as const;

      for (const [id, path, selector] of screens) {
        const response = await page.goto(path, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `${testInfo.project.name}/${id}`).toBeLessThan(400);
        await expect(page.locator(selector).last()).toBeVisible({ timeout: 20_000 });
        await waitForStableScreen(page, id);
        await expectSingleDocumentStructure(page);
      }

      if (testInfo.project.name.endsWith("mobile")) {
        await page.goto("/songs");
        await page.goto(`/songs/${fixture.songId}`);
        await page.goBack();
        await expect(page).toHaveURL(/\/songs$/);
        await page.setViewportSize({ width: 844, height: 390 });
        await expect(page.locator("main:visible")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      }
    } finally {
      await deleteAccount(account.userId);
    }
  });

  test("edits and manually copies a near-10000-line Korean document within the release budget", async ({ context, page }, testInfo) => {
    test.skip(testInfo.config.metadata.releaseCandidate0905 !== true, "runs in the dedicated five-browser release matrix");
    test.setTimeout(120_000);
    const account = await createAccount(context, `0.9 장문 ${testInfo.project.name}`);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) }
    }));
    try {
      const body = ["[Verse]", ...Array.from({ length: 9_998 }, (_, index) => `합성 ${index + 1}`)].join("\n");
      const lyricId = await createLyric(page, body);
      const startedAt = Date.now();
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
      const interactiveMs = Date.now() - startedAt;
      expect(interactiveMs).toBeLessThan(10_000);

      await editor.focus();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n한글 입력 끝");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });

      const mobile = testInfo.project.name.endsWith("mobile");
      const copy = mobile
        ? page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /전체 복사/ })
        : page.getByRole("button", { name: "전체 복사", exact: true });
      await copy.click();
      const fallback = page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" });
      const fallbackText = await fallback.getByRole("textbox", { name: "수동 복사할 가사" }).inputValue();
      expect(fallbackText.startsWith("[Verse]\n합성 1\n")).toBe(true);
      expect(fallbackText.endsWith("합성 9998\n한글 입력 끝")).toBe(true);
      expect(fallbackText.split("\n")).toHaveLength(10_000);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

      await testInfo.attach("near-10000-line-release-metrics", {
        contentType: "application/json",
        body: Buffer.from(JSON.stringify({
          browser: testInfo.project.name,
          interactiveMs,
          lines: 10_000,
          characters: body.length,
          sha256: createHash("sha256").update(fallbackText).digest("hex")
        }))
      });
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

async function expectSingleDocumentStructure(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main:visible")).toHaveCount(1);
}

async function waitForStableScreen(page: Page, id: string) {
  if (["02-songs", "04-song-dashboard", "06-rhyme-notes", "08-prompts", "10-search", "14-templates"].includes(id)) {
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
  }
  if (["05-lyrics-editor", "07-rhyme-editor"].includes(id)) {
    await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
  }
  if (id === "09-prompt-editor") await expect(page.locator("#prompt-title")).toBeEnabled({ timeout: 20_000 });
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `release-candidate-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query(
      "insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')",
      [hashToken(token), userId]
    );
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function seedFixture(page: Page) {
  const song = await page.request.post("/api/songs", { headers, data: {
    requestId: randomUUID(), title: "출시 후보 합성 곡", description: "브라우저 행렬 합성 설명", workNotes: "출시 후보 확인", status: "revising"
  } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyricId = await createLyric(page, "[Verse]\n출시 후보 한글 가사\n\n[Hook]\n브라우저 행렬 확인", songId);
  const rhyme = await page.request.post("/api/rhymes", { headers, data: {
    requestId: randomUUID(), title: "출시 후보 라임", body: "이어가 / 피어나"
  } });
  expect(rhyme.status()).toBe(201);
  const rhymeId = (await rhyme.json()).rhyme.id as string;
  const prompt = await page.request.post("/api/prompts", { headers, data: {
    requestId: randomUUID(), title: "출시 후보 프롬프트", tokens: ["Warm pop", "Clear vocal"]
  } });
  expect(prompt.status()).toBe(201);
  const promptId = (await prompt.json()).prompt.id as string;
  for (const resourceId of [songId, lyricId, rhymeId, promptId]) {
    expect((await page.request.put(`/api/saved/${resourceId}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
    expect((await page.request.post(`/api/recent/${resourceId}/open`, { headers })).status()).toBe(204);
  }
  return { songId, lyricId, rhymeId, promptId };
}

async function createLyric(page: Page, body: string, existingSongId?: string) {
  let songId = existingSongId;
  if (!songId) {
    const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: `장문 합성 곡 ${randomUUID().slice(0, 8)}` } });
    expect(song.status()).toBe(201);
    songId = (await song.json()).song.id as string;
  }
  const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "출시 후보 장문 가사", body, status: "revising"
  } });
  expect(lyric.status()).toBe(201);
  return (await lyric.json()).lyric.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
