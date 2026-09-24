import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.2.0 P2 Chroma Dock", () => {
  test.skip(process.env.LC_UI_VARIANT !== "chroma", "run this opt-in regression with LC_UI_VARIANT=chroma");
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
  });

  test("resolves both token sets with readable body and action contrast", async ({ page }, testInfo) => {
    await page.goto("/workspace");
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-ui-variant", "chroma");
    for (const theme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await expect(root).toHaveAttribute("data-theme", theme);
      const colors = await page.evaluate(() => {
        const probe = document.createElement("span");
        document.body.append(probe);
        const color = (name: string) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
        const result = { ink: color("--ink"), panel: color("--panel"), canvas: color("--canvas"), line: color("--line"), focus: color("--focus"), action: color("--acid"), actionInk: color("--acid-ink") };
        probe.remove();
        return result;
      });
      expect(contrast(colors.ink, colors.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.actionInk, colors.action)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.line, colors.panel)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.line, colors.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.focus, colors.panel)).toBeGreaterThanOrEqual(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      if (theme === "light") await page.screenshot({ path: testInfo.outputPath(`chroma-home-light-${testInfo.project.name}.png`), fullPage: true, animations: "disabled" });
    }
  });

  test("has no serious automated home accessibility violations in either theme", async ({ page }) => {
    await page.goto("/workspace");
    for (const theme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      const results = await new AxeBuilder({ page }).include(".workspace-shell").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"), `${theme} home accessibility`).toEqual([]);
    }
  });

  test("keeps all ten destinations and the visible mobile alternatives reachable", async ({ page }, testInfo) => {
    await page.goto("/workspace");
    const mobile = testInfo.project.name === "mobile";
    if (mobile) {
      const nav = page.getByRole("navigation", { name: "모바일 주 메뉴" });
      const homeItem = nav.getByRole("link", { name: "홈" });
      await expect(homeItem).toHaveAttribute("aria-current", "page");
      const homeIcon = await homeItem.locator("span").boundingBox();
      const homeLabel = await homeItem.locator("strong").boundingBox();
      expect(homeIcon && homeLabel && homeIcon.y + homeIcon.height <= homeLabel.y, "mobile home icon and label stack vertically").toBe(true);
      await expect(nav.getByRole("link", { name: "통합 검색" })).toBeHidden();
      const header = await page.locator(".mobile-header").boundingBox();
      const home = await page.locator(".chroma-home").boundingBox();
      const layout = await page.evaluate(() => ({ workspace: getComputedStyle(document.querySelector(".workspace-shell")!).display, main: getComputedStyle(document.querySelector(".main-shell")!).display, headerRow: getComputedStyle(document.querySelector(".mobile-header")!).gridRow, homeRow: getComputedStyle(document.querySelector(".chroma-home")!).gridRow }));
      expect(header && home && header.y + header.height <= home.y, `mobile header precedes home content: header=${JSON.stringify(header)}, home=${JSON.stringify(home)}, layout=${JSON.stringify(layout)}`).toBe(true);
      const quickAdd = page.getByRole("link", { name: "빠른 추가 열기 · 새 곡 추가" });
      await expect(quickAdd).toBeVisible();
      await quickAdd.click();
      await expect(page.getByRole("dialog", { name: "빠른 추가" })).toBeVisible();
      await page.keyboard.press("Escape");
      await nav.getByRole("button", { name: "더보기" }).click();
      const more = page.getByRole("dialog", { name: "더보기" });
      for (const name of ["통합 검색", "즐겨찾기", "최근 작업", "템플릿", "휴지통", "설정"]) {
        await expect(more.getByRole("link", { name: new RegExp(name) })).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(nav.getByRole("button", { name: "더보기" })).toBeFocused();
    } else {
      const dock = page.getByRole("navigation", { name: "데스크톱 주 메뉴" });
      await expect(dock.getByRole("link")).toHaveCount(10);
      await expect(dock.getByRole("link", { name: "창작 홈" })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("button", { name: "좌측 메뉴 접기" })).toBeHidden();
      const quickAdd = page.getByRole("button", { name: "＋ 빠른 추가" });
      const dockBox = await dock.boundingBox();
      const addBox = await quickAdd.boundingBox();
      expect(dockBox && addBox && addBox.y + addBox.height < dockBox.y, "desktop quick add clears the dock").toBe(true);
      await quickAdd.click();
      await expect(page.getByRole("dialog", { name: "빠른 추가" })).toBeVisible();
      await page.keyboard.press("Escape");
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `overflow at ${width}px`).toBe(false);
      if (width <= 720) await expect(page.getByRole("navigation", { name: "모바일 주 메뉴" })).toBeVisible();
      else await expect(page.getByRole("navigation", { name: "데스크톱 주 메뉴" })).toBeVisible();
    }
    await page.setViewportSize({ width: 320, height: 700 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), "overflow at 320px with large text").toBe(false);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await expect(page.getByRole("heading", { name: /오늘은 어떤 이야기인가요/ })).toBeVisible();
  });

  test("renders owner data on home and distinguishes the genuine empty state", async ({ page }, testInfo) => {
    await page.goto("/workspace");
    await expect(page.getByText("아직 곡이 없습니다.")).toBeVisible();
    const title = `코발트 홈 합성 곡 ${randomUUID().slice(0, 8)}`;
    const created = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title, status: "idea" } });
    expect(created.status()).toBe(201);
    const songId = (await created.json()).song.id as string;
    try {
      expect((await page.request.put(`/api/songs/${songId}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
      await page.reload();
      await expect(page.locator(".chroma-home-song-grid").getByRole("link", { name: title })).toBeVisible();
      await expect(page.locator(".chroma-home-song-grid").getByRole("link", { name: title })).toHaveAttribute("href", new RegExp(`^/songs/${songId}\\?returnTo=%2Fworkspace$`));
      await expect(page.locator(".chroma-home-saved").getByRole("link", { name: title })).toBeVisible();
      await expect(page.getByRole("heading", { name: "나의 곡 1" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`chroma-home-${testInfo.project.name}.png`), fullPage: true, animations: "disabled" });
    } finally {
      expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
    }
  });

  test("keeps song filters and the rhyme, prompt, and search routes usable", async ({ page }, testInfo) => {
    const title = `코발트 목록 합성 곡 ${randomUUID().slice(0, 8)}`;
    const created = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title, status: "idea" } });
    expect(created.status()).toBe(201);
    const songId = (await created.json()).song.id as string;
    try {
      await page.goto("/songs");
      await expect(page.getByRole("heading", { name: "내 곡" })).toBeVisible();
      await expect(page.locator(".song-grid").getByRole("heading", { name: title })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`chroma-songs-${testInfo.project.name}.png`), fullPage: true, animations: "disabled" });
      const search = page.getByRole("searchbox", { name: "곡 검색" });
      await search.fill(title);
      await expect(page.locator(".song-grid").getByRole("heading", { name: title })).toBeVisible();
      await search.fill("일치하지 않는 합성 검색어");
      await expect(page.getByRole("heading", { name: "조건에 맞는 곡이 없어요" })).toBeVisible();
      await page.getByRole("button", { name: "검색 조건 지우기" }).click();
      await expect(page.locator(".song-grid").getByRole("heading", { name: title })).toBeVisible();
      for (const [path, heading] of [["/rhymes", "라임 노트"], ["/prompts", "프롬프트"], ["/search", "통합 검색"]] as const) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `overflow on ${path}`).toBe(false);
      }
    } finally {
      expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
    }
  });

  test("wraps a long owner title without losing actions at narrow width", async ({ page }) => {
    const title = `긴 제목 ${"한글과이모지🎵".repeat(16)} ${randomUUID().slice(0, 8)}`;
    const created = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title, status: "idea" } });
    expect(created.status()).toBe(201);
    const songId = (await created.json()).song.id as string;
    try {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto("/songs");
      const card = page.locator(".song-card").filter({ has: page.getByRole("heading", { name: title }) });
      await expect(card).toBeVisible();
      await expect(card.getByRole("button", { name: `${title} 즐겨찾기` })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await page.goto("/workspace");
      await expect(page.locator(".chroma-home-song-grid").getByRole("link", { name: title })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
    }
  });
});

function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const channels = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`invalid color: ${rgb}`);
    const linear = channels.map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; });
    return .2126 * linear[0]! + .7152 * linear[1]! + .0722 * linear[2]!;
  };
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + .05) / (dark + .05);
}
