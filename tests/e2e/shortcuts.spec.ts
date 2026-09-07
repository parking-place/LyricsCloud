import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.8.0 keyboard commands", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("shows a searchable responsive guide and restores help focus", async ({ context, page }, info) => {
    const account = await createAccount(context, `단축키 도움말 ${info.project.name}`);
    try {
      if (info.project.use.isMobile) await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/settings#keyboard");
      const guide = page.locator("#keyboard");
      await expect(guide.locator("[data-command-id]")).toHaveCount(8);
      await guide.getByRole("searchbox", { name: "단축키 검색" }).fill("패널");
      await expect(guide.locator("[data-command-id]")).toHaveCount(1);
      await expect(guide.locator('[data-command-id="toggle_resource_panel"]')).toBeVisible();
      await guide.getByRole("searchbox", { name: "단축키 검색" }).fill("없는 명령");
      await expect(guide.getByText("일치하는 단축키가 없습니다", { exact: false })).toBeVisible();

      const open = page.getByRole("button", { name: "단축키 도움말" });
      await open.click();
      const dialog = page.getByRole("dialog", { name: "단축키 도움말" });
      await expect(dialog).toBeVisible();
      const dialogSearch = dialog.getByRole("searchbox", { name: "단축키 검색" });
      const dialogClose = dialog.getByRole("button", { name: "닫기" });
      await expect(dialogSearch).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(dialogClose).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(dialogSearch).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (info.project.name === "desktop" || info.project.name === "mobile") {
        await page.screenshot({ path: `docs/runbooks/evidence/0.8.0-phase3-shortcuts-${info.project.name}.png`, fullPage: true });
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(open).toBeFocused();
    } finally { await deleteAccount(account.userId); }
  });

  test("keeps browser and text-entry keys while global commands navigate", async ({ context, page }, info) => {
    test.skip(Boolean(info.project.use.isMobile), "mobile hardware keyboard is outside this phase");
    const account = await createAccount(context, "전역 단축키");
    try {
      await page.goto("/workspace");
      const prevented = await page.evaluate(() => [
        { key: "s", ctrlKey: true }, { key: "f", ctrlKey: true }, { key: "Tab" }
      ].map((init) => {
        const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }));
      expect(prevented).toEqual([false, false, false]);

      await page.evaluate(() => document.body.dispatchEvent(new CompositionEvent("compositionstart", { data: "ㅎ", bubbles: true })));
      await page.keyboard.press("Control+Alt+K");
      await expect(page).toHaveURL(/\/workspace$/);
      await page.evaluate(() => document.body.dispatchEvent(new CompositionEvent("compositionend", { data: "한", bubbles: true })));
      await page.keyboard.press("Control+Alt+K");
      await expect(page).toHaveURL(/\/search$/);
      const search = page.getByRole("searchbox", { name: "통합 검색어" });
      await expect(search).toBeFocused();
      await search.press("Control+Alt+K");
      await expect(page).toHaveURL(/\/search$/);

      await page.goto("/workspace");
      await page.keyboard.press("Control+Alt+/");
      await expect(page.getByRole("dialog", { name: "단축키 도움말" })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+Alt+N");
      await expect(page).toHaveURL(/\/lyrics\/new\?returnTo=/);
    } finally { await deleteAccount(account.userId); }
  });

  test("preserves draft, cursor context and copy fallback across editor commands", async ({ context, page }, info) => {
    test.skip(Boolean(info.project.use.isMobile), "mobile hardware keyboard is outside this phase");
    const account = await createAccount(context, "편집기 단축키");
    try {
      const song = await api(page, "post", "/api/songs", { requestId: randomUUID(), title: "단축키 곡" });
      const songId = song.song.id as string;
      const lyricIds: string[] = [];
      for (const title of ["첫 가사", "가운데 가사", "마지막 가사"]) {
        const body = title === "가운데 가사"
          ? `[Verse]\n${Array.from({ length: 90 }, (_, index) => `${index + 1}번째 긴 가사 줄 ${"리듬 ".repeat(8)}`).join("\n")}`
          : `[Verse]\n${title}`;
        const lyric = await api(page, "post", `/api/songs/${songId}/lyrics`, { requestId: randomUUID(), title, body });
        lyricIds.push(lyric.lyric.id as string);
      }
      const listed = await api(page, "get", `/api/songs/${songId}/lyrics`);
      const items = listed.items as Array<{ id: string }>;
      const currentId = lyricIds[1]!;
      const currentIndex = items.findIndex((item) => item.id === currentId);
      const nextId = items[currentIndex + 1]!.id;

      await page.goto(`/lyrics/${currentId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const editor = page.locator(".cm-content");
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n이동 전 보존 문장");
      const scroller = page.locator(".cm-scroller");
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

      await page.keyboard.press("Alt+Shift+P");
      await expect(page.locator(".editor-resource-shell")).not.toHaveClass(/is-desktop-open/);
      await expect(editor).toBeFocused();
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.keyboard.press("Alt+Shift+P");
      await expect(page.locator(".editor-resource-shell")).toHaveClass(/is-desktop-open/);
      await expect(editor).toBeFocused();
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.keyboard.insertText(" · 패널 후");

      await editor.dispatchEvent("compositionstart", { data: "ㅎ" });
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "p", altKey: true, shiftKey: true, isComposing: true, bubbles: true, cancelable: true })));
      await expect(page.locator(".editor-resource-shell")).toHaveClass(/is-desktop-open/);
      await editor.dispatchEvent("compositionend", { data: "한" });

      await page.keyboard.press("Alt+Shift+F");
      await expect(page.locator(".lyric-editor-page")).toHaveClass(/is-focus-mode/);
      await expect(editor).toBeFocused();
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.keyboard.press("Alt+Shift+F");
      await expect(page.locator(".lyric-editor-page")).not.toHaveClass(/is-focus-mode/);
      await expect(editor).toBeFocused();
      await page.keyboard.insertText(" · 집중 후");

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
      await page.keyboard.press("Alt+Shift+C");
      const copyDialog = page.getByRole("dialog", { name: "가사 전체를 직접 복사해 주세요" });
      const copyValue = await copyDialog.getByRole("textbox", { name: "수동 복사할 가사" }).inputValue();
      expect(copyValue).toContain("1번째 긴 가사 줄");
      expect(copyValue).toContain("이동 전 보존 문장 · 패널 후 · 집중 후");
      await copyDialog.getByRole("button", { name: "닫기" }).click();

      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "}", altKey: true, shiftKey: true, bubbles: true, cancelable: true })));
      await expect(page).toHaveURL(new RegExp(`/lyrics/${nextId}`));
      await expect.poll(async () => ((await (await page.request.get(`/api/lyrics/${currentId}`)).json()).lyric.body as string)).toContain("이동 전 보존 문장 · 패널 후 · 집중 후");

      const refreshed = await api(page, "get", `/api/songs/${songId}/lyrics`);
      const refreshedItems = refreshed.items as Array<{ id: string }>;
      const previousSourceId = refreshedItems[1]!.id;
      const refreshedPreviousId = refreshedItems[0]!.id;
      await page.goto(`/lyrics/${previousSourceId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.locator(".cm-content").click();
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "{", altKey: true, shiftKey: true, bubbles: true, cancelable: true })));
      await expect(page).toHaveURL(new RegExp(`/lyrics/${refreshedPreviousId}`));
    } finally { await deleteAccount(account.userId); }
  });
});

async function api(page: Page, method: "get" | "post", path: string, data?: unknown) {
  const response = method === "get" ? await page.request.get(path) : await page.request.post(path, { headers, data });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `shortcuts-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
