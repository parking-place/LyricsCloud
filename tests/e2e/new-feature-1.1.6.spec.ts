import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.6 P2 stable editor surfaces", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps a 10000-line editor mounted across theme, panel and responsive changes", async ({ browser }, testInfo) => {
    test.skip(!["desktop", "chromium-desktop"].includes(testInfo.project.name), "Chromium CDP memory evidence runs once on desktop");
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
      await expect(editor).not.toContainText("끝 입력X");
      if ((await editor.textContent())?.includes("끝 입력")) await page.keyboard.press("Control+z");
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

test.describe("1.1.6 P3 creation and connection flows", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps B-1 creation input and connection states themed on desktop and mobile", async ({ context, page }, testInfo) => {
    test.setTimeout(90_000);
    if (testInfo.project.name.includes("mobile")) await page.setViewportSize({ width: 390, height: 620 });
    const account = await createAccount(context, "1.1.6 P3 합성 사용자");
    const song = await context.request.post("/api/songs", {
      headers, data: { requestId: randomUUID(), title: "1.1.6 P3 테마 곡" }
    });
    expect(song.status()).toBe(201);
    const songId = (await song.json()).song.id as string;

    try {
      await page.goto(`/lyrics/new?songId=${songId}`);
      const lyricSurface = page.locator('[data-creation-surface="lyric"]');
      const lyricTitle = page.getByRole("textbox", { name: "가사 제목" });
      await expect(lyricSurface).toBeVisible();
      await lyricTitle.fill("테마를 바꿔도 남는 합성 제목");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(lyricTitle).toHaveValue("테마를 바꿔도 남는 합성 제목");
      await expectSemanticBackground(lyricSurface, "--canvas");
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `docs/user/images/1.1.6-p3-creation-${testInfo.project.name}.png`, fullPage: true });

      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(lyricTitle).toHaveValue("테마를 바꿔도 남는 합성 제목");

      await page.goto("/rhymes/new");
      const rhymeSurface = page.locator('[data-creation-surface="rhyme"]');
      await expect(rhymeSurface).toBeVisible();
      const rhymeBody = page.getByLabel("자유 본문");
      await expect(rhymeBody).toBeEnabled();
      await rhymeBody.fill("바라보, 마나, 마따ㅎ");
      const cancel = page.getByRole("button", { name: "취소" });
      await cancel.click();
      await expect(page.getByRole("dialog", { name: "새 라임 노트 작성을 취소할까요?" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(cancel).toBeFocused();
      await expect(rhymeBody).toHaveValue("바라보, 마나, 마따ㅎ");

      await page.goto(`/songs/${songId}`);
      const manage = page.getByRole("button", { name: "연결 관리" });
      await expect(manage).toBeVisible();

      let releaseLoad!: () => void;
      const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
      const rhymeQuery = `**/api/songs/${songId}/links?type=rhyme_note&state=all&limit=20`;
      await page.route(rhymeQuery, async (route) => { await loadGate; await route.continue(); }, { times: 1 });
      await manage.click();
      const manager = page.getByRole("dialog", { name: "1.1.6 P3 테마 곡 연결 자료 관리" });
      await expect(manager).toHaveAttribute("data-connection-manager", "true");
      await expect(manager.getByText("라임 노트 후보를 불러오는 중입니다.")).toBeVisible();
      await expectSemanticBackground(manager, "--panel");
      releaseLoad();
      await expect(manager.getByText("아직 만든 라임 노트가 없습니다.")).toBeVisible();

      const promptQuery = `**/api/songs/${songId}/links?type=prompt&state=all&limit=20`;
      await page.route(promptQuery, (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await manager.getByRole("tab", { name: "프롬프트" }).click();
      const loadError = manager.getByRole("alert");
      await expect(loadError).toContainText("프롬프트 후보를 불러오지 못했습니다.");
      await loadError.getByRole("button", { name: "다시 시도" }).click();
      await expect(manager.getByText("아직 만든 프롬프트가 없습니다.")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `docs/user/images/1.1.6-p3-connection-${testInfo.project.name}.png` });

      await page.keyboard.press("Escape");
      await expect(manager).toHaveCount(0);
      await expect(manage).toBeFocused();
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

test.describe("1.1.6 P4 design-independent recovery regression", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("keeps exact copy and export payloads reachable in the configured UI variant", async ({ context, page }) => {
    test.setTimeout(90_000);
    const account = await createAccount(context, `1.1.6 P4 ${process.env.LC_UI_VARIANT ?? "b1"} 합성 사용자`);
    const body = "[Verse: 첫 절]\n바라봐 <태그> 👩‍🎤\n\n[Hook]\n마냥, 마땅한";
    try {
      await installClipboardRecorder(page);
      const lyricId = await createLyric(context, body);
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.locator("html")).toHaveAttribute("data-ui-variant", process.env.LC_UI_VARIANT === "classic" ? "classic" : "b1");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });

      await page.getByRole("button", { name: "전체 복사", exact: true }).click();
      await expect.poll(() => copiedText(page)).toBe(body);

      const archiveResponse = await page.request.get("/api/export");
      expect(archiveResponse.status()).toBe(200);
      const lyricEntries = [...readStoredZip(await archiveResponse.body()).entries()].filter(([name]) => name.startsWith("lyrics/") && name.endsWith(".txt"));
      expect(lyricEntries).toHaveLength(1);
      expect(lyricEntries[0]![1].toString("utf8").endsWith(`\n\n${body}`)).toBe(true);

      // A 720 CSS-pixel viewport exercises the responsive layout reached by a
      // 1440px browser at 200% zoom. It is browser-runner evidence, not an OS
      // zoom or physical keyboard claim.
      await page.setViewportSize({ width: 720, height: 500 });
      const resourceButton = page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 .*자료/ });
      await resourceButton.click();
      const sheet = page.getByRole("dialog", { name: "작업 자료" });
      await expect(sheet).toBeVisible();
      await page.setViewportSize({ width: 390, height: 360 });
      await expect(sheet.getByRole("button", { name: "닫기" })).toBeVisible();
      const bounds = await sheet.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(361);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await sheet.getByRole("button", { name: "닫기" }).click();
      await expect(page.locator(".cm-content")).toBeFocused();
    } finally {
      await deleteAccount(account.userId);
    }
  });
});

