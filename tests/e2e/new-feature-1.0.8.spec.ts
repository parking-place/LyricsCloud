import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.8 song manual order UI", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("moves a visible song with an accessible control and keeps it after reload", async ({ context, page }) => {
    const userId = await account(context);
    try {
      for (const title of ["순서 A", "순서 B", "순서 C"]) await createSong(page, title);
      await page.goto("/songs?sort=title_asc");
      const card = page.locator(".song-card", { hasText: "순서 C" });
      await card.getByRole("button", { name: "순서 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await expect(page).toHaveURL(/sort=manual/);
      await expect.poll(() => titles(page)).toEqual(["순서 C", "순서 A", "순서 B"]);
      await page.reload();
      await expect.poll(() => titles(page)).toEqual(["순서 C", "순서 A", "순서 B"]);
    } finally { await removeAccount(userId); }
  });

  test("keeps filtered-out songs and the active Korean search while changing to manual order", async ({ context, page }) => {
    const userId = await account(context);
    try {
      for (const title of ["필터 보임 A", "숨은 곡 B", "필터 보임 C"]) await createSong(page, title);
      await page.goto(`/songs?search=${encodeURIComponent("필터 보임")}&sort=title_asc`);
      const search = page.getByRole("searchbox", { name: "곡 검색" });
      await search.dispatchEvent("compositionstart");
      await search.fill("필터 보임");
      await search.dispatchEvent("compositionend");
      await page.locator(".song-card", { hasText: "필터 보임 C" }).getByRole("button", { name: "필터 보임 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await expect(search).toHaveValue("필터 보임");
      await expect.poll(() => titles(page)).toEqual(["필터 보임 C", "필터 보임 A"]);
      await search.fill("");
      await expect.poll(() => titles(page)).toEqual(["필터 보임 C", "필터 보임 A", "숨은 곡 B"]);
    } finally { await removeAccount(userId); }
  });

  test("supports drag and keyboard movement without making card text draggable", async ({ context, page }, info) => {
    const userId = await account(context);
    try {
      for (const title of ["조작 A", "조작 B", "조작 C"]) await createSong(page, title);
      await page.goto("/songs?sort=title_asc");
      const cards = page.locator(".song-card");
      await expect(cards.first()).not.toHaveAttribute("draggable", "true");
      const handle = page.locator(".song-card", { hasText: "조작 B" }).getByRole("button", { name: "조작 B 드래그 또는 방향키로 순서 이동" });
      await handle.press("Home");
      await expect.poll(() => titles(page)).toEqual(["조작 B", "조작 A", "조작 C"]);
      if (info.project.name === "desktop") {
        await page.locator(".song-card", { hasText: "조작 C" }).locator(".song-drag-handle")
          .dragTo(page.locator(".song-card", { hasText: "조작 B" }));
        await expect.poll(() => titles(page)).toEqual(["조작 C", "조작 B", "조작 A"]);
        await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      }
    } finally { await removeAccount(userId); }
  });

  test("restores the original order and safely retries after a lost response", async ({ context, page }) => {
    const userId = await account(context);
    try {
      for (const title of ["재시도 A", "재시도 B", "재시도 C"]) await createSong(page, title);
      await page.goto("/songs?sort=title_asc");
      await page.route("**/api/songs/order/moves", async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort("failed");
      }, { times: 1 });
      await page.locator(".song-card", { hasText: "재시도 C" }).getByRole("button", { name: "재시도 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("원래 순서로 복원했습니다");
      await expect.poll(() => titles(page)).toEqual(["재시도 A", "재시도 B", "재시도 C"]);
      await page.getByRole("button", { name: "같은 이동 다시 시도" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await page.reload();
      await expect.poll(() => titles(page)).toEqual(["재시도 C", "재시도 A", "재시도 B"]);
    } finally { await removeAccount(userId); }
  });

  test("reloads the server-approved order after a stale second-tab move", async ({ browser, context, page }) => {
    const second = await browser.newContext({ baseURL: origin });
    const userId = await account([context, second]);
    try {
      for (const title of ["충돌 A", "충돌 B", "충돌 C"]) await createSong(page, title);
      const other = await second.newPage();
      await Promise.all([page.goto("/songs?sort=manual"), other.goto("/songs?sort=manual")]);
      await page.locator(".song-card", { hasText: "충돌 C" }).getByRole("button", { name: "충돌 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await other.locator(".song-card", { hasText: "충돌 B" }).getByRole("button", { name: "충돌 B 맨 뒤로 이동" }).click();
      await expect(other.getByRole("status")).toContainText("최신 사용자 정렬을 불러왔습니다");
      await expect.poll(() => titles(other)).toEqual(["충돌 C", "충돌 A", "충돌 B"]);
      await other.close();
    } finally { await second.close(); await removeAccount(userId); }
  });

  test("shows loading and empty states, keeps controls usable at 320px, and rejects anonymous moves", async ({ browser, context, page }) => {
    const userId = await account(context);
    try {
      await page.route("**/api/songs?**", async (route) => { await new Promise((resolve) => setTimeout(resolve, 250)); await route.continue(); }, { times: 1 });
      await page.goto("/songs");
      await expect(page.getByLabel("곡 목록 불러오는 중")).toBeVisible();
      await expect(page.getByRole("heading", { name: "아직 만든 곡이 없어요" })).toBeVisible();
      await createSong(page, `좁은 화면 ${"긴제목".repeat(30)}`);
      await createSong(page, "좁은 화면 둘");
      await page.setViewportSize({ width: 320, height: 780 });
      await page.goto("/songs?sort=manual");
      await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      await expect(page.getByRole("button", { name: /좁은 화면 둘 맨 앞으로 이동/ })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      const anonymous = await browser.newContext({ baseURL: origin });
      const response = await anonymous.request.post("/api/songs/order/moves", { headers, data: { requestId: randomUUID(), itemId: randomUUID(), beforeId: randomUUID(), afterId: null, expectedVersion: 0 } });
      expect(response.status()).toBe(401);
      await anonymous.close();
    } finally { await removeAccount(userId); }
  });
});

async function titles(page: Page) { return page.locator(".song-card h2").allTextContents(); }

async function account(contextOrContexts: BrowserContext | readonly BrowserContext[]) {
  const contexts = Array.isArray(contextOrContexts) ? contextOrContexts : [contextOrContexts];
  const userId = randomUUID();
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.8 순서 사용자')", [userId]);
    for (const context of contexts) {
      const token = `song-order-108-${randomUUID()}`;
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    }
  });
  return userId;
}

async function createSong(page: Page, title: string) {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
