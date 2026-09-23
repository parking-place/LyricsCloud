import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("historical UI repairs in 1.1.8", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires a parent-coordinated isolated E2E database");

  test("R08/R09: writing preferences reach the preview and reference controls remain reachable in both layouts", async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "one bounded session covers both retained layouts");
    const userId = await account(context);
    try {
      const defaults = (await (await page.request.get("/api/settings")).json()).settings;
      const settings = await page.request.put("/api/settings", { headers, data: { ...defaults, font: "serif", fontSize: 24, lineHeight: 1.9, letterSpacing: 0.02, focusModeDefault: false } });
      expect(settings.status()).toBe(200);
      const song = await create(page, "songs", { title: "자료 패널 회귀" }, "song");
      const lyric = await create(page, `songs/${song.id}/lyrics`, { title: "읽고 쓰는 가사", body: "[Verse]\n편집 공간과 자료의 버튼을 함께 사용할 수 있어야 합니다." }, "lyric");
      const prompt = await create(page, "prompts", { title: "작성 폰트 미리보기", mode: "sentence", sentenceText: "새벽의 공기를 노래해 주세요.\nKeep the original words." }, "prompt");
      for (const number of [1, 2, 3]) await create(page, "rhymes", { title: `참고 라임 ${number}`, body: "비교하며 쓸 수 있는 라임과 작업 메모입니다. ".repeat(8) }, "rhyme");
      await page.setViewportSize({ width: 1265, height: 712 });

      for (const variant of ["classic", "b1"]) {
        await page.goto(`/prompts/${prompt.id}`);
        await page.evaluate((value) => { document.documentElement.dataset.uiVariant = value; }, variant);
        const source = page.getByLabel("문장형 프롬프트 원문");
        await expect(source).toHaveValue("새벽의 공기를 노래해 주세요.\nKeep the original words.");
        const writingStyle = await source.evaluate((element) => {
          const style = getComputedStyle(element);
          return { family: style.fontFamily, size: style.fontSize, lineHeight: style.lineHeight, spacing: style.letterSpacing };
        });
        expect(writingStyle.size).toBe("24px");
        expect(writingStyle.family).toContain("Georgia");
        for (const preview of [page.locator(".prompt-copy-preview"), page.locator(".prompt-sentence-display")]) {
          await expect(preview).toHaveCSS("font-family", writingStyle.family);
          await expect(preview).toHaveCSS("font-size", writingStyle.size);
          await expect(preview).toHaveCSS("line-height", writingStyle.lineHeight);
          await expect(preview).toHaveCSS("letter-spacing", writingStyle.spacing);
        }

        await page.goto(`/lyrics/${lyric.id}`);
        await page.evaluate((value) => { document.documentElement.dataset.uiVariant = value; }, variant);
        const panel = page.locator(".editor-resource-panel");
        await expect(panel).toBeVisible();
        await expect(panel.locator(".editor-current-settings")).toHaveAttribute("open", "");
        // The rhyme tab adds a scope row; the lyric tab does not.
        for (const tab of ["다른 가사", "라임"]) {
          await panel.getByRole("tab", { name: tab, exact: true }).click();
          if (tab === "라임") await panel.getByRole("button", { name: "전체 자료", exact: true }).click();
          await expect(panel.getByRole("tabpanel")).toHaveAttribute("aria-busy", "false");
          await expect.poll(() => panel.evaluate((element) => {
            // Offscreen controls in a scroll container are usable; controls beyond
            // a hidden/clip ancestor are not reachable by ordinary user scrolling.
            return [...element.querySelectorAll<HTMLElement>("button, input, summary")].filter((control) => {
              const box = control.getBoundingClientRect();
              if (!box.width || !box.height) return false;
              for (let ancestor: HTMLElement | null = control.parentElement; ancestor && element.contains(ancestor); ancestor = ancestor.parentElement) {
                const bounds = ancestor.getBoundingClientRect();
                if (["hidden", "clip"].includes(getComputedStyle(ancestor).overflowY)
                  && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) return true;
              }
              return false;
            }).map((control) => control.getAttribute("aria-label") || control.textContent?.trim());
          })).toEqual([]);
        }
        const lastAction = panel.getByRole("button", { name: "참고 라임 3 자료 열기", exact: true });
        await lastAction.scrollIntoViewIfNeeded();
        await lastAction.click({ trial: true });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      }
    } finally { await removeAccount(userId); }
  });

  test("R12: a nonmanual move succeeds against reversed persisted anchors for songs, rhymes and prompts", async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "the same command contract applies to responsive cards");
    const userId = await account(context);
    try {
      for (const [path, key, card] of [["songs", "song", ".song-card"], ["rhymes", "rhyme", ".rhyme-card"], ["prompts", "prompt", ".prompt-card"]] as const) {
        const items: Array<{ id: string; title: string }> = [];
        for (const letter of ["A", "B", "C", "D"]) items.push(await create(page, path, { title: `순서 회귀 ${letter}`, ...(path === "prompts" ? { tokens: ["dream pop"] } : {}) }, key));
        // Persist D,C,B,A through the real API, independently of title display A,B,C,D.
        for (const item of items) {
          const current = (await (await page.request.get(`/api/${path}?sort=manual&limit=12`)).json());
          if (current.items[0].id === item.id) continue;
          const moved = await page.request.post(`/api/${path}/order/moves`, { headers, data: { requestId: randomUUID(), itemId: item.id, beforeId: current.items[0].id, afterId: null, expectedVersion: current.orderVersion } });
          expect(moved.status()).toBe(200);
        }
        await page.goto(`/${path}?sort=title_asc`);
        await expect(page.locator(`${card} h2`)).toHaveText(items.map(({ title }) => title));
        const saved = page.waitForResponse((response) => response.url().endsWith(`/api/${path}/order/moves`) && response.request().method() === "POST");
        await page.getByRole("button", { name: "순서 회귀 A 뒤로 이동", exact: true }).click();
        expect((await saved).status()).toBe(200);
        const expected = ["순서 회귀 D", "순서 회귀 A", "순서 회귀 C", "순서 회귀 B"];
        await expect(page).toHaveURL(new RegExp(`/${path}\\?sort=manual`));
        await expect(page.locator(`${card} h2`)).toHaveText(expected);
        await page.reload();
        await expect(page.locator(`${card} h2`)).toHaveText(expected);
      }
    } finally { await removeAccount(userId); }
  });
});

async function create(page: Page, path: string, data: Record<string, unknown>, key: string): Promise<{ id: string; title: string }> {
  const response = await page.request.post(`/api/${path}`, { headers, data: { requestId: randomUUID(), ...data } });
  expect(response.status()).toBe(201);
  return (await response.json())[key];
}

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `historical-ui-118-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'과거 UI 동작 회귀')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function removeAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
