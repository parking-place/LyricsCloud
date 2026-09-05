import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("complete song flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song flow integration");

  test("list, create, dashboard, edit, ownership, and soft delete remain consistent", async ({ browser, context, page }) => {
    const owner = await createAccount(context, "전체 흐름 사용자");
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, "다른 흐름 사용자");
    try {
      await page.goto("/songs?sort=title_asc");
      await expect(page.getByRole("heading", { name: "아직 만든 곡이 없어요" })).toBeVisible();
      await page.getByRole("link", { name: "첫 곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/new\?returnTo=/);

      await page.getByLabel("곡 제목").fill("전체 흐름 곡");
      await page.getByLabel("곡 설명").fill("대시보드에서 확인할 곡 설명");
      await page.getByLabel("작업 메모").fill("첫 줄 작업 메모\n둘째 줄도 그대로 보존");
      await page.getByRole("radio", { name: /가사 작성 중/ }).check();
      await page.getByRole("button", { name: "초록" }).click();
      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+\?returnTo=/);
      const songId = new URL(page.url()).pathname.split("/").at(-1)!;

      await expect(page.getByRole("heading", { name: "전체 흐름 곡" })).toBeVisible();
      await expect(page.getByText("대시보드에서 확인할 곡 설명")).toBeVisible();
      await expect(page.getByRole("heading", { name: "가사 작업 공간" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "연결 자료" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "작업 메모" })).toBeVisible();
      await expect(page.locator(".count-grid strong")).toHaveText(["0", "0", "0"]);
      await expect(page.getByText("현재 자료")).toHaveCount(1);
      await expect(page.getByText("아직 지원 전")).toHaveCount(2);
      await expect(page.getByText("첫 줄 작업 메모")).toContainText("둘째 줄도 그대로 보존");
      expect(await hasHorizontalOverflow(page)).toBe(false);
      const mainBox = await page.locator(".dashboard-main").boundingBox();
      const sideBox = await page.locator(".dashboard-side").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(sideBox).not.toBeNull();
      if (page.viewportSize()!.width > 720) {
        expect(sideBox!.x).toBeGreaterThan(mainBox!.x + mainBox!.width - 4);
      } else {
        expect(sideBox!.y).toBeGreaterThan(mainBox!.y + mainBox!.height - 4);
        const linkedBox = await page.locator(".linked-empty").boundingBox();
        const notesBox = await page.locator(".notes-panel").boundingBox();
        expect(linkedBox!.y).toBeLessThan(notesBox!.y);
      }

      await page.route(`**/api/songs/${songId}/pin`, (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DATABASE_UNAVAILABLE" } }) }));
      await page.getByRole("button", { name: "⌁ 고정" }).click();
      await expect(page.getByText("변경을 저장하지 못해 이전 상태로 되돌렸습니다.")).toBeVisible();
      await expect(page.getByRole("button", { name: "⌁ 고정" })).toHaveAttribute("aria-pressed", "false");
      await page.unroute(`**/api/songs/${songId}/pin`);

      await page.getByRole("button", { name: "⌁ 고정" }).click();
      await expect(page.getByRole("button", { name: "⌁ 고정됨" })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await expect(page.getByRole("button", { name: "★ 즐겨찾기됨" })).toHaveAttribute("aria-pressed", "true");

      const otherPage = await otherContext.newPage();
      const otherView = await otherPage.goto(`/songs/${songId}`);
      expect(otherView?.status()).toBe(404);
      await expect(otherPage.getByText("전체 흐름 곡")).toHaveCount(0);
      const otherDelete = await otherPage.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } });
      expect(await otherDelete.json()).toEqual({ deleted: false });

      await page.getByRole("link", { name: "곡 정보 수정" }).click();
      await expect(page.getByLabel("곡 제목")).toHaveValue("전체 흐름 곡");
      await page.getByLabel("곡 제목").fill("완성된 전체 흐름 곡");
      await page.getByRole("radio", { name: /완성/ }).check();
      await page.getByRole("button", { name: "파랑" }).click();
      await page.getByRole("button", { name: "변경 저장" }).click();
      await expect(page.getByRole("heading", { name: "완성된 전체 흐름 곡" })).toBeVisible();
      await expect(page.getByText("완성", { exact: true })).toBeVisible();
      await expect(page.getByText("파랑", { exact: true })).toBeVisible();

      await page.getByRole("link", { name: "← 곡 목록" }).click();
      await expect(page).toHaveURL(/\/songs\?sort=title_asc$/);
      const card = page.locator(".song-card", { hasText: "완성된 전체 흐름 곡" });
      await expect(card).toBeVisible();
      await expect(card.getByText("완성", { exact: true })).toBeVisible();
      await expect(card.getByRole("button", { name: /고정 해제/ })).toHaveAttribute("aria-pressed", "true");
      await card.getByRole("link").click();

      await page.getByRole("button", { name: "곡 삭제" }).click();
      await expect(page.getByRole("dialog")).toContainText("‘완성된 전체 흐름 곡’ 곡을 삭제할까요?");
      await expect(page.getByRole("dialog")).toContainText("가사도 함께 숨겨집니다");
      await expect(page.getByRole("button", { name: "취소" })).toBeFocused();
      await page.getByRole("button", { name: "취소" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "곡 삭제" }).click();
      await page.getByRole("button", { name: "곡 삭제 확인" }).click();
      await expect(page).toHaveURL(/\/songs\?sort=title_asc$/);
      await expect(page.getByText("완성된 전체 흐름 곡")).toHaveCount(0);
      const deletedView = await page.goto(`/songs/${songId}`);
      expect(deletedView?.status()).toBe(404);

      await withE2eDatabase(async (pool) => {
        const orphanSongs = await pool.query("select count(*)::int as count from songs s left join resources r on r.id = s.resource_id and r.owner_id = s.owner_id where r.id is null");
        const orphanResources = await pool.query("select count(*)::int as count from resources r left join songs s on s.resource_id = r.id and s.owner_id = r.owner_id where r.type = 'song' and s.resource_id is null");
        expect(orphanSongs.rows[0].count).toBe(0);
        expect(orphanResources.rows[0].count).toBe(0);
      });
    } finally {
      await otherContext.close();
      await deleteAccount(owner.userId);
      await deleteAccount(other.userId);
    }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `song-flow-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
    await pool.query(
      "insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at) values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')",
      [hashToken(token), userId]
    );
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id = $1", [userId]).then(() => undefined));
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
