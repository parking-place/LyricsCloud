import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const requestHeaders = { Origin: origin };

test.describe("0.9.0 accessibility and state contract", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("has no serious automated accessibility violations on all 15 screens in both themes", async ({ context, page }) => {
    test.setTimeout(180_000);
    await addSession(context);
    const fixture = await seedFixture(page);
    const failures: string[] = [];
    const screens = [
      ["01-auth", "/auth?error=AUTH_PROVIDER_UNAVAILABLE", ".auth-layout"],
      ["02-songs", "/songs", ".songs-page"],
      ["03-song-form", "/songs/new", ".song-form-page"],
      ["04-song-dashboard", `/songs/${fixture.songId}`, ".dashboard-page"],
      ["05-lyrics-editor", `/lyrics/${fixture.lyricId}`, ".lyric-editor-page"],
      ["06-rhyme-notes", "/rhymes", ".rhymes-page"],
      ["07-rhyme-editor", `/rhymes/${fixture.rhymeId}`, ".rhyme-editor-page"],
      ["08-prompts", "/prompts", ".prompts-page"],
      ["09-prompt-editor", `/prompts/${fixture.promptId}`, ".prompt-editor-page"],
      ["10-search", "/search?q=접근성&type=all", ".search-page"],
      ["11-recent", "/recent", ".recent-page"],
      ["12-favorites", "/favorites", ".favorites-page"],
      ["13-trash", "/trash", ".trash-page"],
      ["14-templates", "/templates", ".templates-page"],
      ["15-settings", "/settings", ".settings-page"]
    ] as const;

    for (const theme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      for (const [id, path, selector] of screens) {
        if (id === "01-auth") await context.clearCookies();
        else await addSession(context);
        const response = await page.goto(path, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `${theme}/${id}`).toBeLessThan(400);
        await expect(page.locator(selector).last()).toBeVisible({ timeout: 20_000 });
        await waitForStableScreen(page, id);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const serious = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
        if (serious.length) failures.push(formatViolations(theme, id, serious));
        if (await page.locator("h1").count() !== 1) failures.push(`${theme}/${id}: expected exactly one h1`);
        const visibleMainCount = await page.locator("main:visible").count();
        if (visibleMainCount !== 1) failures.push(`${theme}/${id}: expected exactly one visible main landmark, received ${visibleMainCount}`);
      }
    }
    expect(failures, failures.join("\n\n")).toEqual([]);
  });

  test("traps dialog focus, closes with Escape, and restores the trigger", async ({ context, page }) => {
    await addSession(context);
    const fixture = await seedFixture(page);
    await page.goto(`/songs/${fixture.songId}`);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });

    const deleteTrigger = page.getByRole("button", { name: "곡 삭제", exact: true });
    await deleteTrigger.focus();
    await deleteTrigger.click();
    const deleteDialog = page.getByRole("dialog", { name: /곡을 삭제할까요/ });
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole("button", { name: "취소" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(deleteDialog.getByRole("button", { name: "곡 삭제 확인" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(deleteDialog.getByRole("button", { name: "취소" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(deleteDialog).toBeHidden();
    await expect(deleteTrigger).toBeFocused();

    await page.goto("/workspace");
    const quickAddTrigger = page.locator(".top-quick-add:visible, .quick-add:visible").first();
    await quickAddTrigger.focus();
    await quickAddTrigger.click();
    const quickAddDialog = page.getByRole("dialog", { name: "빠른 추가" });
    await expect(quickAddDialog).toBeVisible();
    await expect(quickAddDialog.locator("textarea")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(quickAddDialog).toBeHidden();
    await expect(quickAddTrigger).toBeFocused();
  });

  test("separates empty, server error, offline, and permission states without horizontal loss", async ({ context, page }) => {
    await addSession(context);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/search?q=접근성결과없음&type=all");
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('[data-state-kind="empty"]')).toContainText("검색 결과가 없습니다");
    await expect(page.getByRole("button", { name: "검색 조건 다시 고르기" })).toBeVisible();

    await page.route("**/api/search?*", (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"INTERNAL_ERROR"}}' }));
    const input = page.getByRole("searchbox", { name: "통합 검색어" });
    await input.fill("서버오류주입");
    const searchError = page.locator(".search-error");
    await expect(searchError).toContainText("검색 결과를 불러오지 못했습니다");

    await context.setOffline(true);
    await expect(page.getByText("오프라인 · 초안은 이 기기에 보관됩니다", { exact: false })).toBeVisible();
    await expect(searchError).toContainText("검색 결과를 불러오지 못했습니다");
    await context.setOffline(false);

    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const horizontalOverflow = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= viewportWidth) return [];
      return [...document.querySelectorAll<HTMLElement>("body *")].flatMap((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.right <= viewportWidth + 1 && bounds.left >= -1) return [];
        return [`${element.tagName.toLowerCase()}.${element.className || "-"}[${Math.round(bounds.left)},${Math.round(bounds.right)}]`];
      }).slice(0, 20);
    });
    expect(horizontalOverflow).toEqual([]);
    const transition = await page.locator(".search-page").evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(Number.parseFloat(transition)).toBeLessThanOrEqual(0.01);

    await context.clearCookies();
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.locator(".auth-layout")).toBeVisible();
    await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toBeVisible();
  });
});

async function addSession(context: BrowserContext) {
  await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

async function seedFixture(page: Page) {
  const suffix = randomUUID().slice(0, 8);
  const song = await page.request.post("/api/songs", { headers: requestHeaders, data: {
    requestId: randomUUID(), title: `접근성 감사 곡 ${suffix}`, description: "긴 한국어 제목과 상태를 점검하는 합성 자료",
    workNotes: "본문을 포함하지 않는 접근성 테스트 메모", status: "revising", color: "blue", isFavorite: true, isPinned: true
  } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;

  const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers: requestHeaders, data: {
    requestId: randomUUID(), title: `접근성 감사 가사 ${suffix}`, body: "[Verse]\n합성 입력으로 상태를 점검해\n\n[Hook]\n키보드로 모든 동작을 이어가",
    memo: "합성 테스트 메모", status: "revising"
  } });
  expect(lyric.status()).toBe(201);
  const lyricId = (await lyric.json()).lyric.id as string;

  const rhyme = await page.request.post("/api/rhymes", { headers: requestHeaders, data: {
    requestId: randomUUID(), title: `접근성 감사 라임 ${suffix}`, body: "이어가 / 피어나", color: "green", isFavorite: true, isPinned: true
  } });
  expect(rhyme.status()).toBe(201);
  const rhymeId = (await rhyme.json()).rhyme.id as string;

  const prompt = await page.request.post("/api/prompts", { headers: requestHeaders, data: {
    requestId: randomUUID(), title: `접근성 감사 프롬프트 ${suffix}`, tokens: ["Warm pop", "Clear vocal", "Mid tempo"]
  } });
  expect(prompt.status()).toBe(201);
  const promptId = (await prompt.json()).prompt.id as string;

  return { songId, lyricId, rhymeId, promptId };
}

async function waitForStableScreen(page: Page, id: string) {
  if (["02-songs", "04-song-dashboard", "06-rhyme-notes", "08-prompts", "10-search", "14-templates"].includes(id)) {
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
  }
  await page.evaluate(() => document.fonts.ready);
}

function formatViolations(theme: string, id: string, violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  const detail = violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")} (${node.failureSummary ?? violation.help})`));
  return `${theme}/${id}\n${detail.join("\n")}`;
}
