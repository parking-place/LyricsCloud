import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const mutationHeaders = { Origin: origin };

test.describe("CodeMirror lyric editor", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for lyric editor integration");

  test("round-trips Korean, emoji, line breaks and literal HTML with undo and redo", async ({ context, page }) => {
    const account = await createAccount(context, "가사 편집 사용자");
    try {
      const { lyricId } = await createLyric(page, "<b>태그는 텍스트</b>\r\n[Verse]\r\n처음");
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true");
      await expect(editor).toContainText("<b>태그는 텍스트</b>");
      await expect(editor.locator("b")).toHaveCount(0);
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n한글 English 👩‍🎤");
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("<b>태그는 텍스트</b>\n[Verse]\n처음\n한글 English 👩‍🎤");

      await editor.press("Control+z");
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("<b>태그는 텍스트</b>\n[Verse]\n처음");
      await editor.press("Control+Shift+z");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toContain("한글 English 👩‍🎤");
    } finally { await deleteAccount(account.userId); }
  });

  test("does not save an intermediate title composition", async ({ context, page }) => {
    const account = await createAccount(context, "IME 편집 사용자");
    try {
      const { lyricId } = await createLyric(page, "본문");
      let patchCount = 0;
      await page.route(`**/api/lyrics/${lyricId}`, async (route) => {
        if (route.request().method() === "PATCH") patchCount += 1;
        await route.continue();
      });
      await page.goto(`/lyrics/${lyricId}`);
      const title = page.getByRole("textbox", { name: "가사 제목" });
      await title.evaluate((element) => element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "ㅎ" })));
      await title.fill("한글 조합 제목");
      await page.waitForTimeout(1_200);
      expect(patchCount).toBe(0);
      await title.evaluate((element) => element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "한글" })));
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      expect(patchCount).toBe(1);
    } finally { await deleteAccount(account.userId); }
  });

  test("keeps the current document after failure, retries, and never overlaps writes", async ({ context, page }) => {
    const account = await createAccount(context, "저장 실패 사용자");
    try {
      const { lyricId } = await createLyric(page, "시작");
      let failOnce = true;
      let active = 0;
      let maxActive = 0;
      await page.route(`**/api/lyrics/${lyricId}`, async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        active += 1;
        maxActive = Math.max(maxActive, active);
        await page.waitForTimeout(120);
        active -= 1;
        if (failOnce) { failOnce = false; return route.abort("internetdisconnected"); }
        return route.continue();
      });
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await editor.fill("실패해도 보존할 현재 입력");
      await expect(page.getByText("저장하지 못했습니다")).toBeVisible();
      await expect(editor).toContainText("실패해도 보존할 현재 입력");
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("실패해도 보존할 현재 입력");
      expect(maxActive).toBe(1);

      await page.goto(`/songs/${(await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.songId}`);
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.locator(".cm-editor")).toHaveCount(1);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await expect(editor).toBeVisible();
    } finally { await deleteAccount(account.userId); }
  });

  test("opens and edits a 100,000-character document without rendering every line", async ({ context, page }) => {
    const account = await createAccount(context, "장문 편집 사용자");
    try {
      const longBody = `[Verse]\n${"가".repeat(99_992)}`;
      const { lyricId } = await createLyric(page, longBody);
      const startedAt = Date.now();
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toBeVisible();
      expect(Date.now() - startedAt).toBeLessThan(5_000);
      await editor.click();
      await page.keyboard.press("Control+End");
      const patchResponsePromise = page.waitForResponse((response) =>
        response.request().method() === "PATCH" && response.url().endsWith(`/api/lyrics/${lyricId}`));
      await page.keyboard.press("Backspace");
      await page.keyboard.insertText("끝");
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.status(), await patchResponse.text()).toBe(200);
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body.slice(-2)).toBe("가끝");
    } finally { await deleteAccount(account.userId); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `lyric-editor-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
    await pool.query(`insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
      values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')`, [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function createLyric(page: Page, body: string) {
  const songResponse = await page.request.post("/api/songs", { headers: mutationHeaders,
    data: { requestId: randomUUID(), title: "편집기 합성 곡" } });
  expect(songResponse.status()).toBe(201);
  const songId = (await songResponse.json()).song.id as string;
  const lyricResponse = await page.request.post(`/api/songs/${songId}/lyrics`, { headers: mutationHeaders,
    data: { requestId: randomUUID(), title: "편집기 합성 가사", body } });
  expect(lyricResponse.status()).toBe(201);
  return { songId, lyricId: (await lyricResponse.json()).lyric.id as string };
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id = $1", [userId]).then(() => undefined));
}
