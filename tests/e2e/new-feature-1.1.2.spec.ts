import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.2 selected-account lyric writing", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("lets the owner select a writer, converges edits, downgrades safely and preserves rejected local text", async ({ browser }, info) => {
    const mobile = info.project.name.includes("mobile");
    const contextOptions = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(contextOptions);
    const writerContext = await browser.newContext(contextOptions);
    const readerContext = await browser.newContext(contextOptions);
    const strangerContext = await browser.newContext(contextOptions);
    const owner = await account(ownerContext, "공동 작업 소유자");
    const writer = await account(writerContext, "선택 공동 작성자");
    const reader = await account(readerContext, "선택 읽기 전용 사용자");
    const stranger = await account(strangerContext, "공동 작업 무관 사용자");
    const ownerPage = await ownerContext.newPage();
    const writerPage = await writerContext.newPage();
    const readerPage = await readerContext.newPage();
    try {
      const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "공동 작업 곡" } });
      const songId = ((await songResponse.json()) as { song: { id: string } }).song.id;
      const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
        requestId: randomUUID(), title: "함께 쓰는 가사", body: "[Verse]\n소유자 원문", memo: "공유하지 않는 메모"
      } });
      const lyricId = ((await lyricResponse.json()) as { lyric: { id: string } }).lyric.id;
      const grantResponse = await ownerContext.request.post(`/api/lyrics/${lyricId}/shares`, { headers, data: {
        requestId: randomUUID(), sharingId: writer.sharingId
      } });
      expect(grantResponse.status()).toBe(201);
      const grantId = ((await grantResponse.json()) as { grant: { id: string } }).grant.id;
      const readerGrantResponse = await ownerContext.request.post(`/api/lyrics/${lyricId}/shares`, { headers, data: {
        requestId: randomUUID(), sharingId: reader.sharingId
      } });
      expect(readerGrantResponse.status()).toBe(201);
      const readerGrantId = ((await readerGrantResponse.json()) as { grant: { id: string } }).grant.id;

      await ownerPage.goto(`/lyrics/${lyricId}`);
      const ownerEditor = ownerPage.getByLabel("가사 본문");
      await expect(ownerEditor).toBeVisible({ timeout: 15_000 });
      const dialog = await openSharingDialog(ownerPage);
      const writerGrant = dialog.locator(".sharing-grants li", { hasText: "선택 공동 작성자" });
      const readerGrant = dialog.locator(".sharing-grants li", { hasText: "선택 읽기 전용 사용자" });
      await expect(writerGrant).toContainText("읽기 전용");
      await expect(readerGrant).toContainText("읽기 전용");
      await writerGrant.getByRole("button", { name: "공동 작성 허용" }).click();
      await expect(dialog.getByRole("status")).toContainText("공동 작성자로 변경");
      await expect(writerGrant).toContainText("공동 작성");
      await dialog.getByRole("button", { name: "닫기" }).click();

      await writerPage.goto(`/shared/lyrics/${lyricId}`);
      const writerEditor = writerPage.getByLabel("공유된 가사 본문");
      await expect(writerPage.locator(".shared-read-badge")).toContainText("공동 작성", { timeout: 15_000 });
      await expect(writerEditor).toHaveAttribute("contenteditable", "true");
      await readerPage.goto(`/shared/lyrics/${lyricId}`);
      const readerEditor = readerPage.getByLabel("공유된 가사 본문");
      await expect(readerPage.locator(".shared-read-badge")).toContainText("읽기 전용", { timeout: 15_000 });
      await expect(readerEditor).toHaveAttribute("contenteditable", "false");
      await writerEditor.click(); await writerPage.keyboard.press("Control+End"); await writerPage.keyboard.insertText(" 공동작성");
      await expect(writerPage.getByRole("status")).toContainText("모든 변경 저장됨", { timeout: 15_000 });
      await expect(ownerEditor).toContainText("소유자 원문 공동작성", { timeout: 15_000 });
      await expect(readerEditor).toContainText("소유자 원문 공동작성", { timeout: 15_000 });

      await ownerEditor.click(); await ownerPage.keyboard.press("Control+End");
      await writerEditor.click(); await writerPage.keyboard.press("Control+End");
      await Promise.all([
        ownerPage.keyboard.insertText(" 소유자동시"),
        writerPage.keyboard.insertText(" 작성자동시")
      ]);
      for (const target of [ownerEditor, writerEditor, readerEditor]) {
        await expect(target).toContainText("소유자동시", { timeout: 15_000 });
        await expect(target).toContainText("작성자동시", { timeout: 15_000 });
      }

      if (info.project.name === "chromium-desktop") {
        const beforeComposition = await writerEditor.innerText();
        await writerEditor.dispatchEvent("compositionstart", { data: "ㅎ" });
        await writerEditor.fill(`${beforeComposition} ㅎ`);
        await writerPage.waitForTimeout(150);
        await expect(ownerEditor).not.toContainText(" ㅎ");
        await writerEditor.fill(`${beforeComposition} 완성한글`);
        await writerEditor.dispatchEvent("compositionend", { data: "한글" });
        await expect(ownerEditor).toContainText("완성한글", { timeout: 15_000 });
      }

      await ownerEditor.click(); await ownerPage.keyboard.press("Control+End"); await ownerPage.keyboard.insertText(" 소유자추가");
      await expect(writerEditor).toContainText("소유자추가", { timeout: 15_000 });
      await writerEditor.click(); await writerPage.keyboard.press("Control+End"); await writerPage.keyboard.insertText(" 되돌릴입력");
      await expect(ownerEditor).toContainText("되돌릴입력", { timeout: 15_000 });
      await writerPage.keyboard.press("Control+z");
      await expect(writerEditor).not.toContainText("되돌릴입력", { timeout: 15_000 });
      await expect(ownerEditor).not.toContainText("되돌릴입력", { timeout: 15_000 });
      await expect(writerEditor).toContainText("소유자추가");
      await writerEditor.click(); await writerPage.keyboard.press("Home");
      await openSharingDialog(ownerPage);
      await expect(dialog.locator(".sharing-presence")).toContainText("선택 공동 작성자", { timeout: 10_000 });
      await expect(dialog.locator(".sharing-presence")).toContainText("선택 읽기 전용 사용자", { timeout: 10_000 });
      await expect(dialog.locator(".sharing-presence")).toContainText("작업 중", { timeout: 10_000 });

      const duplicateWriterPage = await writerContext.newPage();
      await duplicateWriterPage.goto(`/shared/lyrics/${lyricId}`);
      await expect(duplicateWriterPage.locator(".shared-read-badge")).toContainText("공동 작성", { timeout: 15_000 });
      await expect(dialog.locator(".sharing-presence li", { hasText: "선택 공동 작성자" })).toHaveCount(2, { timeout: 10_000 });
      await expect(duplicateWriterPage.locator(".shared-viewers")).toContainText("작업 중", { timeout: 10_000 });
      await duplicateWriterPage.close();
      await expect(dialog.locator(".sharing-presence li", { hasText: "선택 공동 작성자" })).toHaveCount(1, { timeout: 10_000 });
      if (info.project.name === "chromium-desktop") {
        await expect(dialog.locator(".sharing-presence")).toContainText("자리 비움", { timeout: 20_000 });
        await writerEditor.click(); await writerPage.keyboard.press("ArrowRight");
        await expect(dialog.locator(".sharing-presence")).toContainText("작업 중", { timeout: 10_000 });
      }

      await writerGrant.getByRole("button", { name: "읽기 전용으로 변경" }).click();
      await expect(writerPage.locator(".shared-read-badge")).toContainText("읽기 전용", { timeout: 10_000 });
      await expect(writerEditor).toHaveAttribute("contenteditable", "false");
      expect((await writerContext.request.patch(`/api/lyrics/${lyricId}/shares/${grantId}`, {
        headers, data: { access: "write", requestId: randomUUID() }
      })).status()).toBe(404);
      expect((await writerContext.request.delete(`/api/lyrics/${lyricId}/shares/${grantId}`, { headers })).status()).toBe(404);
      expect((await writerContext.request.patch(`/api/lyrics/${lyricId}/shares/${readerGrantId}`, {
        headers, data: { access: "write", requestId: randomUUID() }
      })).status()).toBe(404);
      const deniedDelete = await writerContext.request.delete(`/api/lyrics/${lyricId}`, { headers });
      expect(await deniedDelete.json()).toEqual({ deleted: false });

      await readerGrant.getByRole("button", { name: "권한 회수" }).click();
      await expect(readerPage.getByRole("heading", { name: "이 가사를 더 이상 열 수 없습니다" })).toBeVisible({ timeout: 10_000 });
      expect((await readerContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(404);
      const deniedReaderPage = await readerContext.newPage();
      await deniedReaderPage.goto(`/shared/lyrics/${lyricId}`);
      await expect(deniedReaderPage.getByRole("heading", { name: "공유 가사를 열 수 없습니다" })).toBeVisible();
      await deniedReaderPage.close();

      await writerGrant.getByRole("button", { name: "공동 작성 허용" }).click();
      await expect(writerPage.locator(".shared-read-badge")).toContainText("공동 작성", { timeout: 10_000 });
      await dialog.getByRole("button", { name: "닫기" }).click();
      await writerContext.setOffline(true);
      await expect(writerPage.getByRole("status")).toContainText("오프라인", { timeout: 10_000 });
      await writerEditor.click(); await writerPage.keyboard.press("Control+End"); await writerPage.keyboard.insertText(" 미전송보관");

      await openSharingDialog(ownerPage);
      await writerGrant.getByRole("button", { name: "읽기 전용으로 변경" }).click();
      await writerContext.setOffline(false);
      await expect(writerPage.locator(".shared-read-badge")).toContainText("읽기 전용", { timeout: 15_000 });
      await expect(writerPage.locator(".shared-writer-recovery")).toContainText("미전송보관", { timeout: 15_000 });
      await expect(writerPage.getByRole("button", { name: "텍스트 파일 저장" })).toBeVisible();
      await expect(writerEditor).not.toContainText("미전송보관");
      const ownerProjection = await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json() as { lyric: { body: string } };
      expect(ownerProjection.lyric.body).not.toContain("미전송보관");
      expect((await strangerContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(404);

      await writerGrant.getByRole("button", { name: "공동 작성 허용" }).click();
      await expect(writerPage.locator(".shared-read-badge")).toContainText("공동 작성", { timeout: 10_000 });
      await expect(writerPage.locator(".shared-writer-recovery")).toContainText("미전송보관");
      await expect(writerEditor).not.toContainText("미전송보관");
      await writerEditor.click(); await writerPage.keyboard.press("Control+End"); await writerPage.keyboard.insertText(" 재승격입력");
      await expect(ownerEditor).toContainText("재승격입력", { timeout: 15_000 });
      const acceptedAfterReenable = await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json() as { lyric: { body: string } };
      expect(acceptedAfterReenable.lyric.body).toContain("재승격입력");
      expect(acceptedAfterReenable.lyric.body).not.toContain("미전송보관");

      await writerGrant.getByRole("button", { name: "권한 회수" }).click();
      await expect(writerPage.getByRole("heading", { name: "이 가사를 더 이상 열 수 없습니다" })).toBeVisible({ timeout: 10_000 });
      await expect(writerPage.locator(".shared-writer-recovery")).toContainText("미전송보관");
      await expect(writerPage.getByText("공유하지 않는 메모")).toHaveCount(0);
    } finally {
      await writerContext.setOffline(false).catch(() => undefined);
      await Promise.all([ownerContext.close(), writerContext.close(), readerContext.close(), strangerContext.close()]);
      await removeAccounts([owner.userId, writer.userId, reader.userId, stranger.userId]);
    }
  });
});

function visibleShareButton(page: Page) { return page.locator("button:visible", { hasText: /^공유$/ }).first(); }

async function openSharingDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "가사 공유" });
  await expect(async () => {
    if (!(await dialog.isVisible())) await visibleShareButton(page).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 10_000 });
  return dialog;
}

async function account(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `writer-${randomUUID()}`;
  const sharingId = await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    const profile = await pool.query<{ sharing_id: string }>("insert into user_profiles(owner_id,display_name) values($1,$2) returning sharing_id", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    return profile.rows[0]!.sharing_id;
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, sharingId };
}

async function removeAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
