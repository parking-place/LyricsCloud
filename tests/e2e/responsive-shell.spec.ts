import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, test, webkit, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const evidenceRoot = path.join(process.cwd(), "docs/runbooks/evidence/0.9.0-phase2");

const viewports = [
  { name: "320", width: 320, height: 700 },
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1440", width: 1440, height: 1000 }
] as const;

test.describe("0.9.0 responsive shell", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps navigation and song controls reachable at all six acceptance widths", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "the matrix creates its own contexts");
    const setup = await browser.newContext({ baseURL: origin });
    const account = await createAccount(setup, "반응형 셸 사용자");
    await createSong(setup.request, "반응형 기준 곡");
    await setup.close();
    await mkdir(evidenceRoot, { recursive: true });
    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          baseURL: origin,
          viewport: { width: viewport.width, height: viewport.height },
          hasTouch: viewport.width <= 390,
          colorScheme: "dark",
          locale: "ko-KR",
          serviceWorkers: "block"
        });
        await addSession(context, account.token);
        const page = await context.newPage();
        await page.goto("/songs");
        await expect(page.getByText("총 1곡")).toBeVisible();
        const overflow = await overflowDetails(page);
        expect(overflow.document, `${viewport.name}px document overflow: ${JSON.stringify(overflow.elements)}`).toBe(false);
        await expectControlsInsideViewport(page, ".song-toolbar > *", viewport.width);

        if (viewport.width <= 720) {
          const navItems = page.locator(".mobile-bottom-nav a, .mobile-bottom-nav button");
          await expect(navItems).toHaveCount(6);
          for (let index = 0; index < await navItems.count(); index += 1) {
            const box = await navItems.nth(index).boundingBox();
            expect(box?.height ?? 0, `${viewport.name}px touch target ${index}`).toBeGreaterThanOrEqual(44);
          }
          const more = page.getByRole("button", { name: "더보기" });
          await more.click();
          const sheet = page.getByRole("dialog", { name: "더보기" });
          await expect(sheet.getByRole("link", { name: /템플릿/ })).toBeVisible();
          await expect(sheet.getByRole("link", { name: /휴지통/ })).toBeVisible();
          await sheet.getByRole("link", { name: /설정/ }).focus();
          await page.keyboard.press("Tab");
          await expect(sheet.getByRole("button", { name: "닫기" })).toBeFocused();
          await page.keyboard.press("Escape");
          await expect(more).toBeFocused();
        } else {
          const topbar = page.locator(".topbar");
          await expect(topbar).toBeVisible();
          expect((await topbar.boundingBox())?.height ?? 0).toBeLessThanOrEqual(74);
          expect(await page.locator(".workspace-tab").evaluateAll((items) => items.every((item) => getComputedStyle(item).whiteSpace === "nowrap"))).toBe(true);
        }
        await page.screenshot({ path: path.join(evidenceRoot, `${viewport.name}-songs.png`), fullPage: true });
        await context.close();
      }
    } finally { await deleteAccount(account.userId); }
  });

  test("preserves Korean editor drafts while sheets open, close and rotate in Chromium and WebKit", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "the browser matrix runs once");
    test.setTimeout(120_000);
    const setup = await browser.newContext({ baseURL: origin });
    const account = await createAccount(setup, "모바일 편집 사용자");
    const songId = await createSong(setup.request, "모바일 편집 곡");
    const lyricId = await createLyric(setup.request, songId, "모바일 편집 가사", "[Verse]\n초기 가사");
    const rhymeId = await createRhyme(setup.request, "모바일 편집 라임", "초기 라임");
    await setup.close();
    try {
      for (const browserType of [chromium, webkit]) {
        const launched = await browserType.launch({ headless: true });
        const context = await launched.newContext({
          baseURL: origin,
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          colorScheme: "dark",
          locale: "ko-KR",
          serviceWorkers: "block"
        });
        await addSession(context, account.token);
        const page = await context.newPage();
        await page.goto(`/lyrics/${lyricId}`);
        const lyricEditor = page.locator(".cm-content");
        await expect(lyricEditor).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
        const draft = `[Verse]\n한글 패널 전환 ${browserType.name()}`;
        await lyricEditor.fill(draft);
        const resourcesButton = page.getByRole("button", { name: /다른 가사 .*자료/ });
        await resourcesButton.click();
        const resources = page.getByRole("dialog", { name: "작업 자료 · 다른 가사와 설정" });
        await expect(resources).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(resourcesButton).toBeFocused();
        await expect(lyricEditor).toContainText(`한글 패널 전환 ${browserType.name()}`);
        await page.setViewportSize({ width: 844, height: 390 });
        expect(await horizontalOverflow(page), `${browserType.name()} rotated lyric overflow`).toBe(false);
        await expect.poll(() => readLyric(context.request, lyricId), { timeout: 20_000 }).toBe(draft);

        await page.goto(`/rhymes/${rhymeId}`);
        await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
        const settingsButton = page.getByRole("button", { name: /태그·설정/ });
        await settingsButton.click();
        await expect(page.getByRole("dialog", { name: "태그와 표시 설정" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(settingsButton).toBeFocused();
        expect(await horizontalOverflow(page), `${browserType.name()} rotated rhyme overflow`).toBe(false);
        await context.close();
        await launched.close();
      }
    } finally { await deleteAccount(account.userId); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `responsive-shell-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await addSession(context, token);
  return { userId, token };
}

async function addSession(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

async function createSong(request: APIRequestContext, title: string) {
  const response = await request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(request: APIRequestContext, songId: string, title: string, body: string) {
  const response = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function createRhyme(request: APIRequestContext, title: string, body: string) {
  const response = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return (await response.json()).rhyme.id as string;
}

async function readLyric(request: APIRequestContext, lyricId: string) {
  const response = await request.get(`/api/lyrics/${lyricId}`);
  expect(response.status()).toBe(200);
  return ((await response.json()).lyric as { body: string }).body;
}

async function expectControlsInsideViewport(page: Page, selector: string, width: number) {
  const boxes = await page.locator(selector).evaluateAll((items) => items.filter((item) => getComputedStyle(item).display !== "none").map((item) => {
    const box = item.getBoundingClientRect();
    return { left: box.left, right: box.right };
  }));
  expect(boxes.every(({ left, right }) => left >= -1 && right <= width + 1)).toBe(true);
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

async function overflowDetails(page: Page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    elements: [...document.querySelectorAll<HTMLElement>("body *")].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > window.innerWidth + 1 || rect.left < -1 || element.scrollWidth > element.clientWidth + 1
        ? [{ tag: element.tagName, className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), client: element.clientWidth, scroll: element.scrollWidth }]
        : [];
    }).slice(0, 20)
  }));
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