function metric(result: { metrics: Array<{ name: string; value: number }> }, name: string) {
  const value = result.metrics.find((item) => item.name === name)?.value;
  if (value === undefined) throw new Error(`missing performance metric ${name}`);
  return value;
}

async function createAccount(context: BrowserContext, displayName = "1.1.6 P2 합성 사용자") {
  const userId = randomUUID();
  const token = `editor-116-p2-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function expectSemanticBackground(locator: import("@playwright/test").Locator, variable: "--canvas" | "--panel") {
  expect(await locator.evaluate((element, semanticVariable) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${semanticVariable})`;
    document.body.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return getComputedStyle(element).backgroundColor === expected;
  }, variable)).toBe(true);
}

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

async function installClipboardRecorder(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (text: string) => {
        (window as typeof window & { __copiedText?: string }).__copiedText = text;
        return Promise.resolve();
      }
    } });
  });
}

async function copiedText(page: Page) {
  return page.evaluate(() => (window as typeof window & { __copiedText?: string }).__copiedText ?? "");
}

function readStoredZip(archive: Buffer): Map<string, Buffer> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("ZIP_END_MISSING");
  const count = archive.readUInt16LE(end + 10);
  let central = archive.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  for (let index = 0; index < count; index++) {
    if (archive.readUInt32LE(central) !== 0x02014b50) throw new Error("ZIP_CENTRAL_INVALID");
    const size = archive.readUInt32LE(central + 24);
    const nameLength = archive.readUInt16LE(central + 28);
    const extraLength = archive.readUInt16LE(central + 30);
    const commentLength = archive.readUInt16LE(central + 32);
    const localOffset = archive.readUInt32LE(central + 42);
    const name = archive.subarray(central + 46, central + 46 + nameLength).toString("utf8");
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    entries.set(name, archive.subarray(start, start + size));
    central += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
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
