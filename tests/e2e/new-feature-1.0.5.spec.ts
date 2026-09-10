import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.5 sub-songform and lyric copy guidance", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("shows a secondary suffix without changing navigation, undo, persistence, or exact copy", async ({ browser, context, page }, info) => {
    const owner = await account(context);
    const body = "[Verse: whisper]\n첫 줄\n[Verse: a:b]\n둘째 줄\n[ :legacy]\n호환 줄\nbroken [Hook]";
    const songId = await createSong(page, "1.0.5 서브 송폼 곡");
    const lyricId = await createLyric(page, songId, "서브 송폼 가사", body);
    await installClipboard(context);
    try {
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const marks = page.locator(".cm-songform-subtag");
      await expect(marks).toHaveCount(2);
      await expect(marks.nth(0)).toHaveText(": whisper");
      await expect(marks.nth(1)).toHaveText(": a:b");
      const firstSectionId = await page.locator(".cm-songform-line").first().getAttribute("data-songform-id");

      const outline = await songFormOutline(page, info.project.name.endsWith("mobile"));
      await expect(outline.getByRole("button", { name: "Verse 구간으로 이동" })).toContainText(": whisper");
      await expect(outline.getByRole("button", { name: "Verse 2번째 구간으로 이동" })).toContainText(": a:b");
      await expect(outline.getByRole("button", { name: ":legacy 구간으로 이동" })).toBeVisible();
      await outline.getByRole("checkbox", { name: "Verse 구간 선택" }).check();
      await outline.getByRole("button", { name: "선택 복사" }).click();
      await expect.poll(() => copied(page)).toBe("[Verse: whisper]\n첫 줄\n");
      if (info.project.name.endsWith("mobile")) await outline.getByRole("button", { name: "닫기" }).click();

      await wholeCopyButton(page, info.project.name.endsWith("mobile")).click();
      await expect.poll(() => copied(page)).toBe(body);

      const updated = body.replace(": whisper", ": 낮게");
      const editor = page.locator(".cm-content");
      await editor.fill(updated);
      await expect(page.locator(".cm-songform-subtag").first()).toHaveText(": 낮게");
      await expect(page.locator(".cm-songform-line").first()).toHaveAttribute("data-songform-id", firstSectionId!);
      await editor.press("Control+z");
      await expect(editor).toContainText("[Verse: whisper]");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.locator(".cm-content")).toContainText("[Verse: whisper]");

      const anonymous = await browser.newContext({ baseURL: origin });
      try {
        const denied = await anonymous.request.get(`/api/lyrics/${lyricId}`);
        expect([401, 404]).toContain(denied.status());
      } finally { await anonymous.close(); }
    } finally { await removeAccount(owner); }
  });

  test("warns at 3,001 final code points but keeps automatic and manual copy unblocked", async ({ context, page }, info) => {
    const owner = await account(context);
    const body = "🙂".repeat(3_001);
    const songId = await createSong(page, "1.0.5 긴 가사 곡");
    const lyricId = await createLyric(page, songId, "긴 가사", body);
    await installClipboard(context);
    try {
      await page.goto(`/lyrics/${lyricId}`);
      const mobile = info.project.name.endsWith("mobile");
      const copy = wholeCopyButton(page, mobile);
      if (mobile) await expect(copy).toContainText("3,001자");
      else await expect(page.locator(".editor-header-actions .lyric-copy-length")).toHaveText("3,001자");
      await copy.click();
      await expect.poll(() => copied(page)).toBe(body);
      await expect(page.getByRole("status").filter({ hasText: "3,000자 권장 기준" })).toBeVisible();

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: () => Promise.reject(new Error("denied"))
      } }));
      await copy.click();
      const manual = page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" });
      await expect(manual.getByText(/3,001자로 3,000자 권장 기준/)).toBeVisible();
      await expect(manual.getByRole("textbox", { name: "수동 복사할 가사" })).toHaveValue(body);
    } finally { await removeAccount(owner); }
  });

  test("defers a remote edit during Korean subtag composition and converges without corrupting navigation", async ({ browser, context, page }, info) => {
    test.skip(!["desktop", "chromium-desktop"].includes(info.project.name), "Chromium desktop composition event coverage");
    const other = await browser.newContext({ baseURL: origin });
    const owner = await account([context, other]);
    const initial = "[Verse: 시작]\n서버 기준";
    const songId = await createSong(page, "1.0.5 조합 송폼 곡");
    const lyricId = await createLyric(page, songId, "조합 송폼 가사", initial);
    const second = await other.newPage();
    try {
      await Promise.all([page.goto(`/lyrics/${lyricId}`), second.goto(`/lyrics/${lyricId}`)]);
      await Promise.all([page.getByText("방금 저장됨", { exact: true }).waitFor(), second.getByText("방금 저장됨", { exact: true }).waitFor()]);
      const editor = page.locator(".cm-content");
      await editor.dispatchEvent("compositionstart", { data: "ㅅ" });
      await editor.fill("[Verse: ㅎ]\n서버 기준");
      await page.waitForTimeout(150);
      expect((await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe(initial);

      await second.locator(".cm-content").press("Control+End");
      await second.keyboard.insertText("\n원격 입력");
      await expect.poll(async () => (await (await second.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toContain("원격 입력");
      await expect(editor).not.toContainText("원격 입력");

      await editor.fill("[Verse: 완성 한글]\n서버 기준");
      await editor.dispatchEvent("compositionend", { data: "한글" });
      await expect(editor).toContainText("원격 입력");
      await expect(second.locator(".cm-content")).toContainText("완성 한글");
      await expect.poll(() => editor.evaluate((node) => (node as HTMLElement).innerText))
        .toBe("[Verse: 완성 한글]\n서버 기준\n원격 입력");
      await expect(page.locator(".cm-songform-subtag")).toHaveText(": 완성 한글");
      await expect(page.getByRole("complementary", { name: "송폼 목차" }).getByRole("button", { name: "Verse 구간으로 이동" })).toContainText(": 완성 한글");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("[Verse: 완성 한글]\n서버 기준\n원격 입력");
    } finally { await other.close(); await removeAccount(owner); }
  });
});

async function songFormOutline(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: /송폼 3/ }).click();
  return mobile ? page.getByRole("dialog", { name: "송폼 이동" }) : page.getByRole("complementary", { name: "송폼 목차" });
}

function wholeCopyButton(page: Page, mobile: boolean) {
  return mobile
    ? page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /전체 복사/ })
    : page.locator(".editor-header-actions").getByRole("button", { name: "전체 복사", exact: true });
}

async function installClipboard(context: BrowserContext) {
  await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: (value: string) => { (window as typeof window & { copied?: string }).copied = value; return Promise.resolve(); }
  } }));
}

async function copied(page: Page) {
  return page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? "");
}

async function account(contextOrContexts: BrowserContext | readonly BrowserContext[]): Promise<string> {
  const contexts = Array.isArray(contextOrContexts) ? contextOrContexts : [contextOrContexts];
  const userId = randomUUID(); const token = `lyrics-105-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.5 가사 사용자')", [userId]);
    for (let index = 0; index < contexts.length; index += 1) {
      const sessionToken = index === 0 ? token : `${token}-${index}`;
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(sessionToken), userId]);
      await contexts[index]!.addCookies([{ name: "lc_session", value: sessionToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
    }
  });
  return userId;
}

async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201); return (await response.json()).song.id as string;
}

async function createLyric(page: Page, songId: string, title: string, body: string): Promise<string> {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201); return (await response.json()).lyric.id as string;
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
