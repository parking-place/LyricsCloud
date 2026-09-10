import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { PromptRecord } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.3 prompt tag and sentence modes", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps a sentence-mode mobile or PC draft raw through offline exit, server save, list and copy", async ({ context, page }, info) => {
    test.setTimeout(80_000);
    const owner = await account(context);
    const raw = "  cinematic, not tags.\n두  칸과 🙂  ";
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      await page.goto("/prompts/new");
      await expect(page.getByRole("radio", { name: /태그형/ })).toBeEnabled();
      await context.setOffline(true);
      await page.getByRole("radio", { name: /문장형/ }).check();
      await page.getByRole("textbox", { name: "프롬프트 제목" }).fill("문장형 오프라인 초안");
      const sentence = page.getByRole("textbox", { name: "문장형 프롬프트 원문" });
      await sentence.dispatchEvent("compositionstart", { data: "두" });
      await sentence.fill(raw);
      await sentence.dispatchEvent("compositionend", { data: "칸" });
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();

      await context.setOffline(false);
      page = await context.newPage();
      await page.goto("/prompts/new");
      await expect(page.getByRole("radio", { name: /문장형/ })).toBeChecked();
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue(raw);
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+$/, { timeout: 20_000 });
      await ready(page);
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      await expect.poll(() => readPrompt(page, id)).toMatchObject({ mode: "sentence", sentenceText: raw, plainText: raw });
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue(raw);

      const legacy = await page.request.post(`/collaboration/documents/${id}`, { headers });
      expect(legacy.status()).toBe(409);
      expect((await legacy.json()).error.code).toBe("PROMPT_MODE_CAPABILITY_REQUIRED");
      const capable = await page.request.post(`/collaboration/documents/${id}`, {
        headers: { ...headers, "X-LyricsCloud-Prompt-Capability": "prompt-mode-v1" }
      });
      expect(capable.status()).toBe(200);

      const duplicate = await page.request.post(`/api/prompts/${id}/duplicate`, {
        headers, data: { requestId: randomUUID() }
      });
      expect(duplicate.status()).toBe(201);
      expect((await duplicate.json()).prompt).toMatchObject({ mode: "sentence", sentenceText: raw, plainText: raw });

      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(raw);
      await expect(page.getByText("문장 원문을 복사했습니다.")).toBeVisible();
      await page.getByRole("button", { name: "← 프롬프트" }).click();
      const card = page.locator(".prompt-card", { has: page.getByRole("heading", { name: "문장형 오프라인 초안", exact: true }) });
      await expect(card.getByText("문장형", { exact: true })).toBeVisible();
      await expect(card.locator(".prompt-sentence-preview")).toContainText("cinematic, not tags.");
      expect(await horizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `test-results/new-feature-1.0.3-sentence-${info.project.name}.png`, fullPage: true });

      await page.goto(`/prompts/${id}`); await ready(page);
      await page.getByRole("radio", { name: /태그형/ }).click();
      const conversion = page.getByRole("dialog", { name: "문장을 태그형으로 변환할까요?" });
      await conversion.getByRole("button", { name: "확인하고 변환" }).click();
      await expect(page.getByRole("radio", { name: /태그형/ })).toBeChecked();
      await page.getByRole("button", { name: "수정 기록", exact: true }).click();
      const history = page.getByRole("dialog", { name: "프롬프트 수정 기록" });
      const beforeConversion = history.getByRole("navigation", { name: "프롬프트 수정 기록 목록" })
        .getByRole("button").first();
      await expect(beforeConversion).toBeVisible();
      await beforeConversion.click();
      await expect(history.locator(".prompt-history-compare section").nth(1)).toContainText("문장형");
      await expect(history.locator(".prompt-history-compare section").nth(1).locator("p")).toHaveText(raw);
      await history.getByRole("button", { name: "현재 내용 보존 후 복원" }).click();
      await expect(history.getByText("제목과 문장 원문을 복원했습니다.")).toBeVisible();
      await history.getByRole("button", { name: "닫기" }).click();
      await expect(page.getByRole("radio", { name: /문장형/ })).toBeChecked();
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue(raw);
      await expect.poll(() => readPrompt(page, id)).toMatchObject({ mode: "sentence", sentenceText: raw, plainText: raw });
    } finally { await removeAccount(owner); }
  });

  test("requires preview confirmation for conversion and restores the exact prior representation with undo", async ({ context, page }) => {
    test.setTimeout(70_000);
    const owner = await account(context);
    try {
      const source = await createTags(page, "명시 변환", ["warm pop", "female vocal"]);
      await page.goto(`/prompts/${source.id}`); await ready(page);
      await page.getByRole("radio", { name: /문장형/ }).click();
      let dialog = page.getByRole("dialog", { name: "태그를 문장형으로 변환할까요?" });
      await expect(dialog.getByText("warm pop, female vocal", { exact: true })).toHaveCount(2);
      await dialog.getByRole("button", { name: "원문 유지" }).click();
      await expect(page.getByRole("radio", { name: /태그형/ })).toBeChecked();

      await page.getByRole("radio", { name: /문장형/ }).click();
      dialog = page.getByRole("dialog", { name: "태그를 문장형으로 변환할까요?" });
      await dialog.getByRole("button", { name: "확인하고 변환" }).click();
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue("warm pop, female vocal");
      await expect.poll(() => readPrompt(page, source.id)).toMatchObject({ mode: "sentence", sentenceText: "warm pop, female vocal", tagText: "warm pop, female vocal" });
      await page.getByRole("button", { name: "변환 취소" }).click();
      await expect(page.getByRole("combobox", { name: "태그 입력" })).toBeVisible();
      await expect.poll(() => readPrompt(page, source.id)).toMatchObject({ mode: "tags", sentenceText: "warm pop, female vocal", tagText: "warm pop, female vocal", plainText: "warm pop, female vocal" });

      await page.getByRole("radio", { name: /문장형/ }).click();
      dialog = page.getByRole("dialog", { name: "태그를 문장형으로 변환할까요?" });
      await dialog.getByRole("button", { name: "확인하고 변환" }).click();
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue("warm pop, female vocal");
      await page.getByRole("radio", { name: /태그형/ }).click();
      await expect(page.locator(".prompt-editor-token > span")).toHaveText(["warm pop", "female vocal"]);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("radio", { name: /문장형/ }).click();
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue("warm pop, female vocal");
      await page.getByRole("radio", { name: /태그형/ }).click();
      await expect.poll(() => readPrompt(page, source.id)).toMatchObject({ mode: "tags", tagText: "warm pop, female vocal", sentenceText: "warm pop, female vocal" });

      const sentence = await createSentence(page, "문장→태그", "Keep this, comma exactly.");
      await page.goto(`/prompts/${sentence.id}`); await ready(page);
      await page.getByRole("radio", { name: /태그형/ }).click();
      dialog = page.getByRole("dialog", { name: "문장을 태그형으로 변환할까요?" });
      await expect(dialog.locator(".prompt-conversion-source pre")).toHaveText("Keep this, comma exactly.");
      await expect(dialog.locator(".prompt-conversion-preview pre")).toHaveText("Keep this, comma exactly.");
      await dialog.getByRole("button", { name: "확인하고 변환" }).click();
      await expect(page.locator(".prompt-editor-token")).toHaveCount(2);
      await expect.poll(() => readPrompt(page, sentence.id)).toMatchObject({ mode: "tags", sentenceText: "Keep this, comma exactly.", plainText: "Keep this, comma exactly." });
      expect(await horizontalOverflow(page)).toBe(false);
    } finally { await removeAccount(owner); }
  });

  test("rejects a stale conversion preview when another tab changes the sentence", async ({ context, page }) => {
    test.setTimeout(70_000);
    const owner = await account(context);
    const raw = "first, sentence exactly";
    try {
      const source = await createSentence(page, "두 탭 원자성", raw);
      await page.goto(`/prompts/${source.id}`); await ready(page);
      const second = await context.newPage();
      await second.goto(`/prompts/${source.id}`); await ready(second);

      await page.getByRole("radio", { name: /태그형/ }).click();
      const stale = page.getByRole("dialog", { name: "문장을 태그형으로 변환할까요?" });
      await expect(stale.locator(".prompt-conversion-source pre")).toHaveText(raw);
      const updated = "second tab, keeps  two spaces.\n새 줄";
      await second.getByRole("textbox", { name: "문장형 프롬프트 원문" }).fill(updated);
      await expect.poll(() => readPrompt(second, source.id)).toMatchObject({ mode: "sentence", sentenceText: updated, plainText: updated });
      await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue(updated);

      await stale.getByRole("button", { name: "확인하고 변환" }).click();
      await expect(page.getByText("미리보기 뒤 다른 변경이 반영되어 변환을 취소했습니다. 최신 내용을 다시 확인해 주세요.")).toBeVisible();
      await expect(page.getByRole("radio", { name: /문장형/ })).toBeChecked();
      await expect.poll(() => readPrompt(page, source.id)).toMatchObject({ mode: "sentence", sentenceText: updated, plainText: updated });

      await page.getByRole("radio", { name: /태그형/ }).click();
      const current = page.getByRole("dialog", { name: "문장을 태그형으로 변환할까요?" });
      await expect(current.locator(".prompt-conversion-source pre")).toHaveText(updated);
      await current.getByRole("button", { name: "확인하고 변환" }).click();
      await expect.poll(() => readPrompt(page, source.id)).toMatchObject({
        mode: "tags", tagText: "second tab, keeps  two spaces.\n새 줄", sentenceText: updated,
        plainText: "second tab, keeps  two spaces.\n새 줄"
      });
      await second.close();
    } finally { await removeAccount(owner); }
  });

  test("keeps sentence prompts private from another account", async ({ browser, context, page }) => {
    const owner = await account(context);
    const outsiderContext = await browser.newContext({ baseURL: origin });
    const outsider = await account(outsiderContext);
    try {
      const source = await createSentence(page, "소유자 전용 문장", "private, raw sentence");
      const denied = await outsiderContext.request.get(`/api/prompts/${source.id}`);
      expect(denied.status()).toBe(404);
      const deniedSync = await outsiderContext.request.post(`/collaboration/documents/${source.id}`, {
        headers: { ...headers, "X-LyricsCloud-Prompt-Capability": "prompt-mode-v1" }
      });
      expect(deniedSync.status()).toBe(404);
      expect(await readPrompt(page, source.id)).toMatchObject({ mode: "sentence", sentenceText: "private, raw sentence" });
    } finally {
      await outsiderContext.close();
      await Promise.all([removeAccount(owner), removeAccount(outsider)]);
    }
  });
});

async function account(context: BrowserContext): Promise<string> {
  const userId = randomUUID(); const token = `prompt-103-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.3 프롬프트 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function createTags(page: Page, title: string, tokens: readonly string[]): Promise<PromptRecord> {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, mode: "tags", tokens } });
  expect(response.status()).toBe(201); return (await response.json()).prompt as PromptRecord;
}
async function createSentence(page: Page, title: string, sentenceText: string): Promise<PromptRecord> {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, mode: "sentence", sentenceText } });
  expect(response.status()).toBe(201); return (await response.json()).prompt as PromptRecord;
}
async function readPrompt(page: Page, id: string): Promise<PromptRecord> {
  const response = await page.request.get(`/api/prompts/${id}`); expect(response.ok()).toBe(true);
  return (await response.json()).prompt as PromptRecord;
}
async function ready(page: Page) {
  await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
}
async function horizontalOverflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); }
async function removeAccount(id: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined)); }
