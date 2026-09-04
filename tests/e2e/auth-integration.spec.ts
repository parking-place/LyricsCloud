import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { fixtureTokens, fixtureUsers, hashToken, withE2eDatabase } from "./fixtures.js";

const baseURL = "http://127.0.0.1:3000";

test.describe("OIDC, session, and logout integration", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for auth integration");

  test("allowed login creates one profile, restores and renews the session, then clears logout state", async ({ browser, context, page }, testInfo) => {
    const networkEvidence: string[] = [];
    page.on("request", (request) => networkEvidence.push(`${request.method()} ${request.url()} ${JSON.stringify(request.headers())}`));
    page.on("response", (response) => networkEvidence.push(`${response.status()} ${response.url()} ${JSON.stringify(response.headers())}`));

    const callbackResponse = page.waitForResponse((response) => response.url().includes("/api/auth/callback"));
    await loginAs(page, "허용 계정으로 계속");
    const callback = await callbackResponse;
    await expect(page).toHaveURL(/\/workspace\?auth=success$/);
    await expect(page.getByRole("heading", { name: "안녕하세요, 통합 테스트 사용자님." })).toBeVisible();
    expect(callback.headers()["cache-control"]).toContain("no-store");
    const callbackCookies = await callback.headersArray();
    expect(callbackCookies.filter(({ name }) => name.toLowerCase() === "set-cookie").map(({ value }) => value).join("\n"))
      .toMatch(/lc_session=.*HttpOnly; SameSite=Lax; Max-Age=2592000/);

    const firstSession = await page.request.get("/api/auth/session");
    expect(firstSession.status()).toBe(200);
    const firstUserId = (await firstSession.json()).user.id as string;
    const sessionCookie = (await context.cookies()).find(({ name }) => name === "lc_session");
    expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });

    await withE2eDatabase(async (pool) => {
      const rows = await pool.query<{ identities: number; profiles: number }>(
        `select (select count(*)::int from auth_identities where subject = 'e2e-allowed-user') as identities,
                (select count(*)::int from user_profiles p join auth_identities i on i.user_id = p.owner_id
                  where i.subject = 'e2e-allowed-user') as profiles`
      );
      expect(rows.rows[0]).toEqual({ identities: 1, profiles: 1 });
      await pool.query("update auth_sessions set expires_at = now() + interval '1 minute' where token_hash = $1", [hashToken(sessionCookie!.value)]);
    });

    const renewal = await page.request.get("/api/auth/session");
    expect(renewal.headers()["set-cookie"]).toContain("Max-Age=");
    expect((await renewal.json()).user.id).toBe(firstUserId);

    const persistedCookies = await context.cookies();
    const restored = await browser.newContext({
      baseURL,
      viewport: testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
    });
    await restored.addCookies(persistedCookies);
    const restoredPage = await restored.newPage();
    await restoredPage.goto("/auth");
    await restoredPage.goto("/workspace");
    await expect(restoredPage.getByRole("heading", { name: "안녕하세요, 통합 테스트 사용자님." })).toBeVisible();
    await restoredPage.reload();
    await expect(restoredPage.getByRole("heading", { name: "안녕하세요, 통합 테스트 사용자님." })).toBeVisible();
    const restoredSession = await restoredPage.request.get("/api/auth/session");
    expect((await restoredSession.json()).user.id).toBe(firstUserId);

    await restoredPage.evaluate((userId) => {
      localStorage.setItem(`lc:${userId}:draft`, "must-be-cleared");
      sessionStorage.setItem(`lc:${userId}:view`, "must-be-cleared");
    }, firstUserId);
    const logoutResponse = restoredPage.waitForResponse((response) => response.url().endsWith("/api/auth/logout"));
    await restoredPage.locator(testInfo.project.name === "desktop" ? ".top-logout" : ".mobile-logout").click();
    const logout = await logoutResponse;
    expect((await logout.allHeaders())["clear-site-data"]).toBe('"cache", "storage"');
    await expect(restoredPage).toHaveURL(/\/auth$/);
    expect((await restored.cookies()).some(({ name }) => name === "lc_session")).toBe(false);
    expect(await restoredPage.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    await restoredPage.goto("/workspace");
    await expect(restoredPage).toHaveURL(/\/auth$/);
    await restoredPage.goBack();
    await expect(restoredPage).not.toHaveURL(/\/workspace/);
    await restored.close();

    const again = await browser.newContext({ baseURL });
    const againPage = await again.newPage();
    await loginAs(againPage, "허용 계정으로 계속");
    const secondSession = await againPage.request.get("/api/auth/session");
    expect((await secondSession.json()).user.id).toBe(firstUserId);
    await withE2eDatabase(async (pool) => {
      const counts = await pool.query<{ identities: number; profiles: number }>(
        `select (select count(*)::int from auth_identities where subject = 'e2e-allowed-user') as identities,
                (select count(*)::int from user_profiles p join auth_identities i on i.user_id = p.owner_id
                  where i.subject = 'e2e-allowed-user') as profiles`
      );
      expect(counts.rows[0]).toEqual({ identities: 1, profiles: 1 });
    });
    await again.close();

    const evidence = networkEvidence.join("\n");
    expect(evidence).not.toContain("synthetic-e2e-client-secret");
    expect(evidence).not.toContain("synthetic-provider-token-never-persisted");
  });

  test("uninvited and cancelled OAuth users never reach the workspace", async ({ browser }) => {
    for (const scenario of [
      { action: "미허용 계정으로 계속", code: "AUTH_NOT_ALLOWED" },
      { action: "로그인 취소", code: "AUTH_CANCELLED" }
    ]) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await loginAs(page, scenario.action);
      await expect(page).toHaveURL(new RegExp(`/auth\\?error=${scenario.code}`));
      await expect(page.locator(".auth-error")).toBeVisible();
      expect((await context.cookies()).some(({ name }) => name === "lc_session")).toBe(false);
      await page.goto("/workspace");
      await expect(page).toHaveURL(/\/auth$/);
      await context.close();
    }
  });

  test("missing, invalid, and expired session cookies fail closed", async ({ context, page }) => {
    expect((await page.request.get("/api/auth/session")).status()).toBe(401);
    await context.addCookies([{ name: "lc_session", value: "tampered-session", url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    expect((await page.request.get("/api/auth/session")).status()).toBe(401);

    await context.clearCookies();
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.alice, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    await withE2eDatabase((pool) => pool.query(
      "update auth_sessions set expires_at = now() - interval '1 second' where token_hash = $1",
      [hashToken(fixtureTokens.alice)]
    ).then(() => undefined));
    expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  });
});

test.describe("A/B ownership boundary", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for ownership integration");

  test("B cannot select or mutate A through path, query, or body owner values", async ({ context, page }, testInfo) => {
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.bob, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    const queryAttack = await page.request.get(`/api/profile?ownerId=${fixtureUsers.alice.id}`);
    expect(queryAttack.status()).toBe(200);
    expect((await queryAttack.json()).profile).toMatchObject({ userId: fixtureUsers.bob.id });

    const bodyAttack = await page.request.patch(`/api/profile?userId=${fixtureUsers.alice.id}`, {
      data: { displayName: `B 격리 확인 ${testInfo.project.name}`, avatarUrl: null, ownerId: fixtureUsers.alice.id }
    });
    expect(bodyAttack.status()).toBe(200);
    expect((await bodyAttack.json()).profile).toMatchObject({
      userId: fixtureUsers.bob.id,
      displayName: `B 격리 확인 ${testInfo.project.name}`
    });

    const pathAttack = await page.request.get(`/api/profile/${fixtureUsers.alice.id}`);
    expect(pathAttack.status()).toBe(404);
    await withE2eDatabase(async (pool) => {
      const alice = await pool.query<{ display_name: string }>("select display_name from user_profiles where owner_id = $1", [fixtureUsers.alice.id]);
      expect(alice.rows[0]?.display_name).toBe(fixtureUsers.alice.displayName);
    });
  });
});

test("private routes and auth APIs apply cache and baseline security headers", async ({ context, page }) => {
  const auth = await page.goto("/auth");
  expectSecurityHeaders(auth?.headers() ?? {});
  expect(auth?.headers()["cache-control"]).toContain("no-store");
  const unauthenticated = await page.request.get("/api/profile");
  expect(unauthenticated.status()).toBe(401);
  expect(unauthenticated.headers()["cache-control"]).toContain("no-store");

  if (process.env.E2E_DATABASE_URL) {
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    const workspace = await page.goto("/workspace");
    expectSecurityHeaders(workspace?.headers() ?? {});
    expect(workspace?.headers()["cache-control"]).toContain("no-store");
  }
});

async function loginAs(page: Page, action: string): Promise<void> {
  await page.goto("/auth");
  await page.getByRole("link", { name: "Google 계정으로 계속하기" }).click();
  await expect(page.getByRole("heading", { name: "OIDC 테스트 공급자" })).toBeVisible();
  await page.getByRole("link", { name: action, exact: true }).click();
}

function expectSecurityHeaders(headers: Record<string, string>): void {
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["permissions-policy"]).toContain("camera=()");
}
