import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test("song link manager ignores a delayed old resource response after switching kind", async ({ browser }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated database");
  const mobile = info.project.name.includes("mobile");
  const context = await browser.newContext({ baseURL: origin,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile, hasTouch: mobile });
  const account = await createAccount(context);
  try {
    const songResponse = await context.request.post("/api/songs", { headers, data: {
      requestId: randomUUID(), title: "늦은 연결 응답 곡"
    } });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    expect((await context.request.post("/api/rhymes", { headers, data: {
      requestId: randomUUID(), title: "이전 라임 후보", body: "합성 라임"
    } })).status()).toBe(201);
    expect((await context.request.post("/api/prompts", { headers, data: {
      requestId: randomUUID(), title: "새 프롬프트 후보", tokens: ["Synthetic"]
    } })).status()).toBe(201);

    const page = await context.newPage();
    await page.goto(`/songs/${songId}`);
    let releaseOld!: () => void;
    const holdOld = new Promise<void>((resolve) => { releaseOld = resolve; });
    let intercepted!: () => void;
    const oldStarted = new Promise<void>((resolve) => { intercepted = resolve; });
    const oldQuery = `**/api/songs/${songId}/links?type=rhyme_note&state=all&limit=20`;
    await page.route(oldQuery, async (route) => {
      intercepted();
      await holdOld;
      await route.fulfill({ status: 200, json: {
        items: [{ id: randomUUID(), type: "rhyme_note", title: "오래된 라임 응답",
          preview: "stale", isLinked: false, updatedAt: new Date().toISOString() }],
        totalCount: 1, nextCursor: null
      } }).catch(() => undefined);
    }, { times: 1 });
    await page.getByRole("button", { name: "연결 관리" }).click();
    const dialog = page.getByRole("dialog", { name: "늦은 연결 응답 곡 연결 자료 관리" });
    await oldStarted;
    await expect(dialog).toContainText("라임 노트 후보를 불러오는 중입니다.");
    await dialog.getByRole("tab", { name: "프롬프트" }).click();
    await expect(dialog.locator(".song-link-option", { hasText: "새 프롬프트 후보" })).toBeVisible();
    releaseOld();
    await expect(dialog.locator(".song-link-option", { hasText: "오래된 라임 응답" })).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await expect(dialog.locator(".song-link-summary")).toContainText("결과 1개");
  } finally {
    await context.close();
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [account.userId]).then(() => undefined));
  }
});

async function createAccount(context: BrowserContext) {
  const userId = randomUUID(), token = `p4-link-race-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'연결 경합 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}
