import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("song create and edit form", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song form integration");

  test("defaults, inline validation, dirty confirmation, and responsive controls", async ({ context, page }) => {
    const account = await createAccount(context, "폼 기본값 사용자");
    try {
      await page.goto("/songs/new");
      await expect(page.getByRole("heading", { name: "새 곡 만들기" })).toBeVisible();
      await expect(page.getByRole("radio", { name: /아이디어/ })).toBeChecked();
      await expect(page.getByRole("button", { name: "색상 없음" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("checkbox", { name: /목록 상단에 고정/ })).not.toBeChecked();
      await expect(page.getByRole("checkbox", { name: /즐겨찾기에 추가/ })).not.toBeChecked();

      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page.getByText("곡 제목을 입력해 주세요.")).toBeVisible();
      await page.locator('input[name="title"]').fill("가".repeat(201));
      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page.getByText("제목은 200자 이하여야 합니다.")).toBeVisible();

      await page.locator('input[name="title"]').fill("저장 전 이탈 확인");
      let dismissed = false;
      page.once("dialog", async (dialog) => { dismissed = true; expect(dialog.type()).toBe("confirm"); await dialog.dismiss(); });
      await page.getByRole("link", { name: "취소" }).click();
      expect(dismissed).toBe(true);
      await expect(page).toHaveURL(/\/songs\/new$/);

      await page.setViewportSize({ width: 320, height: 700 });
      await expect(page.getByRole("button", { name: "곡 만들기" })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    } finally {
      await deleteAccount(account.userId);
    }
  });

  test("one idempotent submission creates, loads, and edits every song field", async ({ context, page }) => {
    const account = await createAccount(context, "폼 흐름 사용자");
    try {
      await page.goto("/songs/new");
      await page.locator('input[name="title"]').fill("폼에서 만든 곡");
      await page.locator('textarea[name="description"]').fill("폼 설명");
      await page.locator('textarea[name="workNotes"]').fill("폼 작업 메모");
      await page.getByRole("radio", { name: /수정 중/ }).check();
      await page.getByRole("button", { name: "파랑" }).click();
      await page.getByRole("checkbox", { name: /목록 상단에 고정/ }).check();
      await page.getByRole("checkbox", { name: /즐겨찾기에 추가/ }).check();

      let creates = 0;
      await page.route("**/api/songs", async (route) => {
        if (route.request().method() === "POST") {
          creates += 1;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        await route.continue();
      });
      await page.locator("form").evaluate((form: HTMLFormElement) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await expect(page.getByRole("button", { name: "저장 중…" })).toBeDisabled();
      await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+(?:\?|$)/);
      expect(creates).toBe(1);
      await expect(page.getByRole("heading", { name: "폼에서 만든 곡" })).toBeVisible();

      const songId = new URL(page.url()).pathname.split("/").at(-1)!;
      await page.goto(`/songs/${songId}/edit`);
      await expect(page.locator('input[name="title"]')).toHaveValue("폼에서 만든 곡");
      await expect(page.locator('textarea[name="description"]')).toHaveValue("폼 설명");
      await expect(page.locator('textarea[name="workNotes"]')).toHaveValue("폼 작업 메모");
      await expect(page.getByRole("radio", { name: /수정 중/ })).toBeChecked();
      await expect(page.getByRole("button", { name: "파랑" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("checkbox", { name: /목록 상단에 고정/ })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: /즐겨찾기에 추가/ })).toBeChecked();

      await page.locator('input[name="title"]').fill("수정 완료한 곡");
      await page.getByRole("radio", { name: /완성/ }).check();
      await page.getByRole("button", { name: "변경 저장" }).click();
      await expect(page).toHaveURL(new RegExp(`/songs/${songId}(?:\\?|$)`));
      await expect(page.getByRole("heading", { name: "수정 완료한 곡" })).toBeVisible();

      const api = await page.request.get(`/api/songs/${songId}`);
      expect(await api.json()).toMatchObject({ song: {
        title: "수정 완료한 곡",
        description: "폼 설명",
        workNotes: "폼 작업 메모",
        status: "completed",
        color: "blue",
        isPinned: true,
        isFavorite: true
      } });
    } finally {
      await deleteAccount(account.userId);
    }
  });

  test("another account cannot load song values through the edit URL", async ({ browser }) => {
    const ownerContext = await browser.newContext({ baseURL: origin });
    const otherContext = await browser.newContext({ baseURL: origin });
    const owner = await createAccount(ownerContext, "폼 소유자");
    const other = await createAccount(otherContext, "폼 다른 사용자");
    try {
      const ownerPage = await ownerContext.newPage();
      const created = await ownerPage.request.post("/api/songs", {
        headers: { Origin: origin },
        data: { requestId: randomUUID(), title: "다른 계정에 숨길 제목", workNotes: "노출 금지 메모" }
      });
      const songId = (await created.json()).song.id as string;
      const otherPage = await otherContext.newPage();
      const response = await otherPage.goto(`/songs/${songId}/edit`);
      expect(response?.status()).toBe(404);
      await expect(otherPage.getByText("다른 계정에 숨길 제목")).toHaveCount(0);
      await expect(otherPage.getByText("노출 금지 메모")).toHaveCount(0);
    } finally {
      await ownerContext.close();
      await otherContext.close();
      await deleteAccount(owner.userId);
      await deleteAccount(other.userId);
    }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `song-form-${randomUUID()}`;
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
