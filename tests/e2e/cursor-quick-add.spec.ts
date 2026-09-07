import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("cursor insertion and global quick add", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("inserts whole and selected rhyme at CRDT-relative positions with one undo", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, "커서 삽입 사용자");
    try {
      const songId = await createSong(page, "삽입 곡");
      const lyricId = await createLyric(page, songId, "삽입 대상", "AA TARGET ZZ");
      const rhymeId = await createRhyme(page, "삽입 라임", "linked rhyme body");
      await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers });
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const editor = page.locator(".cm-content");

      await editor.focus(); await page.keyboard.press("Control+Home");
      let panel = await openRhymePanel(page, testInfo.project.name === "mobile");
      let card = panel.locator("li", { hasText: "삽입 라임" });
      await card.getByRole("button", { name: "전체 삽입" }).click();
      await expect(editor).toContainText("linked rhyme bodyAA TARGET ZZ");
      await editor.press("Control+z");
      await expect(editor).toContainText("AA TARGET ZZ");

      await editor.focus(); await page.keyboard.press("Control+Home");
      for (let index = 0; index < 3; index++) await page.keyboard.press("ArrowRight");
      for (let index = 0; index < 6; index++) await page.keyboard.press("Shift+ArrowRight");
      panel = await openRhymePanel(page, testInfo.project.name === "mobile");
      card = panel.locator("li", { hasText: "삽입 라임" });
      await card.getByRole("button", { name: "선택 삽입" }).click();
      const selector = page.getByRole("textbox", { name: "삽입할 라임 표현 선택" });
      await expect(selector).toBeFocused();
      await selector.evaluate((element: HTMLTextAreaElement) => {
        element.setSelectionRange(7, 12);
        element.dispatchEvent(new Event("select", { bubbles: true }));
      });
      await expect.poll(() => selector.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([7, 12]);

      const remote = await context.newPage();
      await remote.goto(`/lyrics/${lyricId}`);
      await expect(remote.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const remoteEditor = remote.locator(".cm-content");
      await remoteEditor.focus(); await remote.keyboard.press("Control+Home"); await remote.keyboard.insertText("REMOTE ");
      await expect(editor).toContainText("REMOTE AA TARGET ZZ");

      await page.getByRole("button", { name: "선택 영역 삽입" }).click();
      await expect(editor).toContainText("REMOTE AA rhyme ZZ");
      await editor.press("Control+z");
      await expect(editor).toContainText("REMOTE AA TARGET ZZ");
      await remote.close();

      await editor.focus(); await page.keyboard.press("Control+End");
      panel = await openRhymePanel(page, testInfo.project.name === "mobile");
      card = panel.locator("li", { hasText: "삽입 라임" });
      await card.getByRole("button", { name: "전체 삽입" }).click();
      await expect(editor).toContainText("REMOTE AA TARGET ZZlinked rhyme body");
      await editor.press("Control+z");
      await expect(editor).toContainText("REMOTE AA TARGET ZZ");
    } finally { await deleteAccounts([account.userId]); }
  });

  test("offers the four global create flows and validates a lyric parent", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, "빠른 추가 사용자");
    try {
      const songId = await createSong(page, "부모 곡 후보");
      await page.goto("/workspace");
      await quickButton(page, testInfo.project.name === "mobile").click();
      const dialog = page.getByRole("dialog", { name: "빠른 추가" });
      for (const name of ["새 곡", "새 가사", "새 라임", "새 프롬프트"]) await expect(dialog.getByRole("link", { name: new RegExp(name) })).toBeVisible();
      await dialog.getByRole("link", { name: /새 가사/ }).click();
      await expect(page).toHaveURL(/\/lyrics\/new/);
      await page.getByLabel("가사 제목").fill("빠른 가사 초안");
      await page.getByRole("radio", { name: /부모 곡 후보/ }).check();
      await page.getByRole("button", { name: "가사 만들고 편집" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]{36}/);

      await page.goto(`/songs/${songId}`);
      await quickButton(page, testInfo.project.name === "mobile").click();
      await page.getByRole("dialog", { name: "빠른 추가" }).getByRole("link", { name: /새 가사/ }).click();
      await expect(page.getByText("현재 열려 있던 곡을 사용합니다.")).toBeVisible();
      await expect(page.getByRole("radio", { name: /부모 곡 후보/ })).toBeChecked();
      await page.getByRole("link", { name: "취소" }).click();
      await expect(page).toHaveURL(new RegExp(`/songs/${songId}`));

      for (const href of ["/workspace", "/songs", "/rhymes", "/prompts"]) {
        await page.goto(href);
        await expect(quickButton(page, testInfo.project.name === "mobile")).toBeVisible();
      }

      if (testInfo.project.name !== "mobile") {
        await page.goto(`/lyrics/new?songId=${songId}`);
        await page.getByLabel("가사 제목").fill("권한 소실 가사");
        expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
        await page.getByRole("button", { name: "가사 만들고 편집" }).click();
        await expect(page.getByText(/선택한 곡이 삭제되었거나 접근 권한이 없습니다/)).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/lyrics/new`));
      }
    } finally { await deleteAccounts([account.userId]); }
  });

  test("preserves the exact rhyme when the captured lyric is deleted", async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop failure-path coverage");
    const account = await createAccount(context, "삭제 대상 삽입 사용자");
    try {
      const songId = await createSong(page, "삭제 대상 곡");
      const lyricId = await createLyric(page, songId, "삭제 대상 가사", "TARGET");
      const rhymeId = await createRhyme(page, "보존 라임", "exact fallback rhyme");
      await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers });
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const panel = await openRhymePanel(page, false, "보존 라임");
      await panel.locator("li", { hasText: "보존 라임" }).getByRole("button", { name: "선택 삽입" }).click();
      const selector = page.getByRole("textbox", { name: "삽입할 라임 표현 선택" });
      await selector.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, element.value.length));
      expect((await page.request.delete(`/api/lyrics/${lyricId}`, { headers })).status()).toBe(200);
      await page.getByRole("button", { name: "선택 영역 삽입" }).click();
      const fallback = page.getByRole("dialog", { name: "직접 복사: 라임 표현" });
      await expect(fallback.getByRole("textbox", { name: "수동 복사할 라임 표현" })).toHaveValue("exact fallback rhyme");
      await expect(page.getByText(/현재 가사가 삭제되었거나 접근할 수 없습니다/)).toBeVisible();
    } finally { await deleteAccounts([account.userId]); }
  });

  test("does not insert while an IME composition is active", async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop IME coverage");
    const account = await createAccount(context, "IME 삽입 사용자");
    try {
      const songId = await createSong(page, "IME 곡");
      const lyricId = await createLyric(page, songId, "IME 가사", "조합 보존");
      const rhymeId = await createRhyme(page, "IME 라임", "삽입 금지");
      await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers });
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const editor = page.locator(".cm-content");
      await editor.dispatchEvent("compositionstart", { data: "ㅎ" });
      const panel = await openRhymePanel(page, false, "IME 라임");
      await panel.locator("li", { hasText: "IME 라임" }).getByRole("button", { name: "전체 삽입" }).click();
      await expect(page.getByText(/한글 조합 입력을 먼저 확정/)).toBeVisible();
      await expect(editor).not.toContainText("삽입 금지");
      await editor.dispatchEvent("compositionend", { data: "한" });
      await panel.locator("li", { hasText: "IME 라임" }).getByRole("button", { name: "전체 삽입" }).click();
      await expect(editor).toContainText("삽입 금지");
    } finally { await deleteAccounts([account.userId]); }
  });

  test("recovers one offline quick idea with the same idempotency key", async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile quick idea recovery");
    const account = await createAccount(context, "오프라인 아이디어 사용자");
    try {
      await page.goto("/workspace");
      await context.setOffline(true);
      await quickButton(page, true).click();
      const dialog = page.getByRole("dialog", { name: "빠른 추가" });
      await dialog.getByRole("textbox").fill("offline-once-idea");
      await dialog.getByRole("button", { name: "오프라인 초안 저장" }).click();
      await expect(page.getByText(/오프라인 초안을 이 기기에 저장/)).toBeVisible();
      await page.close();
      await context.setOffline(false);
      const recovered = await context.newPage();
      await recovered.goto("/workspace");
      await expect.poll(async () => {
        const response = await recovered.request.get("/api/rhymes?search=offline-once-idea&sort=updated_desc&limit=20");
        return response.ok() ? (await response.json()).items.length as number : -1;
      }).toBe(1);
      await recovered.reload();
      const result = await (await recovered.request.get("/api/rhymes?search=offline-once-idea&sort=updated_desc&limit=20")).json();
      expect(result.items).toHaveLength(1);
    } finally { await context.setOffline(false); await deleteAccounts([account.userId]); }
  });

  test("keeps exact content in the shared manual-copy fallback", async ({ context, page }) => {
    const account = await createAccount(context, "수동 복사 사용자");
    try {
      const songId = await createSong(page, "복사 곡");
      const lyricId = await createLyric(page, songId, "복사 가사", "[Hook]\n복사 원문");
      await page.goto(`/lyrics/${lyricId}`);
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await page.getByRole("button", { name: /전체 복사/ }).first().click();
      const dialog = page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" });
      await expect(dialog.getByRole("textbox", { name: "수동 복사할 가사" })).toHaveValue("[Hook]\n복사 원문");
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function openRhymePanel(page: Page, mobile: boolean, expectedTitle = "삽입 라임") {
  if (mobile && !await page.getByRole("dialog", { name: "작업 자료" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /≋ 다른 가사 .*자료/ }).click();
  }
  const panel = mobile ? page.getByRole("dialog", { name: "작업 자료" }) : page.getByRole("complementary", { name: "작업 자료" });
  await panel.getByRole("tab", { name: "라임" }).click();
  await expect(panel.getByText(expectedTitle)).toBeVisible();
  return panel;
}

function quickButton(page: Page, mobile: boolean) {
  return mobile ? page.locator("a.quick-add") : page.locator("button.top-quick-add");
}

async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201); return (await response.json()).song.id as string;
}
async function createLyric(page: Page, songId: string, title: string, body: string): Promise<string> {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201); return (await response.json()).lyric.id as string;
}
async function createRhyme(page: Page, title: string, body: string): Promise<string> {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201); return (await response.json()).rhyme.id as string;
}
async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `phase4-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}
async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
