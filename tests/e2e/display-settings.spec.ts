import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.8.0 display settings", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("enforces account and lyric ownership, allowlists, precedence and reset", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "API contract runs once");
    const aliceContext = await browser.newContext({ baseURL: origin }); const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "설정 앨리스"); const bob = await createAccount(bobContext, "설정 밥");
    try {
      const defaults = (await (await aliceContext.request.get("/api/settings")).json()).settings;
      expect(defaults).toMatchObject({ theme: "system", font: "sans", fontSize: 18, rowVersion: 0 });
      expect((await aliceContext.request.put("/api/settings", { headers, data: { ...defaults, font: "url(https://evil.invalid/font.woff2)" } })).status()).toBe(400);
      const savedResponse = await aliceContext.request.put("/api/settings", { headers, data: { ...defaults, theme: "dark", font: "serif", fontSize: 20, lineHeight: 1.7, letterSpacing: 0.02, focusModeDefault: true } });
      expect(savedResponse.status()).toBe(200); const saved = (await savedResponse.json()).settings;
      expect((await (await bobContext.request.get("/api/settings")).json()).settings).toMatchObject({ theme: "system", rowVersion: 0 });
      expect((await aliceContext.request.put("/api/settings", { headers, data: { ...saved, rowVersion: 0, theme: "light" } })).status()).toBe(409);

      const songResponse = await aliceContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "설정 부모 곡" } });
      const songId = (await songResponse.json()).song.id as string;
      const lyricResponse = await aliceContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "설정 가사" } });
      const lyricId = (await lyricResponse.json()).lyric.id as string;
      expect((await (await aliceContext.request.get(`/api/lyrics/${lyricId}/display-settings`)).json()).settings).toMatchObject({ override: null, effective: { font: "serif", fontSize: 20 } });
      expect((await bobContext.request.get(`/api/lyrics/${lyricId}/display-settings`)).status()).toBe(404);
      const overrideResponse = await aliceContext.request.put(`/api/lyrics/${lyricId}/display-settings`, { headers, data: { rowVersion: 0, font: "mono", fontSize: 16, lineHeight: 2, letterSpacing: -0.01 } });
      const override = (await overrideResponse.json()).settings;
      expect(override).toMatchObject({ override: { rowVersion: 1 }, effective: { font: "mono", fontSize: 16 } });
      await aliceContext.request.put("/api/settings", { headers, data: { ...saved, theme: "light", font: "sans", fontSize: 22 } });
      expect((await (await aliceContext.request.get(`/api/lyrics/${lyricId}/display-settings`)).json()).settings.effective).toMatchObject({ font: "mono", fontSize: 16 });
      const reset = await aliceContext.request.delete(`/api/lyrics/${lyricId}/display-settings`, { headers, data: { rowVersion: override.override.rowVersion } });
      expect((await reset.json()).settings).toMatchObject({ override: null, effective: { font: "sans", fontSize: 22 } });
    } finally { await Promise.all([aliceContext.close(), bobContext.close()]); await deleteAccounts([alice.userId, bob.userId]); }
  });

  test("previews, persists and recovers settings with responsive focus management", async ({ browser, context, page }, info) => {
    const account = await createAccount(context, `설정 화면 ${info.project.name}`);
    const externalFonts: string[] = [];
    page.on("request", (request) => { if (request.resourceType() === "font" && !request.url().startsWith(origin)) externalFonts.push(request.url()); });
    try {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      async function chooseTheme(label: "라이트" | "시스템") {
        if (info.project.name === "mobile") {
          await page.getByRole("button", { name: "작성 표시 세부 설정" }).click();
          const sheet = page.getByRole("dialog", { name: "작성 표시 세부 설정" });
          await sheet.getByLabel(label).check();
          await sheet.getByRole("button", { name: "닫기" }).click();
        } else await page.getByLabel(label).check();
      }

      if (info.project.name === "mobile") {
        const open = page.getByRole("button", { name: "작성 표시 세부 설정" });
        await open.click();
        const dialog = page.getByRole("dialog", { name: "작성 표시 세부 설정" });
        await expect(dialog).toBeVisible();
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-settings-sheet]")))).toBe(true);
        await dialog.getByRole("button", { name: "닫기" }).click();
        await expect(open).toBeFocused();
      }

      await chooseTheme("라이트");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(await contrast(page, "--ink", "--canvas")).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(page, "--acid-ink", "--acid")).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(page, "--danger", "--danger-bg")).toBeGreaterThanOrEqual(4.5);
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.locator(".settings-message")).toContainText("서버에 저장");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      const otherDevice = await browser.newContext({ baseURL: origin, colorScheme: "dark" });
      await otherDevice.addCookies([{ name: "lc_session", value: account.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      const otherCurrent = (await (await otherDevice.request.get("/api/settings")).json()).settings;
      expect((await otherDevice.request.put("/api/settings", { headers, data: { ...otherCurrent, theme: "dark" } })).status()).toBe(200);
      await otherDevice.close();
      await page.goto("/settings");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await contrast(page, "--ink", "--canvas")).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(page, "--focus", "--canvas")).toBeGreaterThanOrEqual(3);
      expect(await contrast(page, "--acid-ink", "--acid")).toBeGreaterThanOrEqual(4.5);
      expect(await contrast(page, "--danger", "--danger-bg")).toBeGreaterThanOrEqual(4.5);

      await chooseTheme("시스템");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.locator(".settings-message")).toContainText("서버에 저장");
      await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "system");
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      const range = page.locator('.desktop-display-controls input[type="range"]').first();
      if (info.project.name === "desktop") {
        await page.route("**/api/settings", (route) => route.request().method() === "PUT" ? route.abort("failed") : route.continue(), { times: 1 });
        await range.fill("23");
        await page.getByRole("button", { name: "저장", exact: true }).click();
        await expect(page.locator('.settings-message[role="alert"]')).toContainText("로컬 미리보기 값");
        await expect(range).toHaveValue("23");
      }
      await page.screenshot({ path: `docs/runbooks/evidence/0.8.0-phase2-settings-${info.project.name}.png`, fullPage: true });
      expect(externalFonts).toEqual([]);
    } finally { await deleteAccounts([account.userId]); }
  });

  test("keeps editor position while saving and resetting a per-lyric override", async ({ context, page }, info) => {
    const account = await createAccount(context, `가사 설정 ${info.project.name}`);
    try {
      const song = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "표시 곡" } });
      const songId = (await song.json()).song.id as string;
      const lyric = await context.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "표시 가사", body: "[Verse]\n한 줄\n두 줄" } });
      const lyricId = (await lyric.json()).lyric.id as string;
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      await page.getByLabel("가사 본문").click();
      await page.keyboard.press("End");
      const before = await page.locator(".cm-content").getAttribute("aria-label");
      async function openDisplaySettings() {
        if (info.project.name === "desktop") await page.getByRole("button", { name: "표시 설정", exact: true }).click();
        else { await page.getByRole("button", { name: /다른 가사.*자료/ }).click(); await page.getByRole("button", { name: "표시 설정 열기" }).click(); }
      }
      await openDisplaySettings();
      let dialog = page.getByRole("dialog", { name: "현재 가사 표시 설정" });
      await dialog.locator('input[type="range"]').first().fill("24");
      await dialog.getByRole("button", { name: "취소", exact: true }).click();
      expect(await page.locator(".cm-scroller").evaluate((node) => getComputedStyle(node).fontSize)).toBe("18px");
      await openDisplaySettings();
      dialog = page.getByRole("dialog", { name: "현재 가사 표시 설정" });
      await dialog.locator('input[type="range"]').first().fill("24");
      await dialog.getByRole("button", { name: "이 가사에 저장" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByLabel("가사 본문")).toBeFocused();
      expect(await page.locator(".cm-content").getAttribute("aria-label")).toBe(before);
      expect(await page.locator(".cm-scroller").evaluate((node) => getComputedStyle(node).fontSize)).toBe("24px");
      await openDisplaySettings();
      await page.getByRole("dialog", { name: "현재 가사 표시 설정" }).getByRole("button", { name: "계정 기본값으로 초기화" }).click();
      await expect(page.getByRole("dialog", { name: "현재 가사 표시 설정" })).toBeHidden();
      await expect(page.getByLabel("가사 본문")).toBeFocused();
      expect(await page.locator(".cm-scroller").evaluate((node) => getComputedStyle(node).fontSize)).toBe("18px");
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `settings-${randomUUID()}`;
  await withE2eDatabase(async (pool) => { await pool.query("insert into app_users(id,status) values($1,'active')", [userId]); await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]); await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]); });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); return { userId, token };
}

async function contrast(page: import("@playwright/test").Page, foreground: string, background: string) {
  return page.evaluate(([fg, bg]) => {
    const resolve = (name: string) => {
      const probe = document.createElement("span"); probe.style.color = `var(${name})`; document.body.append(probe);
      const value = getComputedStyle(probe).color; probe.remove(); return value;
    };
    const luminance = (value: string) => {
      const channels = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => channel / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
      return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
    };
    const first = luminance(resolve(fg)); const second = luminance(resolve(bg));
    return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
  }, [foreground, background]);
}

async function deleteAccounts(ids: readonly string[]) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined)); }
