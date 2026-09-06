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
      await page.locator(".prompt-drag-handle").nth(2).press("ArrowUp");
      await expect(page.locator(".prompt-editor-token").nth(1)).toContainText("한글 IME");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();

      await context.setOffline(false);
      page = await context.newPage();
      await page.goto("/prompts/new");
      await expect(titleFor(page)).toHaveValue("오프라인 프롬프트 🎵");
      await expect(page.locator(".prompt-editor-token")).toHaveCount(3);
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+$/, { timeout: 20_000 });
      await ready(page);
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      await expect.poll(() => prompt(page, id).then((value) => value.plainText)).toBe("feminine vocal, 한글 IME, dream pop");
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
        await expect(page.locator(".prompt-token-remove")).toHaveCount(8);
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
      const alphaHandle = page.locator(".prompt-editor-token", { hasText: "alpha" }).locator(".prompt-drag-handle");
      const alphaRemove = second.getByRole("button", { name: "alpha 태그 제거" });
      await Promise.all([alphaHandle.press("ArrowLeft"), alphaRemove.click()]);
      await expect.poll(async () => {
        const first = await page.locator(".prompt-editor-token > span").allTextContents();
        const other = await second.locator(".prompt-editor-token > span").allTextContents();
        return JSON.stringify(first) === JSON.stringify(other) && first.filter((value) => value === "alpha").length <= 1;
      }).toBe(true);
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

  test("reorders by pointer, buttons and keyboard, copies safely, and manages metadata and song links", async ({ browser, context, page }, info) => {
    test.setTimeout(100_000);
    const owner = await account([context]);
    const outsiderContext = await browser.newContext({ baseURL: origin });
    const outsider = await account([outsiderContext]);
    const outsiderPage = await outsiderContext.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      const target = await create(page, { title: "순서와 연결", tokens: ["alpha", "beta", "<img src=x onerror=alert(1)>"] });
      const songId = await createSong(page, "Phase 4 연결 곡");
      const outsiderSongId = await createSong(outsiderPage, "다른 owner 곡");
      const denied = await page.request.put(`/api/prompts/${target.id}/songs/${outsiderSongId}`, { headers });
      expect(denied.status()).toBe(404);

      await page.goto(`/prompts/${target.id}`); await ready(page);
      const handles = page.locator(".prompt-drag-handle");
      await handles.nth(1).focus();
      await page.getByRole("button", { name: "앞으로", exact: true }).click();
      await expect(handles.filter({ hasText: "⠿" }).nth(0)).toBeFocused();
      await expect(page.getByText("beta 태그를 1번째로 이동했습니다.")).toBeAttached();
      await handles.nth(0).press("ArrowRight");
      await expect(handles.nth(1)).toBeFocused();

      if (info.project.name === "mobile") {
        const from = await handles.nth(2).boundingBox(); const to = await page.locator("[data-prompt-token-index='0']").boundingBox();
        expect(from).not.toBeNull(); expect(to).not.toBeNull();
        await handles.nth(2).dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 7, clientX: from!.x + 8, clientY: from!.y + 8 });
        await handles.nth(2).dispatchEvent("pointerup", { pointerType: "touch", pointerId: 7, clientX: to!.x + 8, clientY: to!.y + 8 });
      } else {
        await handles.nth(2).dragTo(page.locator("[data-prompt-token-index='0']"));
      }
      await expect(page.locator(".prompt-editor-token").nth(0)).toContainText("<img src=x onerror=alert(1)>");
      await expect(page.locator("img")).toHaveCount(0);
      await expect.poll(() => prompt(page, target.id).then((value) => value.plainText)).toBe("<img src=x onerror=alert(1)>, alpha, beta");

      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("<img src=x onerror=alert(1)>, alpha, beta");
      await expect(page.getByText("쉼표로 정리한 프롬프트를 복사했습니다.")).toBeVisible();
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      const copyDialog = page.getByRole("dialog", { name: "프롬프트를 직접 복사해 주세요" });
      await expect(copyDialog.getByRole("textbox", { name: "수동 복사할 프롬프트" })).toHaveValue("<img src=x onerror=alert(1)>, alpha, beta");
      await copyDialog.getByRole("button", { name: "취소" }).click();

      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await expect(page.getByRole("button", { name: "★ 즐겨찾기됨" })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "⌁ 고정" }).click();
      await expect(page.getByRole("button", { name: "⌁ 고정됨" })).toHaveAttribute("aria-pressed", "true");

      await expect(page.getByRole("searchbox", { name: "곡 검색" })).toBeVisible();
      const connect = page.getByRole("button", { name: "연결", exact: true });
      await expect(connect).toBeVisible();
      await page.route(`**/api/prompts/${target.id}/songs/${songId}`, (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await connect.click();
      await expect(page.getByText("곡 연결을 변경하지 못했습니다. 다시 시도해 주세요.")).toBeVisible();
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(connect).toBeVisible(); await connect.click();
      const unlink = page.getByRole("button", { name: "연결 해제", exact: true });
      await expect(unlink).toBeVisible(); await unlink.click();
      const unlinkDialog = page.getByRole("dialog", { name: "‘Phase 4 연결 곡’ 곡 연결을 해제할까요?" });
      await unlinkDialog.getByRole("button", { name: "취소" }).click();
      await unlink.click(); await page.getByRole("button", { name: "연결 해제 확인" }).click();
      await expect(connect).toBeVisible();

      await page.getByRole("button", { name: "복제", exact: true }).click();
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+\?from=duplicate$/, { timeout: 20_000 });
      await expect.poll(() => withE2eDatabase(async (pool) => Number((await pool.query(
        "select count(*)::text count from lyric_revisions lr join sync_documents sd using(document_key) where sd.resource_id=$1 and lr.reason='duplicate'", [target.id]
      )).rows[0]?.count ?? 0))).toBeGreaterThan(0);
      expect(await horizontalOverflow(page)).toBe(false);
    } finally {
      await outsiderContext.close();
      await removeAccount(owner.userId); await removeAccount(outsider.userId);
    }
  });

  test("completes the prompt library to Suno-copy journey", async ({ context, page }, info) => {
    test.setTimeout(100_000);
    const owner = await account([context]);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { const state = window as unknown as { copied: string; copyCount: number };
        state.copied = value; state.copyCount = (state.copyCount ?? 0) + 1; return Promise.resolve(); }
    } }));
    try {
      await page.goto("/prompts");
      await expect(page.getByRole("heading", { name: "자주 쓰는 스타일 조합을 만들어보세요" })).toBeVisible();
      await create(page, { title: "추천 기반", tokens: ["cinematic", "wide reverb"] });
      const songId = await createSong(page, "통합 흐름 연결 곡");

      await page.goto("/prompts/new");
      await titleFor(page).fill("통합 Suno 프롬프트");
      const input = page.getByRole("combobox", { name: "태그 입력" });
      await input.fill("cin");
      await expect(page.getByRole("option").first()).toContainText("cinematic");
      await input.press("ArrowDown"); await input.press("Enter");
      await input.fill("hyperpop, female vocal, Female  Vocal, bright synth, fast tempo");
      await page.getByRole("button", { name: "태그 추가" }).click();
      await expect(page.locator(".prompt-duplicate-warning")).toContainText("중복 태그 1개");
      await page.getByRole("button", { name: "첫 표시 값으로 한 번에 정리" }).click();
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+$/, { timeout: 20_000 });
      await ready(page);
      const sourceId = new URL(page.url()).pathname.split("/").at(-1)!;

      const handles = page.locator(".prompt-drag-handle");
      await handles.last().press("ArrowLeft");
      const expected = "cinematic, hyperpop, female vocal, fast tempo, bright synth";
      await expect.poll(() => prompt(page, sourceId).then((value) => value.plainText)).toBe(expected);
      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(expected);
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await expect(page.getByRole("button", { name: "★ 즐겨찾기됨" })).toBeVisible();
      await page.getByRole("button", { name: "연결", exact: true }).click();
      await expect(page.getByRole("button", { name: "연결 해제", exact: true })).toBeVisible();

      await page.getByRole("button", { name: "← 프롬프트" }).click();
      await expect(page).toHaveURL("/prompts");
      await page.getByRole("searchbox", { name: "프롬프트 검색" }).fill("통합 Suno");
      await page.getByLabel("프롬프트 연결 곡 필터").selectOption(songId);
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await expect(page.getByText("총 1개")).toBeVisible();
      const card = page.locator(".prompt-card", { has: page.getByRole("heading", { name: "통합 Suno 프롬프트" }) });
      if (info.project.name === "mobile") {
        await page.setViewportSize({ width: 360, height: 780 });
        const box = await card.boundingBox(); expect(box).not.toBeNull();
        const before = await page.evaluate(() => (window as unknown as { copyCount: number }).copyCount ?? 0);
        await card.dispatchEvent("pointerdown", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
        await page.waitForTimeout(700);
        await card.dispatchEvent("pointerup", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
        await expect.poll(() => page.evaluate(() => (window as unknown as { copyCount: number }).copyCount)).toBe(before + 1);
      } else await card.getByRole("button", { name: "⧉ 복사" }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(expected);

      await card.getByRole("button", { name: "복제", exact: true }).click();
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+\?from=duplicate$/, { timeout: 20_000 });
      await ready(page);
      const copyId = new URL(page.url()).pathname.split("/").at(-1)!;
      expect(copyId).not.toBe(sourceId);
      await titleFor(page).fill("통합 독립 복사본");
      await expect.poll(() => prompt(page, copyId).then((value) => value.title)).toBe("통합 독립 복사본");
      expect((await prompt(page, sourceId)).title).toBe("통합 Suno 프롬프트");
      expect(await horizontalOverflow(page)).toBe(false);
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
async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
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
