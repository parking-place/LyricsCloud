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
      await page.getByRole("textbox", { name: "가사 제목" }).fill("실패 후 재시도할 제목");
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

  test("merges same-owner tabs and restores an offline IndexedDB draft", async ({ context, page }) => {
    const account = await createAccount(context, "로컬 초안 사용자");
    const second = await context.newPage();
    try {
      const { lyricId } = await createLyric(page, "[Verse]\n서버 기준");
      await page.goto(`/lyrics/${lyricId}`);
      await second.goto(`/lyrics/${lyricId}`);
      await expect(page.locator(".cm-content")).toContainText("서버 기준");
      await expect(second.locator(".cm-content")).toContainText("서버 기준");
      await page.locator(".cm-content").fill("[Verse]\n첫 탭에서 확정한 한글");
      await expect(second.locator(".cm-content")).toContainText("첫 탭에서 확정한 한글");
      await second.close();

      await context.setOffline(true);
      await page.locator(".cm-content").fill("[Hook]\n오프라인에서도 남는 초안");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await context.setOffline(false);
      const recovered = await context.newPage();
      await recovered.goto(`/lyrics/${lyricId}`);
      await expect(recovered.locator(".cm-content")).toContainText("오프라인에서도 남는 초안");
      await expect.poll(async () => (await (await recovered.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("[Hook]\n오프라인에서도 남는 초안");
    } finally {
      if (!second.isClosed()) await second.close();
      await deleteAccount(account.userId);
    }
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
      await expect(editor).toHaveAttribute("contenteditable", "true");
      expect(Date.now() - startedAt).toBeLessThan(5_000);
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.press("Backspace");
      await page.keyboard.insertText("끝");
      await expect(page.getByText("방금 저장됨")).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body.slice(-2)).toBe("가끝");
    } finally { await deleteAccount(account.userId); }
  });

  test("recognizes repeated and custom song-form tags and navigates without changing the source", async ({ context, page }) => {
    const account = await createAccount(context, "송폼 탐색 사용자");
    try {
      const body = "머리말\n [Intro] \n시작\n[Hook]\n첫 후렴\n[Hook]\n두 번째 후렴\n[후렴 변주]\n끝\n[]\n문장 속 [Bridge]\n[Unclosed";
      const { lyricId } = await createLyric(page, body);
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.locator(".cm-songform-line")).toHaveCount(4);
      await expect(page.locator('[data-songform-label="Hook"]')).toHaveCount(2);

      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      if (mobile) await page.getByRole("button", { name: /송폼 4/ }).click();
      const navigation = mobile
        ? page.getByRole("dialog", { name: "송폼 이동" }).getByRole("navigation", { name: "인식된 송폼 구간" })
        : page.getByRole("complementary", { name: "송폼 목차" }).getByRole("navigation", { name: "인식된 송폼 구간" });
      await expect(navigation.getByRole("button")).toHaveCount(4);
      await expect(navigation.getByRole("button", { name: "후렴 변주 구간으로 이동" })).toBeVisible();
      await expect(navigation.getByRole("button", { name: /Bridge/ })).toHaveCount(0);
      await navigation.getByRole("button", { name: "Hook 2번째 구간으로 이동" }).click();
      await expect(page.locator(".cm-content")).toBeFocused();
      await expect(page.locator('.cm-content [data-songform-label="Hook"][data-songform-id$="-2"]')).toBeVisible();
      if (mobile) {
        await expect(page.getByRole("dialog", { name: "송폼 이동" })).toHaveCount(0);
        await page.getByRole("button", { name: /송폼 4/ }).click();
      }
      await expect(page.getByRole("button", { name: "Hook 2번째 구간으로 이동" })).toHaveAttribute("aria-current", "location");
      const stored = await (await page.request.get(`/api/lyrics/${lyricId}`)).json();
      expect(stored.lyric.body).toBe(body);
    } finally { await deleteAccount(account.userId); }
  });

  test("keeps hundreds of sections responsive and can reach the final repeated-free target", async ({ context, page }) => {
    const account = await createAccount(context, "장문 송폼 사용자");
    try {
      const body = Array.from({ length: 400 }, (_, index) => `[Verse ${index + 1}]\n${"가".repeat(220)}`).join("\n");
      const { lyricId } = await createLyric(page, body);
      const startedAt = Date.now();
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.locator(".cm-content")).toBeVisible();
      expect(Date.now() - startedAt).toBeLessThan(5_000);
      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      if (mobile) await page.getByRole("button", { name: /송폼 400/ }).click();
      const navigation = mobile
        ? page.getByRole("dialog", { name: "송폼 이동" }).getByRole("navigation", { name: "인식된 송폼 구간" })
        : page.getByRole("complementary", { name: "송폼 목차" }).getByRole("navigation", { name: "인식된 송폼 구간" });
      await navigation.getByRole("button", { name: "Verse 400 구간으로 이동" }).click();
      await expect(page.locator(".cm-content")).toBeFocused();
      await expect(page.locator(".cm-content").getByText("[Verse 400]", { exact: true })).toBeVisible();
    } finally { await deleteAccount(account.userId); }
  });

  test("copies the current document and selected sections in source order", async ({ context, page }) => {
    const account = await createAccount(context, "가사 복사 사용자");
    try {
      await installClipboardRecorder(page);
      const body = "머리말\n[Verse]\n첫 절\n\n[Hook]\n첫 후렴\n[Verse 2]\n둘째 절\n[Hook]\n마지막 후렴";
      const { lyricId } = await createLyric(page, body);
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      const current = `${body}\n저장 전 현재 입력`;
      await editor.fill(current);
      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      const tools = page.getByRole("group", { name: "가사 편집 도구" });
      await (mobile ? tools.getByRole("button", { name: /전체 복사/ }) : page.getByRole("button", { name: "전체 복사", exact: true })).click();
      await expect.poll(() => copiedText(page)).toBe(current);
      await expect(page.getByRole("status").filter({ hasText: "가사를 복사했습니다" })).toBeVisible();

      if (mobile) await tools.getByRole("button", { name: /송폼 4/ }).click();
      const region = mobile
        ? page.getByRole("dialog", { name: "송폼 이동" })
        : page.getByRole("complementary", { name: "송폼 목차" });
      await region.getByRole("checkbox", { name: "Hook 2번째 구간 선택" }).check();
      await region.getByRole("checkbox", { name: "Verse 구간 선택" }).check();
      await expect(region.getByText("2개 선택됨").first()).toBeVisible();
      await region.getByRole("button", { name: "선택 복사" }).click();
      await expect.poll(() => copiedText(page)).toBe("[Verse]\n첫 절\n\n[Hook]\n마지막 후렴\n저장 전 현재 입력");
      await expect(page.getByRole("status").filter({ hasText: "선택한 2개 구간을 복사했습니다" })).toBeVisible();
      await region.getByRole("button", { name: "선택 해제" }).click();
      await expect(region.getByText("0개 선택됨").first()).toBeVisible();
    } finally { await deleteAccount(account.userId); }
  });

  test("offers the identical selectable text when Clipboard is denied or unavailable", async ({ context, page }) => {
    const account = await createAccount(context, "수동 복사 사용자");
    try {
      const body = "[Verse]\n권한 실패에도\n\n그대로 보존";
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
      });
      const { lyricId } = await createLyric(page, body);
      await page.goto(`/lyrics/${lyricId}`);
      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      const copyButton = mobile
        ? page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /전체 복사/ })
        : page.getByRole("button", { name: "전체 복사", exact: true });
      await copyButton.click();
      const dialog = page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" });
      const textarea = dialog.getByRole("textbox", { name: "수동 복사할 가사" });
      await expect(textarea).toHaveValue(body);
      await expect(textarea).toBeFocused();
      expect(await textarea.evaluate((element) => ({ start: element.selectionStart, end: element.selectionEnd }))).toEqual({ start: 0, end: body.length });
      await dialog.getByRole("button", { name: "닫기" }).click();

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
      await copyButton.click();
      await expect(page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" }).getByRole("textbox")).toHaveValue(body);
    } finally { await deleteAccount(account.userId); }
  });

  test("keeps unsaved text, cursor focus and scroll while toggling focus mode and shortcuts", async ({ context, page }) => {
    const account = await createAccount(context, "집중 모드 사용자");
    try {
      await installClipboardRecorder(page);
      const body = Array.from({ length: 80 }, (_, index) => `[Verse ${index + 1}]\n줄 ${index + 1}`).join("\n");
      const { lyricId } = await createLyric(page, body);
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      const scroller = page.locator(".cm-scroller");
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n아직 저장 전인 문장");
      await scroller.evaluate((element) => { element.scrollTop = Math.max(1, element.scrollHeight - element.clientHeight - 24); });
      const beforeScroll = await scroller.evaluate((element) => element.scrollTop);
      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      const focusButton = mobile
        ? page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: "집중 모드" })
        : page.getByRole("button", { name: "집중 모드", exact: true });
      await focusButton.click();
      await expect(page.locator(".lyric-editor-page")).toHaveClass(/is-focus-mode/);
      await expect(editor).toContainText("아직 저장 전인 문장");
      await expect(editor).toBeFocused();
      const afterScroll = await scroller.evaluate((element) => element.scrollTop);
      expect(Math.abs(afterScroll - beforeScroll)).toBeLessThan(40);
      await page.keyboard.press("Alt+Shift+c");
      await expect.poll(() => copiedText(page)).toContain("아직 저장 전인 문장");
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", altKey: true, shiftKey: true, isComposing: true })));
      await expect(page.locator(".lyric-editor-page")).toHaveClass(/is-focus-mode/);
      await page.keyboard.press("Alt+Shift+f");
      await expect(page.locator(".lyric-editor-page")).not.toHaveClass(/is-focus-mode/);
      await expect(editor).toContainText("아직 저장 전인 문장");
      if (mobile) {
        for (const viewport of [{ width: 700, height: 390 }, { width: 390, height: 520 }]) {
          await page.setViewportSize(viewport);
          await expect(page.getByRole("group", { name: "가사 편집 도구" })).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
        }
      }
    } finally { await deleteAccount(account.userId); }
  });
});

async function installClipboardRecorder(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (text: string) => { (window as typeof window & { __copiedText?: string }).__copiedText = text; return Promise.resolve(); }
    } });
  });
}

async function copiedText(page: Page) {
  return page.evaluate(() => (window as typeof window & { __copiedText?: string }).__copiedText ?? "");
}

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
