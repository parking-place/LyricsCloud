import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.6 P2 stable editor surfaces", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps a 10000-line editor mounted across theme, panel and responsive changes", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Chromium CDP memory evidence runs once on desktop");
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 }, colorScheme: "dark", serviceWorkers: "block" });
    const account = await createAccount(context);
    try {
      const body = ["[Verse]", ...Array.from({ length: 9_999 }, (_, index) => `줄${String(index + 1).padStart(4, "0")}`)].join("\n");
      const lyricId = await createLyric(context, body);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 20_000 });
      await editor.evaluate((node) => { node.setAttribute("data-p2-editor-instance", "stable"); });
      await editor.focus();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n끝 입력");
      await expect(editor).toContainText("끝 입력");

      await cdp.send("Performance.enable");
      await cdp.send("HeapProfiler.collectGarbage");
      const heapBefore = metric(await cdp.send("Performance.getMetrics"), "JSHeapUsedSize");

      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.getByRole("button", { name: "자료 패널 접기" }).click();
      await page.getByRole("button", { name: "자료 패널 펼치기" }).click();
      await expect(page.getByRole("complementary", { name: "작업 자료" })).toBeVisible();

      await page.setViewportSize({ width: 1024, height: 760 });
      await expect(page.getByRole("complementary", { name: "작업 자료" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

      await page.setViewportSize({ width: 900, height: 700 });
      await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 .*자료/ }).click();
      const mobilePanel = page.getByRole("dialog", { name: "작업 자료" });
      await expect(mobilePanel).toBeVisible();
      await mobilePanel.getByRole("button", { name: "닫기" }).click();

      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.emulateMedia({ colorScheme: "dark" });
      await cdp.send("HeapProfiler.collectGarbage");
      const heapAfter = metric(await cdp.send("Performance.getMetrics"), "JSHeapUsedSize");

      await testInfo.attach("1.1.6-p2-editor-memory", {
        contentType: "application/json",
        body: Buffer.from(JSON.stringify({ lines: 10_000, heapDeltaBytes: heapAfter - heapBefore }))
      });
      expect(heapAfter - heapBefore).toBeLessThan(32 * 1024 * 1024);
      await expect(editor).toHaveAttribute("data-p2-editor-instance", "stable");
      await editor.focus();
      await page.keyboard.insertText("X");
      await expect(editor).toContainText("끝 입력X");
      await page.keyboard.press("Control+z");
      await expect(editor).not.toContainText("끝 입력");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect.poll(async () => (await (await context.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body, { timeout: 20_000 })
        .toBe(body);
    } finally {
      await deleteAccount(account.userId);
      await context.close();
    }
  });
});

function metric(result: { metrics: Array<{ name: string; value: number }> }, name: string) {
  const value = result.metrics.find((item) => item.name === name)?.value;
  if (value === undefined) throw new Error(`missing performance metric ${name}`);
  return value;
}

async function createAccount(context: BrowserContext) {
  const userId = randomUUID();
  const token = `editor-116-p2-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.1.6 P2 합성 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function createLyric(context: BrowserContext, body: string) {
  const song = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "1.1.6 P2 장문 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await context.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "1.1.6 P2 장문 가사", body, status: "revising"
  } });
  expect(lyric.status()).toBe(201);
  return (await lyric.json()).lyric.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
