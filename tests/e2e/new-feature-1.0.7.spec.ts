import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.7 personal library view modes", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps the song query, order, loaded items, and saved mode", async ({ context, page }) => {
    const userId = await account(context);
    try {
      for (let index = 15; index >= 1; index -= 1) {
        await createSong(page, `보기 유지 ${String(index).padStart(2, "0")}`);
      }
      await page.goto("/songs?search=%EB%B3%B4%EA%B8%B0%20%EC%9C%A0%EC%A7%80&sort=title_asc");
      await expect(page.getByText("총 15곡")).toBeVisible();
      await page.getByRole("button", { name: "더 불러오기" }).click();
      await expect(page.locator(".song-card")).toHaveCount(15);
      const before = await cardTitles(page, ".song-card");
      const expectedUrl = page.url();

      for (const [label, mode] of [["작게", "grid-small"], ["중간", "grid-medium"], ["크게", "grid-large"], ["목록", "list"]] as const) {
        await page.getByRole("button", { name: `곡 목록 ${label} 보기` }).click();
        await expect(page.locator(".song-grid")).toHaveAttribute("data-view-mode", mode);
        await expect(page.getByText(`${label} 보기로 저장했습니다.`)).toBeVisible();
        expect(page.url()).toBe(expectedUrl);
        expect(await cardTitles(page, ".song-card")).toEqual(before);
      }

      await page.getByRole("button", { name: "곡 목록 크게 보기" }).click();
      await expect(page.getByText("크게 보기로 저장했습니다.")).toBeVisible();
      await page.reload();
      await expect(page.locator(".song-grid")).toHaveAttribute("data-view-mode", "grid-large");
      expect(page.url()).toBe(expectedUrl);
    } finally { await removeAccount(userId); }
  });

  test("separates resource types and restores on another device without crossing accounts", async ({ browser, context, page }) => {
    const sameDevice = await browser.newContext({ baseURL: origin });
    const otherAccount = await browser.newContext({ baseURL: origin });
    const userA = await account([context, sameDevice]);
    const userB = await account(otherAccount);
    try {
      await createRhyme(page, "보기 분리 라임");
      await createPrompt(page, "보기 분리 프롬프트");
      await page.goto("/rhymes");
      await page.getByRole("button", { name: "라임 노트 목록 작게 보기" }).click();
      await expect(page.getByText("작게 보기로 저장했습니다.")).toBeVisible();
      await page.goto("/prompts");
      await page.getByRole("button", { name: "프롬프트 목록 중간 보기" }).click();
      await expect(page.getByText("중간 보기로 저장했습니다.")).toBeVisible();

      const second = await sameDevice.newPage();
      await second.goto("/rhymes");
      await expect(second.locator(".rhyme-grid")).toHaveAttribute("data-view-mode", "grid-small");
      await second.goto("/prompts");
      await expect(second.locator(".prompt-grid")).toHaveAttribute("data-view-mode", "grid-medium");

      const isolated = await otherAccount.newPage();
      await isolated.goto("/rhymes");
      await expect(isolated.getByRole("button", { name: "라임 노트 목록 목록 보기" })).toHaveAttribute("aria-pressed", "true");
      await isolated.getByRole("button", { name: "라임 노트 목록 크게 보기" }).click();
      await expect(isolated.getByText("크게 보기로 저장했습니다.")).toBeVisible();
      await page.goto("/rhymes");
      await expect(page.locator(".rhyme-grid")).toHaveAttribute("data-view-mode", "grid-small");
    } finally {
      await sameDevice.close();
      await otherAccount.close();
      await removeAccount(userA);
      await removeAccount(userB);
    }
  });

  test("shows loading and rolls an optimistic change back after a save failure", async ({ context, page }) => {
    const userId = await account(context);
    try {
      await createSong(page, "보기 저장 실패");
      await page.route("**/api/library-view-settings/songs", async (route) => {
        if (route.request().method() === "GET") await new Promise((resolve) => setTimeout(resolve, 350));
        await route.continue();
      });
      await page.goto("/songs");
      const group = page.getByRole("group", { name: "곡 목록 보기 방식" });
      await expect(group).toHaveAttribute("aria-busy", "true");
      await expect(group.getByRole("button", { name: "곡 목록 크게 보기" })).toBeDisabled();
      await expect(group).toHaveAttribute("aria-busy", "false");

      await page.route("**/api/library-view-settings/songs", async (route) => {
        if (route.request().method() === "PUT") await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        else await route.continue();
      });
      await group.getByRole("button", { name: "곡 목록 크게 보기" }).click();
      await expect(page.getByText("보기 설정을 저장하지 못했습니다. 다시 시도해 주세요.")).toBeVisible();
      await expect(group.getByRole("button", { name: "곡 목록 목록 보기" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".song-grid")).toHaveAttribute("data-view-mode", "list");
    } finally { await removeAccount(userId); }
  });

  test("keeps long Korean content and controls usable at 320px with 200 percent text", async ({ context, page }) => {
    const userId = await account(context);
    try {
      await createSong(page, `아주 긴 한글 제목 ${"겹치지않는제목".repeat(18)}`);
      await page.setViewportSize({ width: 320, height: 780 });
      await page.goto("/songs");
      await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      await page.getByRole("button", { name: "곡 목록 크게 보기" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByText("크게 보기로 저장했습니다.")).toBeVisible();
      await expect(page.locator(".song-grid")).toHaveAttribute("data-view-mode", "grid-large");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await expect(page.locator(".song-card-actions button").first()).toBeVisible();
    } finally { await removeAccount(userId); }
  });

  test("requires authentication for the personal setting route", async ({ browser }) => {
    const anonymous = await browser.newContext({ baseURL: origin });
    try {
      expect((await anonymous.request.get("/api/library-view-settings/songs")).status()).toBe(401);
      expect((await anonymous.request.put("/api/library-view-settings/songs", {
        headers, data: { viewMode: "grid-large", rowVersion: 0 }
      })).status()).toBe(401);
    } finally { await anonymous.close(); }
  });
});

async function cardTitles(page: Page, selector: string) {
  return page.locator(`${selector} h2`).allTextContents();
}

async function account(contextOrContexts: BrowserContext | readonly BrowserContext[]) {
  const contexts = Array.isArray(contextOrContexts) ? contextOrContexts : [contextOrContexts];
  const userId = randomUUID();
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.7 보기 사용자')", [userId]);
    for (const context of contexts) {
      const token = `library-107-${randomUUID()}`;
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

async function createRhyme(page: Page, title: string) {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body: "라임 보기 본문" } });
  expect(response.status()).toBe(201);
}

async function createPrompt(page: Page, title: string) {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens: ["prompt", "view"] } });
  expect(response.status()).toBe(201);
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
