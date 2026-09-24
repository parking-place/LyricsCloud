import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox, webkit, expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.2.0 P4 Chroma cross-browser acceptance", () => {
  test.skip(process.env.LC_UI_VARIANT !== "chroma", "requires the opt-in Chroma variant");
  test.skip(!process.env.E2E_DATABASE_URL, "requires an isolated E2E database");

  test("preserves real writing routes and reflow across three browser engines", async ({ page }, info) => {
    test.setTimeout(240_000);
    test.skip(info.project.name !== "desktop", "one three-engine matrix per isolated database");
    await page.context().addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const songTitle = `P4 교차 브라우저 ${randomUUID().slice(0, 8)}`;
    const songResponse = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: songTitle } });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    let lyricId: string | undefined;
    try {
      const lyricResponse = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
        requestId: randomUUID(), title: "한글과 이모지 🎵", body: "[Verse]\n한글 입력 보존 🎵"
      } });
      expect(lyricResponse.status()).toBe(201);
      lyricId = (await lyricResponse.json()).lyric.id as string;
      for (const [engineName, engine] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]] as const) {
        const browser = await engine.launch();
        try {
          const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
          await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
          const screen = await context.newPage();
          const errors: string[] = [];
          screen.on("pageerror", (error) => errors.push(error.message));
          for (const theme of ["light", "dark"] as const) {
            await screen.emulateMedia({ colorScheme: theme });
            for (const width of [320, 390, 768, 1024, 1440]) {
              await screen.setViewportSize({ width, height: width === 320 ? 700 : 900 });
              for (const [path, selector] of [
                ["/workspace", ".chroma-home"],
                [`/songs/${songId}`, "section.dashboard-page"],
                [`/lyrics/${lyricId}`, ".lyric-editor-page"],
                ["/settings", ".settings-page"],
                ["/trash", ".trash-page"]
              ] as const) {
                const response = await screen.goto(path, { waitUntil: "domcontentloaded" });
                expect(response?.status(), `${engineName}/${theme}/${width}/${path} HTTP`).toBe(200);
                await expect(screen.locator(selector), `${engineName}/${theme}/${width}/${path} visible`).toBeVisible();
                await expect(screen.locator("html")).toHaveAttribute("data-ui-variant", "chroma");
                await expect(screen.locator("html")).toHaveAttribute("data-theme", theme);
                expect(await screen.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
                  `${engineName}/${theme}/${width}/${path} horizontal overflow`).toBe(false);
                if (engineName === "chromium" && path === "/workspace" &&
                  ((theme === "light" && width === 1440) || (theme === "dark" && width === 320))) {
                  await screen.screenshot({ path: info.outputPath(`chroma-${theme}-${width}.png`), animations: "disabled" });
                }
                if (path.startsWith("/lyrics/")) {
                  await expect(screen.locator(".cm-content[contenteditable='true']")).toContainText("한글 입력 보존 🎵");
                }
              }
            }
          }
          expect(errors, `${engineName} page errors`).toEqual([]);
          await context.close();
        } finally { await browser.close(); }
      }
    } finally {
      expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
    }
  });

  test("keeps focus, modal exit and critical accessibility clear in constrained modes", async ({ context, page }) => {
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce", forcedColors: "active" });
    await page.goto("/workspace");
    await expect(page.locator(".chroma-home")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "모바일 주 메뉴" });
    const moreButton = nav.getByRole("button", { name: "더보기" });
    await moreButton.focus();
    await expect(moreButton).toBeFocused();
    await moreButton.press("Enter");
    const more = page.getByRole("dialog", { name: "더보기" });
    await expect(more).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(moreButton).toBeFocused();
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    for (const path of ["/settings", "/trash"]) {
      await page.goto(path);
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(audit.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"), path).toEqual([]);
    }
  });
});
