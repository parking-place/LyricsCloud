import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.4 lossless sentence display and prompt copy guidance", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps exact spans and applies the same nonblocking warning in editor and list", async ({ context, page }) => {
    const owner = await account(context);
    const prefix = "a.. 3.5 https://example.invalid/a.b 끝 미완성\r\n";
    const raw = prefix + "🙂".repeat(1_001 - [...prefix].length);
    const promptId = await createSentence(page, "1.0.4 긴 문장", raw);
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      expect([...raw]).toHaveLength(1_001);
      await page.goto(`/prompts/${promptId}`);
      await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toBeEnabled();
      const display = page.getByLabel("마침표 기준 문장 표시");
      await expect(display).toBeVisible();
      expect(await display.locator(".sentence-span").allTextContents().then((parts) => parts.join(""))).toBe(raw.replaceAll("\r\n", "\n"));
      expect((await (await page.request.get(`/api/prompts/${promptId}`)).json()).prompt.plainText).toBe(raw);
      await expect(page.getByText("1,001자 · 1,000자 권장 기준을 넘었지만 저장과 복사는 가능합니다.")).toBeVisible();
      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      expect(await copied(page)).toBe(raw);
      await expect(page.getByRole("status").filter({ hasText: "1,000자 권장 기준" })).toBeVisible();

      await page.getByRole("button", { name: "← 프롬프트" }).click();
      const card = page.locator(".prompt-card", { has: page.getByRole("heading", { name: "1.0.4 긴 문장" }) });
      await expect(card.getByText("1,001자 · 1,000자 권장 초과")).toBeVisible();
      expect(await card.locator(".sentence-span").allTextContents().then((parts) => parts.join(""))).toBe(raw);
      await card.getByRole("button", { name: "⧉ 복사" }).click();
      expect(await copied(page)).toBe(raw);

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await card.getByRole("button", { name: "⧉ 복사" }).click();
      const manual = page.getByRole("dialog", { name: /직접 복사/ });
      // HTML textarea value normalization is visual-only; the builder and API
      // assertions above retain the original CRLF payload and its count.
      await expect(manual.locator("textarea")).toHaveValue(raw.replaceAll("\r\n", "\n"));
      await expect(manual.getByText(/1,001자로 1,000자 권장 기준/)).toBeVisible();
    } finally { await removeAccount(owner); }
  });

  test("uses the same exact prompt payload and warning from the lyric resource panel", async ({ context, page }, info) => {
    const owner = await account(context);
    const raw = "🙂".repeat(1_001);
    const promptId = await createSentence(page, "패널 긴 프롬프트", raw);
    const songId = await createSong(page, "패널 곡");
    const lyricId = await createLyric(page, songId, "패널 가사");
    await page.request.put(`/api/prompts/${promptId}/songs/${songId}`, { headers });
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
      } }));
      const mobile = info.project.name.endsWith("mobile");
      if (mobile) await page.getByRole("button", { name: /≋ 다른 가사 .*자료/ }).click();
      const panel = mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
      await panel.getByRole("tab", { name: "프롬프트" }).click();
      const item = panel.locator("li", { hasText: "패널 긴 프롬프트" });
      await item.getByRole("button", { name: "복사", exact: true }).click();
      await expect.poll(() => copied(page)).toBe(raw);
      await expect(page.getByRole("status").filter({ hasText: "1,001자로 1,000자 권장 기준" })).toBeVisible();
    } finally { await removeAccount(owner); }
  });
});

async function account(context: BrowserContext): Promise<string> {
  const userId = randomUUID(); const token = `prompt-104-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.4 프롬프트 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function createSentence(page: Page, title: string, sentenceText: string): Promise<string> {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, mode: "sentence", sentenceText } });
  expect(response.status()).toBe(201); return (await response.json()).prompt.id as string;
}
async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201); return (await response.json()).song.id as string;
}
async function createLyric(page: Page, songId: string, title: string): Promise<string> {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body: "[Verse]\n패널 본문" } });
  expect(response.status()).toBe(201); return (await response.json()).lyric.id as string;
}
async function copied(page: Page) { return page.evaluate(() => (window as unknown as { copied: string }).copied); }
async function removeAccount(id: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined)); }
