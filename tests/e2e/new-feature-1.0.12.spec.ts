import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.12 integrated personal creative flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps song, lyric, rhyme insertion, sentence prompt copy, and Suno link across re-entry", async ({ context, page }, info) => {
    test.setTimeout(120_000);
    const userId = await account(context);
    const mobile = info.project.name === "mobile" || info.project.name.endsWith("-mobile");
    const sentence = "  cinematic pop. 한글 두  칸과 🙂를 그대로.  ";
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as typeof window & { copied?: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      await page.goto("/songs?sort=title_asc");
      await page.getByRole("link", { name: "첫 곡 만들기" }).click();
      await page.getByLabel("곡 제목").fill("1.0.12 수직 창작 곡");
      await page.getByRole("radio", { name: /가사 작성 중/ }).check();
      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+\?returnTo=/);
      const songId = new URL(page.url()).pathname.split("/").at(-1)!;

      await page.getByRole("button", { name: "첫 가사 작성" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+\?returnTo=/);
      const lyricId = new URL(page.url()).pathname.split("/").at(-1)!;
      const editor = page.locator(".cm-content");
      const initialBody = "[Verse: 낮은 시작]\n처음 한글 줄\n\n[Hook]\n기억할 후렴\n[Extend: 3:00:24]\n작업 메모";
      await page.getByRole("textbox", { name: "가사 제목" }).fill("1.0.12 통합 가사");
      await editor.fill(initialBody);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });

      const rhymeId = await createRhyme(page, "1.0.12 연결 라임", "별빛처럼 이어지는 라임");
      const promptId = await createSentence(page, "1.0.12 문장 프롬프트", sentence);
      expect((await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers })).status()).toBe(200);
      expect((await page.request.put(`/api/prompts/${promptId}/songs/${songId}`, { headers })).status()).toBe(200);

      await editor.focus();
      await page.keyboard.press("Control+End");
      let panel = await resourcePanel(page, mobile);
      await panel.getByRole("tab", { name: "라임" }).click();
      await panel.locator("li", { hasText: "1.0.12 연결 라임" }).getByRole("button", { name: "전체 삽입" }).click();
      await expect(editor).toContainText("작업 메모별빛처럼 이어지는 라임");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();

      panel = await resourcePanel(page, mobile);
      await panel.getByRole("tab", { name: "프롬프트" }).click();
      await panel.locator("li", { hasText: "1.0.12 문장 프롬프트" }).getByRole("button", { name: "복사", exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? "")).toBe(sentence);

      if (mobile) await panel.getByRole("button", { name: "닫기" }).click();
      await page.getByRole("link", { name: "← 1.0.12 수직 창작 곡" }).click();
      const suno = page.locator(".suno-panel");
      await suno.getByRole("button", { name: "첫 링크 추가" }).click();
      const dialog = page.getByRole("dialog", { name: "Suno 작업 링크 추가" });
      const sunoUrl = "https://suno.com/song/61212121-1212-4121-8121-121212121212";
      await dialog.getByLabel("Suno URL").fill(sunoUrl);
      await dialog.getByLabel("표시 제목").fill("통합 생성 결과");
      await dialog.getByRole("button", { name: "링크 저장" }).click();
      const link = suno.locator(".suno-link-card").getByRole("link", { name: /통합 생성 결과/ });
      await expect(link).toHaveAttribute("href", sunoUrl);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);

      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("textbox", { name: "가사 제목" })).toHaveValue("1.0.12 통합 가사");
      await expect(editor).toContainText("별빛처럼 이어지는 라임");
      await page.getByRole("button", { name: "전체 복사", exact: true }).first().click();
      await expect.poll(() => page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? ""))
        .toContain("[Verse: 낮은 시작]\n처음 한글 줄");
      await expect.poll(() => page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? ""))
        .not.toContain("[Extend: 3:00:24]");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    } finally {
      await removeAccount(userId);
    }
  });

  test("keeps owner boundaries and exposes recoverable loading failures", async ({ browser, context, page }) => {
    test.setTimeout(60_000);
    const owner = await account(context);
    const outsiderContext = await browser.newContext({ baseURL: origin });
    const outsider = await account(outsiderContext);
    try {
      const songId = await createSong(page, "1.0.12 owner 곡");
      const lyricId = await createLyric(page, songId, "1.0.12 owner 가사", "owner-only 원문");
      expect((await outsiderContext.request.get(`/api/lyrics/${lyricId}`)).status()).toBe(404);

      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      const mobile = page.viewportSize()!.width <= 720;
      const resources = await resourcePanel(page, mobile);
      await page.route("**/api/lyrics/*/resources?*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAVAILABLE" } }) });
      }, { times: 1 });
      await resources.getByRole("tab", { name: "라임" }).click();
      await expect(resources.getByText("자료를 불러오지 못했습니다", { exact: true })).toBeVisible();
      await expect(page.locator(".cm-content")).toContainText("owner-only 원문");
    } finally {
      await outsiderContext.close();
      await removeAccount(owner);
      await removeAccount(outsider);
    }
  });
});

async function resourcePanel(page: Page, mobile: boolean) {
  if (mobile && !await page.getByRole("dialog", { name: "작업 자료" }).isVisible().catch(() => false)) {
    await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 .*자료/ }).click();
  }
  return mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
}

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `integrated-112-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.12 통합 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function createSong(page: Page, title: string) {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(page: Page, songId: string, title: string, body: string) {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function createRhyme(page: Page, title: string, body: string) {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).rhyme.id as string;
}

async function createSentence(page: Page, title: string, sentenceText: string) {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, mode: "sentence", sentenceText } });
  expect(response.status()).toBe(201);
  return (await response.json()).prompt.id as string;
}

async function removeAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
