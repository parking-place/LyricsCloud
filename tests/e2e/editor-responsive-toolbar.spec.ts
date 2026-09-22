import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test("keeps lyric toolbar labels readable and the document usable at laptop and mobile widths", async ({ context, page }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");
  test.skip(info.project.name.includes("mobile"), "one session exercises both responsive toolbars");

  const userId = randomUUID();
  const token = `editor-toolbar-${randomUUID()}`;
  try {
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, "편집 도구 회귀"]);
      await pool.query(`insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
        values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')`, [hashToken(token), userId]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const headers = { Origin: origin };
    const songResponse = await page.request.post("/api/songs", {
      headers, data: { requestId: randomUUID(), title: "툴바 배치 확인" }
    });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    const body = "[Verse]\n한글 가사를 편집할 공간이 남아야 합니다.";
    const lyricResponse = await page.request.post(`/api/songs/${songId}/lyrics`, {
      headers, data: { requestId: randomUUID(), title: "반응형 편집기", body }
    });
    expect(lyricResponse.status()).toBe(201);
    const lyricId = (await lyricResponse.json()).lyric.id as string;

    await page.setViewportSize({ width: 1265, height: 712 });
    await page.goto(`/lyrics/${lyricId}?find=${encodeURIComponent("한글")}`);
    await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
    await expect(page.locator(".cm-content")).toContainText("한글 가사를 편집할 공간");
    await expect(page.locator("p.editor-command-notice")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const editor = await page.locator(".cm-editor").elementHandle();
    expect(editor).not.toBeNull();

    for (const variant of ["b1", "classic"]) {
      for (const { width, height, theme } of [
        { width: 1265, height: 712, theme: "dark" },
        { width: 960, height: 712, theme: "light" },
        { width: 1366, height: 712, theme: "dark" },
        { width: 320, height: 844, theme: "dark" },
        { width: 320, height: 844, theme: "light" },
        { width: 390, height: 844, theme: "dark" },
        { width: 390, height: 844, theme: "light" }
      ]) {
        await test.step(`${variant} ${theme} ${width}x${height}`, async () => {
          // Exercise both existing CSS contracts without navigating/remounting the editor.
          await page.evaluate(({ variant, theme }) => {
            document.documentElement.dataset.uiVariant = variant;
            document.documentElement.dataset.theme = theme;
          }, { variant, theme });
          await page.setViewportSize({ width, height });
          if (width <= 720) {
            const dock = page.getByRole("group", { name: "가사 편집 도구", exact: true });
            await expect(dock.getByRole("button", { name: "전체 복사", exact: true })).toBeVisible();
            await expect(page.locator("p.editor-command-notice")).toHaveCSS("pointer-events", "none");
            await expect.poll(() => page.locator("a.mobile-settings").evaluate((element) => {
              const box = element.getBoundingClientRect();
              return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
            })).toBe(true);
            await expect.poll(() => dock.evaluate((element) => {
              const dockBox = element.getBoundingClientRect();
              return [...element.querySelectorAll<HTMLButtonElement>(":scope > button")].filter((button) => {
                const box = button.getBoundingClientRect();
                // Badges use a smaller font: check each text run, not their differing baselines.
                const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
                let unreadable = false;
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                  if (!node.textContent?.trim()) continue;
                  const range = document.createRange(); range.selectNodeContents(node);
                  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
                  unreadable ||= new Set(rects.map((rect) => Math.round(rect.top))).size > 1
                    || rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1);
                }
                return unreadable || Number.parseFloat(getComputedStyle(button).fontSize) < 12
                  || box.height < 44 || box.height > 64 || box.left < dockBox.left - 1 || box.right > dockBox.right + 1;
              }).map((button) => button.textContent?.trim());
            })).toEqual([]);
            await expect.poll(() => dock.evaluate((element) => {
              const dockBox = element.getBoundingClientRect();
              const surface = document.querySelector(".lyric-editor-surface")!.getBoundingClientRect();
              return {
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                contained: dockBox.left >= 0 && dockBox.right <= innerWidth && dockBox.bottom <= innerHeight,
                compact: dockBox.height <= 160,
                writingSpace: Math.min(surface.bottom, dockBox.top) - Math.max(surface.top, 0) >= 200
              };
            })).toEqual({ overflow: false, contained: true, compact: true, writingSpace: true });
            expect(await editor!.evaluate((element) => element === document.querySelector(".cm-editor"))).toBe(true);
            return;
          }
          const header = page.locator(".lyric-editor-header");
          await expect(header.getByRole("button", { name: "버전 비교", exact: true })).toBeVisible();
          await expect.poll(() => header.evaluate((element) => {
            const headerBox = element.getBoundingClientRect();
            return [...element.querySelectorAll<HTMLButtonElement>(".editor-header-actions > button, .lyric-sequence-nav > button")]
              .filter((button) => {
                const box = button.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(button);
                const text = [...range.getClientRects()].filter((rect) => rect.width > 0);
                const wrapped = new Set(text.map((rect) => Math.round(rect.top))).size > 1;
                const clipped = text.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1);
                return wrapped || clipped || box.left < headerBox.left - 1 || box.right > headerBox.right + 1;
              }).map((button) => button.textContent?.trim());
          })).toEqual([]);
          // The toolbar must leave a useful writing area, not just avoid page overflow.
          await expect.poll(() => page.locator(".lyric-editor-surface").evaluate((element) => {
            const box = element.getBoundingClientRect();
            return Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
          })).toBeGreaterThanOrEqual(200);
          expect(await editor!.evaluate((element) => element === document.querySelector(".cm-editor"))).toBe(true);
        });
      }
    }
  } finally {
    await withE2eDatabase((pool) => pool.query("delete from app_users where id = $1", [userId]));
  }
});
