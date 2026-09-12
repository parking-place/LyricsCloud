import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.0 selected-account lyric sharing", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("grants a selected reader, streams read-only updates, shows minimal presence and revokes access", async ({ browser }, info) => {
    const mobile = info.project.name === "mobile";
    const contextOptions = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(contextOptions);
    const readerContext = await browser.newContext(contextOptions);
    const strangerContext = await browser.newContext(contextOptions);
    const owner = await account(ownerContext, "공유 소유자");
    const reader = await account(readerContext, "선택 독자");
    const stranger = await account(strangerContext, "무관 사용자");
    const ownerPage = await ownerContext.newPage();
    const readerPage = await readerContext.newPage();
    try {
      const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "공유 곡" } });
      const songId = ((await songResponse.json()) as { song: { id: string } }).song.id;
      const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
        requestId: randomUUID(), title: "선택 공유 가사", body: "[Verse]\n공유 원문", memo: "소유자만 보는 비밀 메모"
      } });
      const lyricId = ((await lyricResponse.json()) as { lyric: { id: string } }).lyric.id;

      const anonymousContext = await browser.newContext(contextOptions);
      try {
        const anonymousPage = await anonymousContext.newPage();
        await anonymousPage.goto(`/shared/lyrics/${lyricId}`);
        await expect(anonymousPage).toHaveURL(new RegExp(`/auth\\?returnTo=.*${lyricId}`));
        await expect(anonymousPage.getByRole("link", { name: /Google 계정으로 계속하기/ }))
          .toHaveAttribute("href", new RegExp(`returnTo=.*${lyricId}`));
      } finally { await anonymousContext.close(); }

      await ownerPage.goto(`/lyrics/${lyricId}`);
      await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      await visibleShareButton(ownerPage).click();
      const dialog = ownerPage.getByRole("dialog", { name: "가사 공유" });
      await expect(dialog).toContainText("작업 메모, 연결 자료, 버전 기록");
      await expect(dialog).not.toContainText("소유자만 보는 비밀 메모");
      await dialog.getByLabel("공유할 계정 코드").fill(reader.sharingId);
      await dialog.getByRole("button", { name: "읽기 권한 부여" }).click();
      await expect(dialog.getByRole("status")).toContainText("읽기 권한을 부여");
      await expect(dialog.locator(".sharing-grants")).toContainText("선택 독자");
      await dialog.getByRole("button", { name: "닫기" }).click();

      await readerPage.goto(`/shared/lyrics/${lyricId}`);
      await expect(readerPage.getByRole("heading", { name: "선택 공유 가사" })).toBeVisible();
      await expect(readerPage.getByLabel("공유된 가사 본문")).toContainText("공유 원문");
      await expect(readerPage.locator(".shared-read-badge")).toContainText("읽기 전용");
      await expect(readerPage.getByRole("status")).toContainText("실시간으로 연결됨", { timeout: 15_000 });
      await expect(readerPage.getByText("소유자만 보는 비밀 메모")).toHaveCount(0);
      await expect(readerPage.getByRole("button", { name: /수정|삭제|권한/ })).toHaveCount(0);

      const editor = ownerPage.getByLabel("가사 본문");
      await editor.click(); await ownerPage.keyboard.press("End"); await ownerPage.keyboard.type(" 갱신");
      await expect(readerPage.getByLabel("공유된 가사 본문")).toContainText("공유 원문 갱신", { timeout: 15_000 });

      await visibleShareButton(ownerPage).click();
      await expect(dialog.locator(".sharing-presence")).toContainText("선택 독자", { timeout: 10_000 });
      await dialog.getByRole("button", { name: "권한 회수" }).click();
      await expect(dialog.getByRole("status")).toContainText("권한을 회수");
      await expect(readerPage.getByRole("heading", { name: "이 가사를 더 이상 열 수 없습니다" })).toBeVisible({ timeout: 10_000 });
      expect((await readerContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(404);
      expect((await strangerContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(404);
      const strangerPage = await strangerContext.newPage();
      await strangerPage.goto(`/shared/lyrics/${lyricId}`);
      await expect(strangerPage.getByRole("heading", { name: "공유 가사를 열 수 없습니다" })).toBeVisible();
      await expect(strangerPage.getByText("선택 공유 가사")).toHaveCount(0);
    } finally {
      await Promise.all([ownerContext.close(), readerContext.close(), strangerContext.close()]);
      await removeAccounts([owner.userId, reader.userId, stranger.userId]);
    }
  });
});

function visibleShareButton(page: import("@playwright/test").Page) {
  return page.locator("button:visible", { hasText: /^공유$/ }).first();
}

async function account(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `share-${randomUUID()}`;
  const sharingId = await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    const result = await pool.query<{ sharing_id: string }>("insert into user_profiles(owner_id,display_name) values($1,$2) returning sharing_id", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    return result.rows[0]!.sharing_id;
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, sharingId };
}

async function removeAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
