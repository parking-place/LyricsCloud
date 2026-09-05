import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("song list UI", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song UI integration");

  test("empty account, responsive layout, and new-song actions remain usable", async ({ context, page }) => {
    const account = await createAccount(context, "빈 곡 사용자");
    try {
      const response = await page.goto("/songs");
      expect(response?.headers()["cache-control"]).toContain("no-store");
      await expect(page.getByRole("heading", { name: "아직 만든 곡이 없어요" })).toBeVisible();
      await expect(page.getByRole("link", { name: "첫 곡 만들기" })).toHaveAttribute("href", /^\/songs\/new/);
      await page.setViewportSize({ width: 320, height: 700 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await expect(page.getByRole("link", { name: "새 곡 추가" })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    } finally {
      await deleteAccount(account.userId);
    }
  });

  test("30 songs support cards, URL filters, safe toggles, and cursor focus", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, "목록 곡 사용자");
    try {
      for (let index = 0; index < 30; index += 1) {
        const response = await page.request.post("/api/songs", {
          headers: { Origin: origin },
          data: {
            requestId: randomUUID(),
            title: `목록 곡 ${String(index).padStart(2, "0")}`,
            workNotes: index === 29 ? "한글 빠른 검색 표식" : `작업 메모 ${index}`,
            status: index % 7 === 0 ? "completed" : "idea",
            color: index % 2 ? "blue" : null
          }
        });
        expect(response.status()).toBe(201);
      }

      await page.goto("/songs");
      await expect(page.getByText("총 30곡")).toBeVisible();
      await expect(page.locator(".song-card:not(.skeleton)")).toHaveCount(12);
      const cards = page.locator(".song-card:not(.skeleton)");
      const firstBox = await cards.nth(0).boundingBox();
      const secondBox = await cards.nth(1).boundingBox();
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      if (testInfo.project.name === "desktop") expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(4);
      else expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 4);
      expect(await hasHorizontalOverflow(page)).toBe(false);

      const firstTitle = (await cards.first().getByRole("heading").textContent())!;
      const favorite = page.getByRole("button", { name: `${firstTitle} 즐겨찾기` });
      await favorite.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: `${firstTitle} 즐겨찾기 해제` })).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/\/songs$/);

      const search = page.getByRole("searchbox", { name: "곡 검색" });
      await search.fill("없는 결과");
      await search.fill("한글 빠른 검색 표식");
      await expect(page).toHaveURL(/search=%ED%95%9C%EA%B8%80/);
      await expect(page.getByRole("heading", { name: "목록 곡 29" })).toBeVisible();
      await expect(page.getByText("총 1곡")).toBeVisible();

      await search.fill("");
      await expect(page.getByText("총 30곡")).toBeVisible();
      if (testInfo.project.name === "desktop") await page.getByLabel("곡 상태 필터").selectOption("completed");
      else await page.getByRole("button", { name: "완성", exact: true }).click();
      await expect(page).toHaveURL(/status=completed/);
      await expect(page.getByText("총 5곡")).toBeVisible();
      if (testInfo.project.name === "desktop") await page.getByLabel("곡 상태 필터").selectOption("");
      else await page.getByRole("button", { name: "전체", exact: true }).click();
      await page.getByLabel("곡 정렬").selectOption("title_asc");
      await expect(page).toHaveURL(/sort=title_asc/);
      await expect(cards.first().getByRole("heading")).toHaveText("목록 곡 00");

      const more = page.getByRole("button", { name: "더 불러오기" });
      await more.focus();
      await more.click();
      await expect(cards).toHaveCount(24);
      await expect(more).toBeFocused();

      await cards.first().getByRole("link").focus();
      await expect(cards.first().getByRole("link")).toBeFocused();
      await expect(page.getByRole("link", { name: "＋ 새 곡" })).toHaveAttribute("href", /^\/songs\/new/);
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `songs-ui-${randomUUID()}`;
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
