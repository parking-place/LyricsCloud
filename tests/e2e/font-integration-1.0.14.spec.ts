import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const fontAsset = "/fonts/NotoSansKR-Regular.69975a0a.otf";
const fontBudgetBytes = 4_700_000;

test.describe("1.0.14 font loading and input integration", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("preserves a long editor and synthetic composition while the cold font finishes loading", async ({ browser }, info) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      baseURL: origin,
      serviceWorkers: "block",
      viewport: info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: info.project.name === "mobile",
      hasTouch: info.project.name === "mobile"
    });
    const account = await createAccount(context, `느린 폰트 ${info.project.name}`);
    const longBody = Array.from({ length: 2_000 }, (_, index) => `[Verse ${index + 1}] 한글 bright ひかり 光`).join("\n");
    let signalFont = () => {};
    let finishFont = () => {};
    const fontStarted = new Promise<void>((resolve) => { signalFont = resolve; });
    const fontFinished = new Promise<void>((resolve) => { finishFont = resolve; });
    let fontRequests = 0;
    let fontBytes = 0;
    try {
      const lyricId = await createLyric(context, longBody);
      const page = await context.newPage();
      page.on("request", (request) => {
        if (new URL(request.url()).pathname !== fontAsset) return;
        fontRequests += 1; signalFont();
      });
      page.on("response", async (response) => {
        if (new URL(response.url()).pathname !== fontAsset) return;
        fontBytes = Number(await response.headerValue("content-length")) || (await response.body()).byteLength;
        finishFont();
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await page.goto(`/lyrics/${lyricId}`, { waitUntil: "domcontentloaded" });
      const editor = page.getByLabel("가사 본문");
      await expect(editor).toBeVisible({ timeout: 20_000 });
      await editor.evaluate((node) => { node.dataset.phase114Editor = "stable"; });
      await editor.click();
      await page.keyboard.press("Control+End");
      const expectedBody = `${longBody}한글`;
      await editor.dispatchEvent("compositionstart", { data: "" });
      // Playwright cannot drive a platform IME. Replacing the document between
      // composition boundaries exercises the editor's real deferred-save path
      // deterministically, matching the established IME regression coverage.
      await editor.fill(expectedBody);
      await editor.dispatchEvent("compositionupdate", { data: "한글" });
      const selectionBefore = await activeSelection(page);
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 100, downloadThroughput: 256 * 1024, uploadThroughput: 1024 * 1024
      });
      await page.locator(".lyric-editor-page").evaluate((node) => {
        (node as HTMLElement).style.setProperty("--lyric-font-family", '"LyricsCloud Noto Sans KR", system-ui, sans-serif');
      });
      await fontStarted;
      await fontFinished;
      await page.evaluate(() => document.fonts.ready);
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
      });
      expect(await editor.getAttribute("data-phase114-editor")).toBe("stable");
      const selectionDuringComposition = await activeSelection(page);
      expect(selectionBefore.active).toBe(true);
      expect(selectionDuringComposition).toEqual(selectionBefore);
      await expect(editor).toContainText("한글");
      const faces = await page.evaluate(async () => (await document.fonts.load('18px "LyricsCloud Noto Sans KR"', "한글 bright ひかり 光")).length);
      expect(faces).toBeGreaterThan(0);
      await editor.dispatchEvent("compositionend", { data: "한글" });
      await expect.poll(async () => (await (await context.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body, { timeout: 30_000 }).toBe(expectedBody);

      await cdp.send("Performance.enable");
      await cdp.send("HeapProfiler.collectGarbage");
      const heapBefore = metric(await cdp.send("Performance.getMetrics"), "JSHeapUsedSize");
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const dialog = await openDisplaySettings(page, info.project.name);
      const select = dialog.getByLabel("폰트");
      const switchDurations: number[] = [];
      for (let index = 0; index < 8; index += 1) {
        const started = Date.now();
        await select.selectOption(index % 2 === 0 ? "sans" : "noto_sans_kr");
        switchDurations.push(Date.now() - started);
      }
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await cdp.send("HeapProfiler.collectGarbage");
      const heapAfter = metric(await cdp.send("Performance.getMetrics"), "JSHeapUsedSize");
      console.log(JSON.stringify({
        phase: "1.0.14-p4",
        project: info.project.name,
        fontRequests,
        fontBytes,
        maxSwitchMs: Math.max(...switchDurations),
        heapDeltaBytes: heapAfter - heapBefore
      }));
      expect(Math.max(...switchDurations)).toBeLessThan(2_500);
      expect(heapAfter - heapBefore).toBeLessThan(32 * 1024 * 1024);
      expect(await editor.getAttribute("data-phase114-editor")).toBe("stable");
      await dialog.getByRole("button", { name: "취소" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      expect(fontRequests).toBe(1);
      expect(fontBytes).toBeGreaterThan(0);
      expect(fontBytes).toBeLessThanOrEqual(fontBudgetBytes);
      expect((await (await context.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe(expectedBody);
      await page.close();
    } finally {
      await deleteAccount(account.userId);
      await context.close();
    }
  });

  test("keeps fallback text visible and saving available when the font request is blocked", async ({ context, page }, info) => {
    const account = await createAccount(context, `차단 폰트 ${info.project.name}`);
    const source = "차단 전 원문 · bright · ひかり · 光";
    let fontRequests = 0;
    try {
      await chooseNoto(context);
      const lyricId = await createLyric(context, source);
      await page.route(`**${fontAsset}`, async (route) => { fontRequests += 1; await route.abort("failed"); });
      await page.goto(`/lyrics/${lyricId}`, { waitUntil: "domcontentloaded" });
      const editor = page.getByLabel("가사 본문");
      await expect(editor).toBeVisible({ timeout: 20_000 });
      await expect(editor).toContainText(source);
      await editor.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" 차단 뒤 입력");
      const expectedBody = `${source} 차단 뒤 입력`;
      await expect.poll(async () => (await (await context.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body, { timeout: 30_000 }).toBe(expectedBody);
      await page.reload();
      await expect(page.getByLabel("가사 본문")).toContainText(expectedBody);
      expect(fontRequests).toBeGreaterThanOrEqual(1);
      expect((await (await context.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe(expectedBody);
    } finally { await deleteAccount(account.userId); }
  });
});

async function activeSelection(page: Page) {
  return page.evaluate(() => ({
    active: document.activeElement?.classList.contains("cm-content") ?? false,
    anchorOffset: document.getSelection()?.anchorOffset ?? -1,
    focusOffset: document.getSelection()?.focusOffset ?? -1,
    text: document.getSelection()?.toString() ?? ""
  }));
}

async function openDisplaySettings(page: Page, projectName: string) {
  if (projectName === "desktop") await page.getByRole("button", { name: "표시 설정", exact: true }).click();
  else {
    await page.getByRole("button", { name: /다른 가사.*자료/ }).click();
    await page.getByRole("button", { name: "표시 설정 열기" }).click();
  }
  const dialog = page.getByRole("dialog", { name: "현재 가사 표시 설정" });
  await expect(dialog).toBeVisible();
  return dialog;
}

function metric(result: { metrics: Array<{ name: string; value: number }> }, name: string) {
  const value = result.metrics.find((item) => item.name === name)?.value;
  if (value === undefined) throw new Error(`missing performance metric ${name}`);
  return value;
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `font-p4-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function chooseNoto(context: BrowserContext) {
  const current = (await (await context.request.get("/api/settings")).json()).settings;
  const response = await context.request.put("/api/settings", { headers, data: {
    rowVersion: current.rowVersion, theme: current.theme, font: "noto_sans_kr", fontSize: current.fontSize,
    lineHeight: current.lineHeight, letterSpacing: current.letterSpacing, focusModeDefault: current.focusModeDefault
  } });
  expect(response.ok()).toBe(true);
}

async function createLyric(context: BrowserContext, body: string) {
  const song = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "1.0.14 P4 폰트 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await context.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "1.0.14 P4 폰트 가사", body } });
  expect(lyric.status()).toBe(201);
  return (await lyric.json()).lyric.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}
