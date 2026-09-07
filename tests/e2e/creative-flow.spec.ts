import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.6.0 complete creative flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("creates a song and lyric, inserts a linked rhyme, and copies an exact linked prompt without leaving the editor", async ({ context, page }, testInfo) => {
    test.setTimeout(100_000);
    const account = await createAccount(context);
    const longToken = `full-prompt-${"x".repeat(140)}`;
    const exactPrompt = `cinematic, female vocal, ${longToken}`;
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (text: string) => { (window as typeof window & { copied?: string }).copied = text; return Promise.resolve(); }
    } }));
    try {
      if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 780 });
      await page.goto("/songs?sort=title_asc");
      await page.getByRole("link", { name: "첫 곡 만들기" }).click();
      await page.getByLabel("곡 제목").fill("0.6 통합 창작 곡");
      await page.getByRole("radio", { name: /가사 작성 중/ }).check();
      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+\?returnTo=/, { timeout: 15_000 });
      const songId = new URL(page.url()).pathname.split("/").at(-1)!;

      await page.getByRole("button", { name: "첫 가사 작성" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+\?returnTo=/);
      const lyricId = new URL(page.url()).pathname.split("/").at(-1)!;
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("textbox", { name: "가사 제목" }).fill("0.6 통합 가사");
      const originalBody = "[Verse]\n처음 만든 절\n\n[Hook]\n통합 후렴";
      const editor = page.locator(".cm-content");
      await editor.fill(originalBody);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();

      const mobile = testInfo.project.name === "mobile";
      if (mobile) await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /송폼 2/ }).click();
      const songForm = mobile ? page.getByRole("dialog", { name: "송폼 이동" }) : page.getByRole("complementary", { name: "송폼 목차" });
      await songForm.getByRole("checkbox", { name: "Hook 구간 선택" }).check();
      await songForm.getByRole("button", { name: "선택 복사" }).click();
      await expect.poll(() => copied(page)).toBe("[Hook]\n통합 후렴");
      if (mobile) await songForm.getByRole("button", { name: "닫기" }).click();

      const rhymeId = await createRhyme(page, "0.6 통합 라임", "cursor에 들어온 라임");
      const promptId = await createPrompt(page, "0.6 통합 프롬프트", ["cinematic", "female vocal", longToken]);
      expect((await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers })).status()).toBe(200);
      expect((await page.request.put(`/api/prompts/${promptId}/songs/${songId}`, { headers })).status()).toBe(200);

      await editor.focus();
      await page.keyboard.press("Control+End");
      let panel = await resourcePanel(page, mobile);
      await panel.getByRole("tab", { name: "라임" }).click();
      let card = panel.locator("li", { hasText: "0.6 통합 라임" });
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "전체 삽입" }).click();
      await expect(editor).toContainText("통합 후렴cursor에 들어온 라임");

      panel = await resourcePanel(page, mobile);
      await panel.getByRole("tab", { name: "프롬프트" }).click();
      card = panel.locator("li", { hasText: "0.6 통합 프롬프트" });
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "복사", exact: true }).click();
      await expect.poll(() => copied(page)).toBe(exactPrompt);
      await expect(page.getByRole("status").filter({ hasText: "프롬프트를 복사했습니다" })).toBeVisible();
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: () => Promise.reject(new Error("denied"))
      } }));
      await card.getByRole("button", { name: "복사", exact: true }).click();
      const manualCopy = page.getByRole("dialog", { name: "직접 복사: 프롬프트" });
      await expect(manualCopy.getByRole("textbox", { name: "수동 복사할 프롬프트" })).toHaveValue(exactPrompt);
      await manualCopy.getByRole("button", { name: "닫기" }).click();

      await withE2eDatabase((pool) => pool.query("update resources set deleted_at=clock_timestamp() where id=$1", [promptId]).then(() => undefined));
      await card.getByRole("button", { name: "복사", exact: true }).click();
      await expect(card.getByText("삭제됨", { exact: true })).toBeVisible();
      await expect(card.getByRole("button", { name: "복사", exact: true })).toHaveCount(0);
      await expect(page.getByText(/선택한 자료가 삭제되었거나/)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${lyricId}`));
      await expect(editor).toContainText("cursor에 들어온 라임");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

async function resourcePanel(page: Page, mobile: boolean) {
  if (mobile && !await page.getByRole("dialog", { name: "작업 자료" }).isVisible().catch(() => false)) {
    await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 .*자료/ }).click();
  }
  return mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
}

async function copied(page: Page) {
  return page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? "");
}

async function createRhyme(page: Page, title: string, body: string) {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).rhyme.id as string;
}

async function createPrompt(page: Page, title: string, tokens: readonly string[]) {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens } });
  expect(response.status()).toBe(201);
  return (await response.json()).prompt.id as string;
}

async function createAccount(context: BrowserContext) {
  const userId = randomUUID();
  const token = `creative-flow-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "0.6 통합 흐름 사용자"]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
