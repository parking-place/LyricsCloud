import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.1 public-link lyric reading", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("confirms public fields, removes the fragment, streams read-only updates and revokes the open tab", async ({ browser }, info) => {
    const mobile = info.project.name.includes("mobile");
    const contextOptions = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(contextOptions);
    const publicContext = await browser.newContext(contextOptions);
    const owner = await account(ownerContext, "공개 링크 소유자");
    const ownerPage = await ownerContext.newPage();
    const publicPage = await publicContext.newPage();
    try {
      const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "공개 링크 곡" } });
      const songId = ((await songResponse.json()) as { song: { id: string } }).song.id;
      const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
        requestId: randomUUID(), title: "링크로 읽는 가사", body: "[Verse]\n처음 공개 원문", memo: "절대 공개하지 않는 메모"
      } });
      const lyricId = ((await lyricResponse.json()) as { lyric: { id: string } }).lyric.id;

      await ownerPage.goto(`/lyrics/${lyricId}`);
      await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      await visibleShareButton(ownerPage).click();
      const dialog = ownerPage.getByRole("dialog", { name: "가사 공유" });
      await expect(dialog.locator(".sharing-public")).toContainText("비공개");
      await dialog.getByRole("button", { name: "공개 링크 만들기" }).click();
      await expect(dialog.getByText("공개 범위를 확인해 주세요")).toBeVisible();
      await dialog.getByLabel("내 표시 이름").check();
      const issued = ownerPage.waitForResponse((response) => response.url().endsWith(`/api/lyrics/${lyricId}/public-link`) && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "확인하고 공개" }).click();
      const issuePayload = await (await issued).json() as { url: string; link: { id: string } };
      await expect(dialog).toContainText("링크 공개 중");
      await expect(dialog).toContainText("지금 한 번만 링크를 복사할 수 있습니다");
      await expect(dialog).not.toContainText("절대 공개하지 않는 메모");
      await dialog.getByRole("button", { name: "닫기" }).click();

      await publicPage.route("**/api/public/shared-lyric", async (route) => { await new Promise((resolve) => setTimeout(resolve, 250)); await route.continue(); });
      await publicPage.goto(issuePayload.url);
      await expect(publicPage.getByRole("status")).toContainText("확인하는 중");
      await expect(publicPage).toHaveURL(/\/shared\/public$/);
      await expect(publicPage.getByRole("heading", { name: "링크로 읽는 가사" })).toBeVisible({ timeout: 15_000 });
      await expect(publicPage.getByLabel("공유된 가사 본문")).toContainText("처음 공개 원문");
      await expect(publicPage.getByText("공개 링크 소유자님이 공유함")).toBeVisible();
      await expect(publicPage.getByText("절대 공개하지 않는 메모")).toHaveCount(0);
      await expect(publicPage.getByRole("button", { name: /수정|삭제|권한/ })).toHaveCount(0);
      await expect(publicPage.getByRole("status")).toContainText("실시간으로 연결됨", { timeout: 15_000 });
      expect((await publicContext.request.get(`/api/lyrics/${lyricId}`)).status()).toBe(401);
      expect((await publicContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(401);

      if (info.project.name === "chromium-desktop") {
        await publicPage.reload();
        await expect(publicPage.getByRole("heading", { name: "링크로 읽는 가사" })).toBeVisible({ timeout: 15_000 });
        await expect(publicPage).toHaveURL(/\/shared\/public$/);
      }

      const editor = ownerPage.getByLabel("가사 본문");
      await editor.click(); await ownerPage.keyboard.press("End"); await ownerPage.keyboard.type(" 갱신");
      await expect(publicPage.getByLabel("공유된 가사 본문")).toContainText("처음 공개 원문 갱신", { timeout: 15_000 });

      await visibleShareButton(ownerPage).click();
      await dialog.getByRole("button", { name: "공개 링크 회수" }).click();
      await expect(dialog.getByRole("status")).toContainText("공개 링크를 회수");
      await expect(publicPage.getByRole("heading", { name: "공유 가사를 열 수 없습니다" })).toBeVisible({ timeout: 10_000 });
      await expect(publicPage.getByText("링크로 읽는 가사")).toHaveCount(0);

      if (info.project.name.startsWith("chromium-")) {
        const emptyLyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
          requestId: randomUUID(), title: "빈 공개 가사", body: "", memo: "빈 가사의 비공개 메모"
        } });
        const emptyLyricId = ((await emptyLyricResponse.json()) as { lyric: { id: string } }).lyric.id;
        const emptyIssueResponse = await ownerContext.request.post(`/api/lyrics/${emptyLyricId}/public-link`, { headers, data: {
          requestId: randomUUID(), expiresInDays: 1, fields: { ownerDisplayName: false, status: false, updatedAt: false }
        } });
        const emptyIssue = await emptyIssueResponse.json() as { url: string; link: { id: string } };
        await publicPage.goto(emptyIssue.url);
        await expect(publicPage.getByRole("heading", { name: "빈 공개 가사" })).toBeVisible({ timeout: 15_000 });
        await expect(publicPage.getByLabel("공유된 가사 본문")).toContainText("아직 입력된 가사가 없습니다.");
        await ownerContext.request.delete(`/api/lyrics/${emptyLyricId}/public-link/${emptyIssue.link.id}`, { headers });
      }
    } finally {
      await Promise.all([ownerContext.close(), publicContext.close()]);
      await removeAccounts([owner.userId]);
    }
  });

  test("shows the same generic unavailable state for missing and malformed capabilities", async ({ page, context }) => {
    const response = await context.request.get("/shared/public", { headers: { "User-Agent": "crawler-test" } });
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(await response.text()).not.toContain("token");
    for (const target of ["/shared/public", "/shared/public#invalid-link-value"]) {
      await page.goto(target);
      await expect(page.getByRole("heading", { name: "공유 가사를 열 수 없습니다" })).toBeVisible();
    }
  });
});

function visibleShareButton(page: Page) { return page.locator("button:visible", { hasText: /^공유$/ }).first(); }

async function account(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `public-share-${randomUUID()}`;
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
