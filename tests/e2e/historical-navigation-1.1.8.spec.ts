import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

// Parent integration only: this spec requires the rebuilt app and an isolated DB.
// No snapshots, production identities, or private mockups are used.
test.describe("1.1.8 historical navigation and accessibility", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires parent's coordinated isolated database");
  let userId: string;
  test.beforeEach(async ({ context }) => { userId = await createAccount(context); });
  test.afterEach(async () => {
    if (userId) await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
  });

  test("shell and repeated search shortcut keep the document, selected menu, and browser history", async ({ page }, info) => {
    await page.goto("/workspace");
    await expect(page.locator(".workspace-shell")).toBeVisible();
    // The guard must be installed before measuring navigation.
    await expect(page.getByRole("button", { name: "좌측 메뉴 접기", includeHidden: true })).toBeAttached();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const documents: string[] = [];
    const apis: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url());
      if (new URL(request.url()).pathname.startsWith("/api/")) apis.push(new URL(request.url()).pathname);
    });
    const nav = page.getByRole("navigation", { name: info.project.use.isMobile ? "모바일 주 메뉴" : "데스크톱 주 메뉴", exact: true });
    await nav.getByRole("link", { name: "곡", exact: true }).click();
    await expect(page).toHaveURL(/\/songs$/);
    await expect(nav.getByRole("link", { name: "곡", exact: true })).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    expect(documents).toEqual([]);
    // Capture counts as evidence, not a transferred-byte or WebVitals assertion.
    await test.info().attach("workspace-to-songs-requests", { body: JSON.stringify({ documents, apis, timeOrigin }), contentType: "application/json" });
    await nav.getByRole("link", { name: "곡", exact: true }).click();
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    await page.goBack(); await expect(page).toHaveURL(/\/workspace$/);
    await page.goForward(); await expect(page).toHaveURL(/\/songs$/);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Control+Alt+K");
    await expect(page).toHaveURL(/\/search$/);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Control+Alt+K");
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    expect(documents).toEqual([]);
  });
});

test.describe("1.1.8 historical PWA build retention", () => {
  test.use({ serviceWorkers: "allow" });
  test("PWA-01 two real worker builds retain an old static asset offline until its tab closes", async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop", "one Chromium service-worker lifecycle acceptance");
    await page.goto("/auth");
    const asset = await page.locator('script[src*="/_next/static/"]').first().getAttribute("src");
    expect(asset).toBeTruthy();
    const buildA = `historical-a-${randomUUID()}`;
    const buildB = `historical-b-${randomUUID()}`;
    await page.evaluate(async (build) => { await navigator.serviceWorker.register(`/sw.js?build=${build}`, { scope: "/", updateViaCache: "none" }); await navigator.serviceWorker.ready; }, buildA);
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain(buildA);
    await page.evaluate((url) => navigator.serviceWorker.controller!.postMessage({ type: "PRECACHE_STATIC", urls: [url] }), asset!);
    await expect.poll(() => page.evaluate(async ({ build, url }) => Boolean(await (await caches.open(`lyricscloud-shell-${build}`)).match(url)), { build: buildA, url: asset! })).toBe(true);
    const original = await page.evaluate(async ({ build, url }) => (await (await caches.open(`lyricscloud-shell-${build}`)).match(url))!.text(), { build: buildA, url: asset! });
    const approved = await context.newPage(); await approved.goto("/auth");
    await approved.evaluate(async (build) => { await navigator.serviceWorker.register(`/sw.js?build=${build}`, { scope: "/", updateViaCache: "none" }); }, buildB);
    await expect.poll(() => approved.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.scriptURL)).toContain(buildB);
    await approved.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.waiting!.postMessage({ type: "SKIP_WAITING" }));
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain(buildB);
    await approved.evaluate((buildId) => navigator.serviceWorker.controller!.postMessage({ type: "CLIENT_BUILD", buildId }), buildB);
    await page.evaluate((buildId) => navigator.serviceWorker.controller!.postMessage({ type: "CLIENT_BUILD", buildId }), buildA);
    await context.setOffline(true);
    try {
      expect(await page.evaluate(async (url) => (await fetch(url, { cache: "no-store" })).text(), asset!)).toBe(original);
      expect(await page.evaluate(async () => fetch("/api/auth/session", { cache: "no-store" }).then(() => "unexpected response", () => "offline"))).toBe("offline");
    } finally { await context.setOffline(false); }
    await page.close();
    await approved.evaluate((buildId) => navigator.serviceWorker.controller!.postMessage({ type: "CLIENT_BUILD", buildId }), buildB);
    await expect.poll(() => approved.evaluate(() => caches.keys())).not.toContain(`lyricscloud-shell-${buildA}`);
    await approved.close();
  });
});

async function createAccount(context: BrowserContext) {
  const userId = randomUUID(); const token = `historical-navigation-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "Historical navigation fixture"]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  return userId;
}
