import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.1 P6 dashboard actions and shell", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps primary dashboard actions themed and operable in light and dark modes", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "the test creates its own theme contexts");
    const setup = await browser.newContext({ baseURL: origin });
    const owner = await account(setup);
    const song = await setup.request.post("/api/songs", {
      headers, data: { requestId: randomUUID(), title: "P6 테마 합성 곡" }
    });
    expect(song.status()).toBe(201);
    const songId = (await song.json()).song.id as string;
    await setup.close();

    try {
      for (const colorScheme of ["light", "dark"] as const) {
        const context = await browser.newContext({ baseURL: origin, colorScheme, viewport: { width: 1440, height: 900 } });
        await session(context, owner.token);
        const page = await context.newPage();
        const browserErrors: string[] = [];
        page.on("pageerror", (error) => browserErrors.push(error.name));
        page.on("console", (message) => { if (message.type() === "error") browserErrors.push("console"); });
        await page.goto(`/songs/${songId}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);

        const manage = page.getByRole("button", { name: "연결 관리" });
        const create = page.getByRole("button", { name: "＋ 새 가사" });
        for (const button of [manage, create]) {
          await expect(button).toBeVisible();
          const themed = await button.evaluate((element) => {
            const probe = document.createElement("span");
            probe.style.color = "var(--acid)";
            document.body.append(probe);
            const acid = getComputedStyle(probe).color;
            probe.style.color = "var(--acid-ink)";
            const acidInk = getComputedStyle(probe).color;
            probe.remove();
            const style = getComputedStyle(element);
            return {
              backgroundMatches: style.backgroundColor === acid,
              colorMatches: style.color === acidInk,
              minHeight: Number.parseFloat(style.minHeight),
              backgroundColor: style.backgroundColor,
              acid,
              color: style.color,
              acidInk
            };
          });
          expect(themed).toMatchObject({ backgroundMatches: true, colorMatches: true });
          expect(themed.minHeight).toBeGreaterThanOrEqual(44);
        }

        await manage.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "P6 테마 합성 곡 연결 자료 관리" });
        await expect(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(manage).toBeFocused();

        await create.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+\?returnTo=/);
        await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
        expect(browserErrors).toEqual([]);
        await context.close();
      }
    } finally { await remove(owner.userId); }
  });

  test("keeps collapsed rail icons aligned and dashboard actions separated at large text", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "the layout matrix runs once");
    const context = await browser.newContext({ baseURL: origin, colorScheme: "dark", viewport: { width: 1280, height: 900 } });
    const owner = await account(context);
    const song = await context.request.post("/api/songs", {
      headers, data: { requestId: randomUUID(), title: "P6 확대 합성 곡" }
    });
    const songId = (await song.json()).song.id as string;
    const page = await context.newPage();
    try {
      await page.goto(`/songs/${songId}`);
      await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
      const rail = page.locator(".side-nav");
      const icons = rail.locator(".nav-item > span:first-child, .logout-button > span:first-child");
      expect(await icons.evaluateAll((items) => items.every((item) => {
        const box = item.getBoundingClientRect();
        return Math.abs(box.width - box.height) < 0.5 && box.width > 0 && getComputedStyle(item).overflow === "hidden";
      }))).toBe(true);

      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const heading = page.locator(".lyrics-panel-heading");
      expect(await heading.evaluate((element) => {
        const title = element.firstElementChild!.getBoundingClientRect();
        const actions = element.lastElementChild!.getBoundingClientRect();
        return title.right <= actions.left + 1;
      })).toBe(true);
    } finally {
      await remove(owner.userId);
      await context.close();
    }
  });

  test("keeps dashboard actions and the link sheet reachable above a mobile virtual keyboard", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "the mobile matrix runs once");
    const setup = await browser.newContext({ baseURL: origin });
    const owner = await account(setup);
    const song = await setup.request.post("/api/songs", {
      headers, data: { requestId: randomUUID(), title: "P6 모바일 합성 곡" }
    });
    const songId = (await song.json()).song.id as string;
    await setup.close();
    try {
      for (const fixture of [
        { width: 320, height: 520, colorScheme: "dark" as const },
        { width: 390, height: 620, colorScheme: "light" as const }
      ]) {
        const context = await browser.newContext({
          baseURL: origin, viewport: { width: fixture.width, height: fixture.height },
          hasTouch: true, colorScheme: fixture.colorScheme
        });
        await session(context, owner.token);
        const page = await context.newPage();
        await page.goto(`/songs/${songId}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        for (const button of [
          page.locator(".lyrics-panel").getByRole("button", { name: "목록 새로 고침" }),
          page.getByRole("button", { name: "＋ 새 가사" }),
          page.getByRole("button", { name: "연결 관리" })
        ]) {
          const box = await button.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(fixture.width + 1);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
        await page.getByRole("button", { name: "연결 관리" }).click();
        const dialog = page.getByRole("dialog", { name: "P6 모바일 합성 곡 연결 자료 관리" });
        await expect(dialog).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();
        expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
        expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(fixture.height + 1);
        await expect(dialog.getByRole("button", { name: "취소" })).toBeVisible();
        await page.keyboard.press("Escape");
        await context.close();
      }
    } finally { await remove(owner.userId); }
  });
});

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `p6-ui-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'P6 UI 합성 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await session(context, token);
  return { userId, token };
}

async function session(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
}

async function remove(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
