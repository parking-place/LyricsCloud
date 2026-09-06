import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("rhyme note creation and editor", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("recovers a new offline draft, syncs two tabs, edits tags and restores history", async ({ browser, context, page }, info) => {
    test.setTimeout(75_000);
    const owner = await account([context]);
    await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText(value: string) { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      const songResponse = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "Phase 4 연결 곡" } });
      expect(songResponse.status()).toBe(201);
      const songId = (await songResponse.json()).song.id as string;
      await page.goto("/rhymes/new");
      await expect(page.getByRole("textbox", { name: "노트 제목" })).toBeEnabled();
      await context.setOffline(true);
      await page.getByRole("textbox", { name: "노트 제목" }).fill("오프라인 라임 🎵");
      await page.getByRole("textbox", { name: "자유 본문" }).fill("air\n의자와 chair\n");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await context.setOffline(false);
      page = await context.newPage();
      await page.goto("/rhymes/new");
      await expect(page.getByRole("textbox", { name: "노트 제목" })).toHaveValue("오프라인 라임 🎵");
      await expect(page.getByRole("textbox", { name: "자유 본문" })).toHaveValue("air\n의자와 chair\n");
      await expect(page).toHaveURL(/\/rhymes\/[0-9a-f-]+$/, { timeout: 20_000 });
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      await ready(page);
      await expect(page.locator(".cm-content")).toContainText("의자와 chair");

      await page.getByRole("textbox", { name: "노트 제목" }).fill("수정한 라임 제목");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      if (info.project.name === "mobile") await page.getByRole("button", { name: /태그·설정/ }).click();
      const settings = info.project.name === "mobile" ? page.getByRole("dialog", { name: "태그와 표시 설정" }) : page.getByRole("complementary", { name: "라임 노트 설정" });
      await settings.getByRole("textbox", { name: "새 태그" }).fill("  FIRE\tTag  ");
      await settings.getByRole("button", { name: "추가", exact: true }).click();
      await expect(settings.getByText("#FIRE Tag")).toBeVisible();
      await settings.getByRole("button", { name: /즐겨찾기$/ }).click();
      await settings.getByRole("button", { name: /고정$/ }).click();
      await settings.getByRole("button", { name: "빨강", exact: true }).click();
      await expect(settings.getByRole("button", { name: /즐겨찾기됨$/ })).toHaveAttribute("aria-pressed", "true");
      await expect(settings.getByRole("searchbox", { name: "곡 검색" })).toBeVisible();
      await settings.getByRole("searchbox", { name: "곡 검색" }).fill("Phase 4");
      await expect(settings.getByText("Phase 4 연결 곡", { exact: true })).toBeVisible();
      await settings.getByRole("button", { name: "연결", exact: true }).click();
      await expect(settings.getByRole("button", { name: "연결 해제", exact: true })).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/rhymes?song=${songId}`)).json()).items.length).toBe(1);
      await settings.getByRole("button", { name: "연결 해제", exact: true }).click();
      await expect(settings.getByRole("button", { name: "연결", exact: true })).toBeVisible();
      await expect.poll(async () => (await (await page.request.get(`/api/rhymes?song=${songId}`)).json()).items.length).toBe(0);
      await settings.getByRole("button", { name: "연결", exact: true }).click();
      const insertion = settings.getByRole("button", { name: "열린 가사에 삽입" });
      await expect(insertion).toBeDisabled();
      await expect(settings.getByText(/현재 화면에는 열린 가사 편집 대상이 없습니다/)).toBeVisible();
      await settings.getByRole("button", { name: "#FIRE Tag", exact: true }).click();
      await expect(page).toHaveURL(/\/rhymes\?tag=[0-9a-f-]+$/);
      await expect(page.getByText("총 1개")).toBeVisible();
      await page.getByRole("link", { name: "수정한 라임 제목 라임 노트 열기" }).click();
      await ready(page);

      const editor = page.locator(".cm-content");
      await editor.fill("첫 기록 본문\n한글 IME 확정 🎵");
      await ready(page); await checkpoint(page, id);
      await editor.fill("복원 전 최신 본문\n둘째 줄");
      await ready(page);

      const other = await browser.newContext({ baseURL: origin });
      await addSession(other, owner.token);
      const second = await other.newPage();
      await second.goto(`/rhymes/${id}`); await ready(second);
      await Promise.all([
        page.getByRole("textbox", { name: "노트 제목" }).fill("두 탭 라임 제목"),
        (async () => {
          await second.locator(".cm-content").press("Control+End");
          await second.keyboard.insertText("\n두 번째 탭 표현");
        })()
      ]);
      await expect(editor).toContainText("두 번째 탭 표현");
      await expect.poll(() => body(page, id)).toContain("두 번째 탭 표현");
      await expect.poll(() => rhyme(page, id).then((record) => record.title)).toBe("두 탭 라임 제목");
      await other.close();

      if (info.project.name === "mobile") await page.getByRole("button", { name: /수정 기록/ }).click();
      else await page.getByRole("button", { name: "수정 기록", exact: true }).click();
      const history = page.getByRole("dialog", { name: "라임 수정 기록" });
      const firstRevision = history.getByRole("navigation", { name: "라임 수정 기록 목록" }).getByRole("button").first();
      await expect(firstRevision).toBeVisible(); await firstRevision.click();
      await expect(history.locator(".diff-selected")).toContainText("첫 기록 본문");
      await history.getByRole("button", { name: "이 기록으로 복원" }).click();
      await history.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect(history.getByText("본문을 복원했습니다.", { exact: false })).toBeVisible();
      await expect.poll(() => body(page, id)).toBe("첫 기록 본문\n한글 IME 확정 🎵");
      await history.getByRole("button", { name: "닫기", exact: true }).click();

      if (info.project.name === "mobile") await page.getByRole("button", { name: /전체 복사/ }).click();
      else await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("첫 기록 본문\n한글 IME 확정 🎵");
      await expect(page.getByText("라임 노트 전체를 복사했습니다")).toBeVisible();
      await editor.click(); await editor.press("Control+Home");
      const selectionCopy = page.getByRole("button", { name: /선택 복사/, exact: false }).last();
      await selectionCopy.click();
      await expect(page.getByText("복사할 본문 영역을 먼저 선택해 주세요.")).toBeVisible();
      await editor.click(); await editor.press("Control+Home");
      await page.keyboard.down("Shift"); await page.keyboard.press("End"); await page.keyboard.up("Shift");
      await selectionCopy.click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("첫 기록 본문");
      await expect(page.getByText("선택한 라임 표현을 복사했습니다")).toBeVisible();
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await selectionCopy.click();
      const copyDialog = page.getByRole("dialog", { name: "직접 복사해 주세요" });
      await expect(copyDialog.getByRole("textbox", { name: "수동 복사할 라임 노트" })).toHaveValue("첫 기록 본문");
      await copyDialog.getByRole("button", { name: "닫기" }).click();
      expect(await horizontalOverflow(page)).toBe(false);
      if (info.project.name === "mobile") {
        const dock = await page.locator(".rhyme-mobile-dock").boundingBox();
        expect(dock).not.toBeNull(); expect(dock!.y + dock!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
      }
      await page.screenshot({ path: `test-results/rhyme-editor-${info.project.name}.png`, fullPage: true });

      if (info.project.name === "mobile") {
        await page.getByRole("button", { name: /태그·설정/ }).click();
        await page.getByRole("dialog", { name: "태그와 표시 설정" }).getByRole("button", { name: "라임 노트 삭제" }).click();
      } else await page.getByRole("button", { name: "삭제", exact: true }).click();
      const confirm = page.getByRole("dialog", { name: "‘두 탭 라임 제목’ 라임 노트를 삭제할까요?" });
      await expect(confirm).toBeVisible(); await confirm.getByRole("button", { name: "취소" }).click();
      await expect(page).toHaveURL(`/rhymes/${id}`);
      if (info.project.name === "mobile") {
        await page.getByRole("button", { name: /태그·설정/ }).click();
        await page.getByRole("dialog", { name: "태그와 표시 설정" }).getByRole("button", { name: "라임 노트 삭제" }).click();
      } else await page.getByRole("button", { name: "삭제", exact: true }).click();
      await page.getByRole("button", { name: "라임 노트 삭제 확인" }).click();
      await expect(page).toHaveURL("/rhymes");
      expect((await page.request.get(`/api/rhymes/${id}`)).status()).toBe(404);
    } finally { await removeAccount(owner.userId); }
  });

  test("keeps missing and oversized titles local and offers a named discard confirmation", async ({ context, page }) => {
    const owner = await account([context]);
    try {
      await page.goto("/rhymes/new");
      await expect(page.getByText("제목을 입력하면 노트가 자동으로 생성됩니다.")).toBeVisible();
      await page.getByRole("textbox", { name: "자유 본문" }).fill("제목 없이 보존할 본문");
      await page.waitForTimeout(1_100); await expect(page).toHaveURL("/rhymes/new");
      await page.getByRole("textbox", { name: "노트 제목" }).fill("가".repeat(201));
      await expect(page.getByText("제목은 200자 이하로 입력해 주세요.")).toBeVisible();
      await page.waitForTimeout(1_100); await expect(page).toHaveURL("/rhymes/new");
      await page.getByRole("button", { name: "취소", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "새 라임 노트 작성을 취소할까요?" });
      await dialog.getByRole("button", { name: "계속 작성" }).click();
      await expect(page.getByRole("textbox", { name: "자유 본문" })).toHaveValue("제목 없이 보존할 본문");
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await page.getByRole("button", { name: "초안 삭제 후 나가기" }).click();
      await expect(page).toHaveURL("/rhymes");
    } finally { await removeAccount(owner.userId); }
  });

  test("shows an empty song picker after a failed candidate request is retried", async ({ context, page }, info) => {
    const owner = await account([context]);
    try {
      const created = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "곡 후보 오류 복구", body: "retry" } });
      expect(created.status()).toBe(201);
      const id = (await created.json()).rhyme.id as string;
      await page.route(`**/api/rhymes/${id}/songs?*`, (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await page.goto(`/rhymes/${id}`); await ready(page);
      if (info.project.name === "mobile") await page.getByRole("button", { name: /태그·설정/ }).click();
      const settings = info.project.name === "mobile" ? page.getByRole("dialog", { name: "태그와 표시 설정" }) : page.getByRole("complementary", { name: "라임 노트 설정" });
      await expect(settings.getByRole("alert")).toContainText("곡 목록을 불러오지 못했습니다.");
      await settings.getByRole("button", { name: "다시 시도" }).click();
      await expect(settings.getByText("연결할 수 있는 곡이 없습니다.")).toBeVisible();
    } finally { await removeAccount(owner.userId); }
  });

  test("keeps a maximum-size body and thirty tags usable without horizontal overflow", async ({ context, page }, info) => {
    test.setTimeout(120_000);
    const owner = await account([context]);
    const initialBody = `${"가".repeat(99_990)}\n마지막 라임`;
    try {
      const created = await page.request.post("/api/rhymes", {
        headers,
        data: { requestId: randomUUID(), title: "긴 라임과 많은 태그", body: initialBody }
      });
      expect(created.status()).toBe(201);
      const id = (await created.json()).rhyme.id as string;
      await page.goto(`/rhymes/${id}`); await ready(page);

      const editor = page.locator(".cm-content");
      await editor.press("Control+End");
      await page.keyboard.insertText(" 끝");
      await expect.poll(() => body(page, id), { timeout: 20_000 }).toBe(`${initialBody} 끝`);

      if (info.project.name === "mobile") await page.getByRole("button", { name: /태그·설정/ }).click();
      const settings = info.project.name === "mobile"
        ? page.getByRole("dialog", { name: "태그와 표시 설정" })
        : page.getByRole("complementary", { name: "라임 노트 설정" });
      for (let index = 1; index <= 30; index += 1) {
        const input = settings.getByRole("textbox", { name: "새 태그" });
        await input.fill(`태그 ${String(index).padStart(2, "0")}`);
        await settings.getByRole("button", { name: "추가", exact: true }).click();
        await expect(input).toHaveValue("");
      }
      await expect(settings.getByText("30 / 30", { exact: true })).toBeVisible();
      await settings.getByRole("textbox", { name: "새 태그" }).fill("한도 초과 태그");
      await settings.getByRole("button", { name: "추가", exact: true }).click();
      await expect(page.getByText("태그를 추가하지 못했습니다. 기존 본문과 태그는 그대로 보존됩니다.")).toBeVisible();
      await expect(settings.getByText("30 / 30", { exact: true })).toBeVisible();
      const lastTag = settings.getByRole("button", { name: "#태그 30", exact: true });
      await lastTag.focus(); await expect(lastTag).toBeFocused();
      expect(await horizontalOverflow(page)).toBe(false);
    } finally { await removeAccount(owner.userId); }
  });
});

async function account(contexts: BrowserContext[]) {
  const userId = randomUUID(), token = `rhyme-editor-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'라임 편집 합성 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  for (const context of contexts) await addSession(context, token);
  return { userId, token };
}
async function addSession(context: BrowserContext, token: string) { await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); }
async function ready(page: Page) { await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true", { timeout: 20_000 }); await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible(); }
async function documentKey(page: Page, id: string) { const response = await page.request.post(`/collaboration/documents/${id}`, { headers }); expect(response.ok()).toBe(true); return (await response.json()).documentKey as string; }
async function checkpoint(page: Page, id: string) { const response = await page.request.post(`/collaboration/documents/${await documentKey(page, id)}/revisions`, { headers, data: { reason: "leave" } }); expect(response.ok()).toBe(true); }
async function rhyme(page: Page, id: string) { const response = await page.request.get(`/api/rhymes/${id}`); return (await response.json()).rhyme as { title: string; body: string }; }
async function body(page: Page, id: string) { return (await rhyme(page, id)).body; }
async function horizontalOverflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); }
async function removeAccount(id: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined)); }
