import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { PromptRecord } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("prompt creation and editor", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps an offline creation draft, validates its title and converts it to a synced prompt", async ({ context, page }) => {
    test.setTimeout(70_000);
    const owner = await account([context]);
    try {
      await page.goto("/prompts/new");
      const title = page.getByRole("textbox", { name: "프롬프트 제목" });
      const token = page.getByRole("combobox", { name: "태그 입력" });
      await expect(title).toBeEnabled();
      await context.setOffline(true);
      await title.fill("오프라인 프롬프트 🎵");
      await token.fill("feminine vocal, , dream pop , 한글 IME");
      await page.getByRole("button", { name: "태그 추가" }).click();
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await expect(page.locator(".prompt-editor-token")).toHaveCount(3);
      await page.close();

      await context.setOffline(false);
      page = await context.newPage();
      await page.goto("/prompts/new");
      await expect(titleFor(page)).toHaveValue("오프라인 프롬프트 🎵");
      await expect(page.locator(".prompt-editor-token")).toHaveCount(3);
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+$/, { timeout: 20_000 });
      await ready(page);
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      await expect.poll(() => prompt(page, id).then((value) => value.plainText)).toBe("feminine vocal, dream pop, 한글 IME");
    } finally { await removeAccount(owner.userId); }
  });

  test("supports suggestions, direct input, duplicate cleanup, history restore and two-tab convergence", async ({ browser, context, page }, info) => {
    test.setTimeout(100_000);
    const owner = await account([context]);
    try {
      await create(page, { title: "자동완성 원본", tokens: ["Female Vocal", "cinematic"] });
      const target = await create(page, { title: "편집 대상", tokens: ["intro"] });
      await page.goto(`/prompts/${target.id}`);
      await ready(page);

      const token = page.getByRole("combobox", { name: "태그 입력" });
      await token.fill("fem");
      await expect(page.getByRole("listbox", { name: "과거 프롬프트 태그 제안" })).toBeVisible();
      await expect(page.getByRole("option").first()).toContainText("Female Vocal");
      if (info.project.name === "mobile") await page.getByRole("option").first().getByRole("button").tap();
      else { await token.press("ArrowDown"); await token.press("Enter"); }
      await expect(page.locator(".prompt-editor-token")).toHaveCount(2);
      await expect(token).toBeFocused();

      await page.route("**/api/prompts/suggestions?*", (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await token.fill("server-failure-direct");
      await expect(page.getByText("자동완성을 불러오지 못했습니다. 직접 입력은 계속할 수 있습니다.")).toBeVisible();
      await page.getByRole("button", { name: "태그 추가" }).click();
      await expect(page.getByText("server-failure-direct", { exact: true })).toBeVisible();
      await page.unroute("**/api/prompts/suggestions?*");

      await token.fill("never-used-token");
      await expect(page.getByText("일치하는 과거 태그가 없습니다")).toBeVisible();
      await token.press("Escape");
      await expect(token).toHaveAttribute("aria-expanded", "false");
      await token.fill("never-used-token");
      await token.press("Enter");
      await expect(page.getByText("never-used-token", { exact: true })).toBeVisible();

      await token.fill(`alpha${",".repeat(100)}omega,  한글 IME  , Female Vocal`);
      await page.getByRole("button", { name: "태그 추가" }).click();
      await expect(page.locator(".prompt-editor-token")).toHaveCount(8);
      const warning = page.locator(".prompt-duplicate-warning");
      await expect(warning).toContainText("중복 태그 1개");
      await expect(warning).toContainText("‘female vocal’ 2·8번째");
      expect(await horizontalOverflow(page)).toBe(false);
      if (info.project.name === "mobile") {
        await expect(page.locator(".prompt-editor-token button")).toHaveCount(8);
        await expect(page.locator(".prompt-editor-token").last()).toContainText("Female Vocal");
      }

      await page.getByRole("button", { name: "첫 표시 값으로 한 번에 정리" }).click();
      await expect(warning).toHaveCount(0);
      await expect(page.locator(".prompt-editor-token")).toHaveCount(7);
      await expect.poll(() => prompt(page, target.id).then((value) => value.plainText)).toBe(
        "intro, Female Vocal, server-failure-direct, never-used-token, alpha, omega, 한글 IME"
      );

      const other = await browser.newContext({ baseURL: origin });
      await addSession(other, owner.token);
      const second = await other.newPage();
      await second.goto(`/prompts/${target.id}`);
      await ready(second);
      await titleFor(page).dispatchEvent("compositionstart");
      await titleFor(page).fill("한글 IME 제목");
      await titleFor(page).dispatchEvent("compositionend", { data: "제목" });
      await expect.poll(() => prompt(page, target.id).then((value) => value.title)).toBe("한글 IME 제목");
      await Promise.all([
        titleFor(page).fill("두 탭 프롬프트 제목"),
        (async () => {
          const secondInput = second.getByRole("combobox", { name: "태그 입력" });
          await secondInput.fill("second-tab-token");
          await secondInput.press("Enter");
        })()
      ]);
      await expect(page.getByText("second-tab-token", { exact: true })).toBeVisible();
      await expect(titleFor(second)).toHaveValue("두 탭 프롬프트 제목");
      await expect.poll(() => prompt(page, target.id).then((value) => value.title)).toBe("두 탭 프롬프트 제목");
      await expect.poll(() => prompt(page, target.id).then((value) => value.plainText)).toContain("second-tab-token");
      await other.close();

      await page.getByRole("button", { name: "수정 기록", exact: true }).click();
      const history = page.getByRole("dialog", { name: "프롬프트 수정 기록" });
      const cleanupRevision = history.getByRole("navigation", { name: "프롬프트 수정 기록 목록" }).getByRole("button").filter({ hasText: "붙여넣기·중복 정리 전" }).first();
      await expect(cleanupRevision).toBeVisible();
      await cleanupRevision.click();
      await expect(history.locator(".prompt-history-compare section").nth(1)).toContainText("Female Vocal");
      await history.getByRole("button", { name: "현재 내용 보존 후 복원" }).click();
      await expect(history.getByText("제목과 태그를 복원했습니다.")).toBeVisible();
      await history.getByRole("button", { name: "닫기" }).click();
      await expect(page.locator(".prompt-duplicate-warning")).toContainText("중복 태그 1개");
      await expect(page.locator(".prompt-editor-token")).toHaveCount(8);
      await page.getByRole("button", { name: "Female Vocal 태그 제거" }).last().click();
      await expect(page.locator(".prompt-duplicate-warning")).toHaveCount(0);
      await expect(page.locator(".prompt-editor-token")).toHaveCount(7);
      expect(await horizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `test-results/prompt-editor-${info.project.name}.png`, fullPage: true });
    } finally { await removeAccount(owner.userId); }
  });

  test("opens a list duplication immediately as an editable independent prompt", async ({ context, page }) => {
    const owner = await account([context]);
    try {
      const source = await create(page, { title: "복제 원본", tokens: ["dream pop", "808 bass"] });
      await page.goto("/prompts");
      const card = page.locator(".prompt-card", { has: page.getByRole("heading", { name: "복제 원본" }) });
      await card.getByRole("button", { name: "복제", exact: true }).click();
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+\?from=duplicate$/, { timeout: 20_000 });
      await ready(page);
      expect(new URL(page.url()).pathname).not.toContain(source.id);
      await expect(titleFor(page)).toHaveValue("복제 원본 복사본");
      await expect(page.locator(".prompt-editor-token")).toHaveCount(2);
      await titleFor(page).fill("독립 복제본");
      await expect.poll(() => prompt(page, new URL(page.url()).pathname.split("/").at(-1)!).then((value) => value.title)).toBe("독립 복제본");
      expect((await prompt(page, source.id)).title).toBe("복제 원본");
    } finally { await removeAccount(owner.userId); }
  });

  test("keeps invalid new titles local and confirms a named discard", async ({ context, page }) => {
    const owner = await account([context]);
    try {
      await page.goto("/prompts/new");
      await expect(page.getByText("제목을 입력하면 프롬프트가 자동으로 생성됩니다.")).toBeVisible();
      await page.getByRole("textbox", { name: "프롬프트 제목" }).fill("가".repeat(201));
      await expect(page.getByText("제목은 200자 이하로 입력해 주세요.")).toBeVisible();
      await page.waitForTimeout(1_100);
      await expect(page).toHaveURL("/prompts/new");
      await page.getByRole("button", { name: "취소", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "새 프롬프트 작성을 취소할까요?" });
      await dialog.getByRole("button", { name: "계속 작성" }).click();
      await expect(titleFor(page)).toHaveValue("가".repeat(201));
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await page.getByRole("button", { name: "초안 삭제 후 나가기" }).click();
      await expect(page).toHaveURL("/prompts");
    } finally { await removeAccount(owner.userId); }
  });
});

async function account(contexts: BrowserContext[]) {
  const userId = randomUUID(); const token = `prompt-editor-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'프롬프트 편집 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  for (const context of contexts) await addSession(context, token);
  return { userId, token };
}
async function addSession(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
}
async function create(page: Page, input: { title: string; tokens: readonly string[] }): Promise<PromptRecord> {
  const response = await page.request.post("/api/prompts", { headers, data: {
    requestId: randomUUID(), title: input.title, tokens: input.tokens,
    isFavorite: false, isPinned: false, pinOrder: null, color: null
  } });
  expect(response.status()).toBe(201);
  return (await response.json()).prompt as PromptRecord;
}
async function ready(page: Page) {
  await expect(titleFor(page)).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
}
function titleFor(page: Page) { return page.getByRole("textbox", { name: "프롬프트 제목" }); }
async function prompt(page: Page, id: string): Promise<PromptRecord> {
  const response = await page.request.get(`/api/prompts/${id}`);
  expect(response.ok()).toBe(true);
  return (await response.json()).prompt as PromptRecord;
}
async function horizontalOverflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); }
async function removeAccount(id: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined)); }
