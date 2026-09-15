import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const mutationHeaders = { Origin: origin };

test.describe("1.1.5 P2 approved UI foundation", () => {
  test("publishes B-1 at the document root and resolves both theme token sets", async ({ page }) => {
    await page.goto("/auth");
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-ui-variant", "b1");
    await expect(root).toHaveAttribute("data-theme", "dark");
    expect(await resolvedTokens(page)).toEqual({
      canvas: "rgb(8, 11, 15)",
      panel: "rgb(17, 22, 29)",
      ink: "rgb(245, 248, 250)",
      accent: "rgb(200, 255, 61)"
    });

    await page.emulateMedia({ colorScheme: "light" });
    await expect(root).toHaveAttribute("data-theme", "light");
    expect(await resolvedTokens(page)).toEqual({
      canvas: "rgb(244, 247, 249)",
      panel: "rgb(255, 255, 255)",
      ink: "rgb(23, 33, 43)",
      accent: "rgb(66, 104, 0)"
    });
  });
});

test.describe("1.1.5 P3 B-1 shell and flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("uses one contextual header and preserves every destination in the responsive navigation", async ({ context, page }, testInfo) => {
    const account = await createAccount(context, `B-1 shell ${testInfo.project.name}`);
    try {
      await page.goto("/songs");
      await expect(page.locator("html")).toHaveAttribute("data-ui-variant", "b1");
      await expect(page.locator(".workspace-tabs")).toBeHidden();

      if (!testInfo.project.name.includes("mobile")) {
        const contextHeading = page.getByRole("group", { name: "현재 작업 영역" });
        await expect(contextHeading).toContainText("라이브러리");
        await expect(contextHeading).toContainText("곡 · 가사");
        const songsLink = page.getByRole("navigation", { name: "데스크톱 주 메뉴" }).getByRole("link", { name: "곡", exact: true });
        await expect(songsLink).toHaveAttribute("title", "곡");
        await expect(songsLink).toHaveAttribute("aria-current", "page");
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
        await expect(page.locator(".workspace-shell")).toHaveClass(/is-collapsed/);
        await expect(songsLink).toHaveAttribute("title", "곡");
      } else {
        const primary = page.getByRole("navigation", { name: "모바일 주 메뉴" });
        await expect(primary.locator("a:visible, button:visible")).toHaveCount(5);
        await expect(primary.getByRole("link", { name: "즐겨찾기" })).toBeHidden();
        await primary.getByRole("button", { name: "더보기" }).click();
        const more = page.getByRole("dialog", { name: "더보기" });
        await expect(more.getByRole("link", { name: /즐겨찾기/ })).toBeVisible();
        await expect(more.getByRole("link", { name: /최근 작업/ })).toBeVisible();
        await expect(more.getByRole("link", { name: /템플릿/ })).toBeVisible();
        await expect(more.getByRole("link", { name: /휴지통/ })).toBeVisible();
        await expect(more.getByRole("link", { name: /설정/ })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(primary.getByRole("button", { name: "더보기" })).toBeFocused();
      }
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.setViewportSize(testInfo.project.name.includes("mobile") ? { width: 320, height: 720 } : { width: 720, height: 500 });
      await expect(page.getByRole("navigation", { name: "모바일 주 메뉴" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      await deleteAccounts([account.userId]);
    }
  });

  test("keeps the same editor, Korean input, selection and undo history during shell interaction", async ({ context, page }, testInfo) => {
    test.setTimeout(80_000);
    const account = await createAccount(context, `B-1 editor ${testInfo.project.name}`);
    try {
      const lyric = await createLyric(page.request);
      await page.goto(`/lyrics/${lyric.lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 30_000 });
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 30_000 });
      await editor.evaluate((element) => { element.setAttribute("data-p3-editor-instance", "preserved"); });
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText(" 한글 입력 유지");
      await expect(editor).toContainText("한글 입력 유지");

      if (!testInfo.project.name.includes("mobile")) {
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
      } else {
        await page.getByRole("navigation", { name: "모바일 주 메뉴" }).getByRole("button", { name: "더보기" }).click();
        await page.keyboard.press("Escape");
      }

      await expect(editor).toHaveAttribute("data-p3-editor-instance", "preserved");
      await editor.click();
      await page.keyboard.press("Control+z");
      await expect(editor).not.toContainText("한글 입력 유지");
      await expect(editor).toContainText("시작 문장");
    } finally {
      await deleteAccounts([account.userId]);
    }
  });

  test("shows normal, empty, loading, failure and protected-route states without losing the shell", async ({ browser, context, page }, testInfo) => {
    const account = await createAccount(context, `B-1 states ${testInfo.project.name}`);
    let releaseLoading!: () => void;
    const loading = new Promise<void>((resolve) => { releaseLoading = resolve; });
    try {
      await page.goto("/songs");
      await expect(page.getByRole("heading", { name: /곡/ }).first()).toBeVisible();
      await expect(page.locator(".song-empty")).toBeVisible();

      await page.route("**/api/search?*", async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q");
        if (query === "B-1 loading") {
          await loading;
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null }) });
          return;
        }
        await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      });
      await page.goto("/search");
      const search = page.getByRole("searchbox", { name: "통합 검색어" });
      await search.fill("B-1 loading");
      await expect(page.locator(".search-results")).toHaveAttribute("aria-busy", "true");
      releaseLoading();
      await expect(page.getByRole("heading", { name: "검색 결과가 없습니다" })).toBeVisible();
      await search.fill("B-1 failure");
      await expect(page.locator(".search-error")).toBeVisible();
      if (!testInfo.project.name.includes("mobile")) await expect(page.getByRole("group", { name: "현재 작업 영역" })).toContainText("검색");
      else await expect(page.getByRole("navigation", { name: "모바일 주 메뉴" })).toBeVisible();

      const anonymous = await browser.newContext({ baseURL: origin });
      try {
        const protectedPage = await anonymous.newPage();
        await protectedPage.goto("/songs");
        await expect(protectedPage).toHaveURL(/\/auth(?:\?|$)/);
      } finally { await anonymous.close(); }
    } finally {
      releaseLoading();
      await deleteAccounts([account.userId]);
    }
  });
});

test.describe("1.1.5 P4 B-1 recovery and access regression", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps one editor and saves the exact offline draft after responsive shell interaction", async ({ context, page }, testInfo) => {
    test.setTimeout(100_000);
    const account = await createAccount(context, `B-1 P4 recovery ${testInfo.project.name}`);
    try {
      const lyric = await createLyric(page.request);
      await page.goto(`/lyrics/${lyric.lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 30_000 });
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 30_000 });
      await editor.evaluate((element) => { element.setAttribute("data-p4-editor-instance", "preserved"); });
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText(" 온라인 셸 입력");

      const mobile = testInfo.project.name.includes("mobile");
      if (mobile) {
        const moreButton = page.getByRole("navigation", { name: "모바일 주 메뉴" }).getByRole("button", { name: "더보기" });
        await moreButton.click();
        await page.keyboard.press("Escape");
        await expect(moreButton).toBeFocused();
      } else {
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
      }
      await expect(editor).toHaveAttribute("data-p4-editor-instance", "preserved");

      await context.setOffline(true);
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText(" 오프라인 원문 마땅한");
      await expect(editor).toContainText("오프라인 원문 마땅한");
      await expect(editor).toHaveAttribute("data-p4-editor-instance", "preserved");
      await context.setOffline(false);

      await expect.poll(async () => {
        const response = await page.request.get(`/api/lyrics/${lyric.lyricId}`);
        if (response.status() !== 200) return "";
        return (await response.json()).lyric.body as string;
      }, { timeout: 30_000 }).toBe("시작 문장 온라인 셸 입력 오프라인 원문 마땅한");
      await page.reload();
      await expect(page.locator(".cm-content")).toContainText("시작 문장 온라인 셸 입력 오프라인 원문 마땅한");
    } finally {
      await context.setOffline(false).catch(() => undefined);
      await deleteAccounts([account.userId]);
    }
  });

  test("restores filtered recent deep links and keeps another owner outside the B-1 workspace", async ({ browser, context, page }, testInfo) => {
    const owner = await createAccount(context, `B-1 P4 owner ${testInfo.project.name}`);
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, `B-1 P4 other ${testInfo.project.name}`);
    try {
      const lyric = await createLyric(page.request);
      expect((await page.request.post(`/api/recent/${lyric.lyricId}/open`, { headers: mutationHeaders })).status()).toBe(204);
      await page.goto("/recent?type=lyrics");
      await expect(page).toHaveURL(/\/recent\?type=lyrics/);
      const card = page.locator(".recent-card").filter({ hasText: "B-1 editor lyric" });
      await expect(card).toHaveCount(1);
      await card.getByRole("link", { name: "계속 편집 →" }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${lyric.lyricId}\\?returnTo=`));
      await expect(page.locator(".cm-content")).toContainText("시작 문장");
      await expect(page.locator("html")).toHaveAttribute("data-ui-variant", "b1");

      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      if (testInfo.project.name.includes("mobile")) {
        const moreButton = page.getByRole("navigation", { name: "모바일 주 메뉴" }).getByRole("button", { name: "더보기" });
        await moreButton.click();
        await expect(page.getByRole("dialog", { name: "더보기" }).getByRole("link", { name: /최근 작업/ })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(moreButton).toBeFocused();
      } else {
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
        await expect(page.getByRole("navigation", { name: "데스크톱 주 메뉴" }).getByRole("link", { name: "최근 작업" })).toHaveAttribute("title", "최근 작업");
      }

      expect((await otherContext.request.get(`/api/lyrics/${lyric.lyricId}`)).status()).toBe(404);
      const otherPage = await otherContext.newPage();
      await otherPage.goto("/recent?type=lyrics");
      await expect(otherPage.getByRole("heading", { name: "표시할 최근 작업이 없습니다." })).toBeVisible();
      await expect(otherPage.locator("html")).toHaveAttribute("data-ui-variant", "b1");
      const health = await (await page.request.get("/api/health/ready")).json();
      expect(health.build.version).toBe(process.env.APP_VERSION ?? "1.1.7a");
    } finally {
      await otherContext.close();
      await deleteAccounts([owner.userId, other.userId]);
    }
  });
});

async function resolvedTokens(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const resolve = (name: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    return {
      canvas: resolve("--canvas"),
      panel: resolve("--panel"),
      ink: styles.color,
      accent: resolve("--acid")
    };
  });
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `ui-115-p3-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function createLyric(request: APIRequestContext) {
  const song = await request.post("/api/songs", { headers: mutationHeaders, data: { requestId: randomUUID(), title: "B-1 editor song", status: "revising" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await request.post(`/api/songs/${songId}/lyrics`, { headers: mutationHeaders, data: { requestId: randomUUID(), title: "B-1 editor lyric", body: "시작 문장", status: "revising" } });
  expect(lyric.status()).toBe(201);
  return { songId, lyricId: (await lyric.json()).lyric.id as string };
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
