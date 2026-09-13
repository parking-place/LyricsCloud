import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.3 public-link guest writing", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");
  test.skip(process.env.PUBLIC_GUEST_WRITER_E2E !== "true",
    "runs separately so the fixed public pre-authentication handshake budget remains meaningful");

  test("requires owner confirmation, converges isolated guests and preserves only rejected local input", async ({ browser }, info) => {
    const mobile = info.project.name.includes("mobile");
    const contextOptions = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(contextOptions);
    const guestAContext = await browser.newContext(contextOptions);
    const guestBContext = await browser.newContext(contextOptions);
    const owner = await account(ownerContext, "공개 쓰기 소유자");
    const ownerPage = await ownerContext.newPage();
    const guestAPage = await guestAContext.newPage();
    const guestBPage = await guestBContext.newPage();
    try {
      const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "공개 공동 작업 곡" } });
      const songId = ((await songResponse.json()) as { song: { id: string } }).song.id;
      const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
        requestId: randomUUID(), title: "공개 게스트 가사", body: "[Verse]\n공개 게스트 원문", memo: "게스트에게 숨긴 소유자 메모"
      } });
      const lyricId = ((await lyricResponse.json()) as { lyric: { id: string } }).lyric.id;

      await ownerPage.goto(`/lyrics/${lyricId}`);
      await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      const dialog = await openSharingDialog(ownerPage);
      await dialog.getByRole("button", { name: "공개 링크 만들기" }).click();
      const issuedResponse = ownerPage.waitForResponse((response) => response.url().endsWith(`/api/lyrics/${lyricId}/public-link`)
        && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "확인하고 공개" }).click();
      const issued = await (await issuedResponse).json() as { url: string; link: { id: string } };
      const accessButtons = dialog.locator(".sharing-public-access button");
      await expect(accessButtons).toHaveCount(2);
      await expect(accessButtons.nth(0)).toHaveAttribute("aria-pressed", "true");
      await accessButtons.nth(1).click();
      const risk = dialog.locator(".sharing-public-write-risk");
      await expect(risk).toContainText("링크를 가진 누구나 계정 없이 새 게스트 세션");
      await expect(risk).toContainText("작업 메모·연결 자료·버전 복원·삭제·권한 관리");
      await risk.getByRole("button", { name: "위험을 이해하고 쓰기 허용" }).click();
      await expect(dialog.locator(".sharing-notice")).toContainText("비로그인 게스트 쓰기를 허용", { timeout: 10_000 });
      await expect(accessButtons.nth(1)).toHaveAttribute("aria-pressed", "true");

      await Promise.all([guestAPage.goto(issued.url), guestBPage.goto(issued.url)]);
      for (const page of [guestAPage, guestBPage]) {
        await expect(page).toHaveURL(/\/shared\/public$/);
        await expect(page.locator(".shared-read-badge")).toContainText("게스트 공동 작성", { timeout: 15_000 });
        await expect(page.getByLabel("공유된 가사 본문")).toHaveAttribute("contenteditable", "true");
        await expect(page.getByText("게스트에게 숨긴 소유자 메모")).toHaveCount(0);
        await expect(page.getByRole("button", { name: /삭제|권한 관리|버전 복원/ })).toHaveCount(0);
      }
      const guestA = await storedGuestId(guestAPage);
      const guestB = await storedGuestId(guestBPage);
      expect(guestA).not.toBe(guestB);
      expect((await guestAContext.request.get("/api/export")).status()).toBe(401);
      expect((await guestAContext.request.get(`/api/lyrics/${lyricId}`)).status()).toBe(401);
      expect((await guestAContext.request.get(`/api/lyrics/${lyricId}/resources?tab=lyrics`)).status()).toBe(401);

      const editorA = guestAPage.getByLabel("공유된 가사 본문");
      const editorB = guestBPage.getByLabel("공유된 가사 본문");
      await editorA.click(); await guestAPage.keyboard.press("Control+End");
      await editorB.click(); await guestBPage.keyboard.press("Control+End");
      await Promise.all([guestAPage.keyboard.insertText(" 게스트A"), guestBPage.keyboard.insertText(" 게스트B")]);
      for (const target of [editorA, editorB, ownerPage.getByLabel("가사 본문")]) {
        await expect(target).toContainText("게스트A", { timeout: 15_000 });
        await expect(target).toContainText("게스트B", { timeout: 15_000 });
      }
      await expect(dialog.locator(".sharing-presence")).toContainText("공개 게스트", { timeout: 10_000 });
      await expect(guestAPage.locator(".shared-viewers")).toContainText("게스트 공동 작성", { timeout: 10_000 });

      if (info.project.name === "desktop" || info.project.name === "chromium-desktop") {
        const beforeComposition = await editorA.innerText();
        await editorA.dispatchEvent("compositionstart", { data: "ㅎ" });
        await editorA.fill(`${beforeComposition} ㅎ`);
        await guestAPage.waitForTimeout(150);
        await expect(editorB).not.toContainText(" ㅎ");
        await editorA.fill(`${beforeComposition} 완성한글`);
        await editorA.dispatchEvent("compositionend", { data: "한글" });
        await expect(editorB).toContainText("완성한글", { timeout: 15_000 });
        await editorA.click(); await guestAPage.keyboard.press("Control+End"); await guestAPage.keyboard.insertText(" 되돌릴입력");
        await expect(editorB).toContainText("되돌릴입력", { timeout: 15_000 });
        await guestAPage.keyboard.press("Control+z");
        await expect(editorA).not.toContainText("되돌릴입력", { timeout: 15_000 });
        await expect(editorB).not.toContainText("되돌릴입력", { timeout: 15_000 });
      }

      await guestAContext.setOffline(true);
      await expect(guestAPage.getByRole("status")).toContainText("오프라인", { timeout: 10_000 });
      await editorA.click(); await guestAPage.keyboard.press("Control+End"); await guestAPage.keyboard.insertText(" 미전송게스트입력");
      await accessButtons.nth(0).click();
      await expect(dialog.locator(".sharing-notice")).toContainText("게스트 쓰기를 중지", { timeout: 10_000 });
      await guestAContext.setOffline(false);
      await expect(guestAPage.locator(".shared-read-badge")).toContainText("읽기 전용", { timeout: 15_000 });
      await expect(editorA).toHaveAttribute("contenteditable", "false");
      const recovery = guestAPage.locator(".shared-writer-recovery");
      await expect(recovery).toContainText("미전송게스트입력", { timeout: 15_000 });
      await expect(recovery).toContainText("현재 탭의 게스트 세션에만 연결");
      await expect(recovery).not.toContainText("공개 게스트 원문");
      await expect(recovery).not.toContainText("게스트에게 숨긴 소유자 메모");
      const ownerProjection = await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json() as { lyric: { body: string } };
      expect(ownerProjection.lyric.body).not.toContain("미전송게스트입력");

      await accessButtons.nth(1).click();
      await dialog.locator(".sharing-public-write-risk").getByRole("button", { name: "위험을 이해하고 쓰기 허용" }).click();
      await guestAPage.reload();
      await expect(guestAPage.locator(".shared-read-badge")).toContainText("게스트 공동 작성", { timeout: 15_000 });
      await expect(guestAPage.getByRole("status")).toContainText("실시간으로 연결됨", { timeout: 15_000 });
      await expect(guestAPage.locator(".shared-writer-recovery")).toContainText("미전송게스트입력");
      await expect(guestAPage.getByLabel("공유된 가사 본문")).not.toContainText("미전송게스트입력");

      await dialog.getByRole("button", { name: "공개 링크 회수" }).click();
      await expect(dialog.locator(".sharing-notice")).toContainText("공개 링크를 회수", { timeout: 10_000 });
      for (const page of [guestAPage, guestBPage]) {
        await expect(page.getByRole("heading", { name: "공유 가사를 열 수 없습니다" })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("게스트에게 숨긴 소유자 메모")).toHaveCount(0);
      }
    } finally {
      await Promise.all([guestAContext.setOffline(false).catch(() => undefined), guestBContext.setOffline(false).catch(() => undefined)]);
      await Promise.all([ownerContext.close(), guestAContext.close(), guestBContext.close()]);
      await removeAccounts([owner.userId]);
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

async function storedGuestId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("lyricscloud:public-guest-session:v1");
    if (!raw) throw new Error("guest session missing");
    const value = JSON.parse(raw) as { id?: unknown };
    if (typeof value.id !== "string") throw new Error("guest id missing");
    return value.id;
  });
}

async function account(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `public-writer-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function removeAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
