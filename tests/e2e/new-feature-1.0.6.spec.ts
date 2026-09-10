import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { validateExportDocument } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.6 Extend copy and song-form insertion", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps Extend in storage and raw copy while inserting and undoing on desktop and mobile", async ({ browser, context, page }, info) => {
    const userId = await account(context);
    const body = "[Extend: 3:00:24]\n첫 줄\n둘째 줄";
    const songId = await createSong(page, "1.0.6 송폼 삽입 곡");
    const lyricId = await createLyric(page, songId, "Extend 보존 가사", body);
    await installClipboard(context);
    try {
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const mobile = isMobileProject(info.project.name);
      const editor = page.locator(".cm-content");

      await wholeCopyButton(page, mobile).click();
      await expect.poll(() => copied(page)).toBe("첫 줄\n둘째 줄");

      await editor.focus();
      await page.keyboard.press("Control+End");
      await openInsertMenu(page, mobile);
      const menu = page.getByRole("menu", { name: "송폼 삽입" });
      for (const marker of ["Intro", "Verse", "Pre-Chorus", "Chorus", "Hook", "Bridge", "Outro"]) {
        await expect(menu.getByRole("menuitem", { name: `[${marker}]`, exact: true })).toBeVisible();
      }
      await expect(menu).toContainText("저장 원문과 기록은 그대로 유지");
      await menu.getByRole("menuitem", { name: "Extend 포함 원문 복사" }).click();
      await expect.poll(() => copied(page)).toBe(body);

      await openInsertMenu(page, mobile);
      await page.getByRole("menu", { name: "송폼 삽입" }).getByRole("menuitem", { name: "[Bridge]", exact: true }).click();
      const inserted = `${body}\n[Bridge]`;
      await expect.poll(() => lyricBody(page, lyricId)).toBe(inserted);
      await editor.press("Control+z");
      await expect.poll(() => lyricBody(page, lyricId)).toBe(body);
      await page.reload();
      await expect(page.locator(".cm-content")).toContainText("[Extend: 3:00:24]");

      const anonymous = await browser.newContext({ baseURL: origin });
      try {
        expect([401, 404]).toContain((await anonymous.request.get(`/api/lyrics/${lyricId}`)).status());
      } finally { await anonymous.close(); }
    } finally { await removeAccount(userId); }
  });

  test("resolves the captured caret after a remote prefix and closes without mutation on Escape", async ({ browser, context, page }, info) => {
    test.skip(isMobileProject(info.project.name), "desktop relative-position and keyboard coverage");
    const secondContext = await browser.newContext({ baseURL: origin });
    const userId = await account([context, secondContext]);
    const songId = await createSong(page, "1.0.6 원격 삽입 곡");
    const lyricId = await createLyric(page, songId, "원격 삽입 가사", "앞뒤");
    const second = await secondContext.newPage();
    try {
      await Promise.all([page.goto(`/lyrics/${lyricId}`), second.goto(`/lyrics/${lyricId}`)]);
      await Promise.all([
        page.getByText("방금 저장됨", { exact: true }).waitFor(),
        second.getByText("방금 저장됨", { exact: true }).waitFor()
      ]);
      const editor = page.locator(".cm-content");
      await editor.focus();
      await page.keyboard.press("Control+Home");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Shift+F10");
      await expect(page.getByRole("menu", { name: "송폼 삽입" })).toBeVisible();

      const remoteEditor = second.locator(".cm-content");
      await remoteEditor.focus();
      await second.keyboard.press("Control+Home");
      await second.keyboard.insertText("원격 ");
      await expect(editor).toContainText("원격 앞뒤");
      await page.getByRole("menu", { name: "송폼 삽입" }).getByRole("menuitem", { name: "[Chorus]", exact: true }).click();
      await expect.poll(() => lyricBody(page, lyricId)).toBe("원격 앞\n[Chorus]\n뒤");
      await editor.press("Control+z");
      await expect.poll(() => lyricBody(page, lyricId)).toBe("원격 앞뒤");

      await editor.press("Shift+F10");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu", { name: "송폼 삽입" })).toBeHidden();
      await expect(editor).toBeFocused();
      expect(await lyricBody(page, lyricId)).toBe("원격 앞뒤");
    } finally { await secondContext.close(); await removeAccount(userId); }
  });

  test("does not open or mutate during Korean composition", async ({ context, page }, info) => {
    test.skip(!isChromiumDesktopProject(info.project.name), "Chromium desktop IME coverage");
    const userId = await account(context);
    const songId = await createSong(page, "1.0.6 조합 곡");
    const lyricId = await createLyric(page, songId, "조합 가사", "조합 보존");
    try {
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const editor = page.locator(".cm-content");
      await editor.dispatchEvent("compositionstart", { data: "ㅎ" });
      await editor.press("Shift+F10");
      await expect(page.getByText(/한글 조합을 마친 뒤/)).toBeVisible();
      await expect(page.getByRole("menu", { name: "송폼 삽입" })).toBeHidden();
      expect(await lyricBody(page, lyricId)).toBe("조합 보존");
      await editor.dispatchEvent("compositionend", { data: "한" });
    } finally { await removeAccount(userId); }
  });

  test("handles an empty lyric and rejects an insertion beyond the body limit", async ({ context, page }, info) => {
    const userId = await account(context);
    const songId = await createSong(page, "1.0.6 경계 곡");
    const emptyId = await createLyric(page, songId, "빈 가사", "");
    const fullBody = "가".repeat(100_000);
    const fullId = await createLyric(page, songId, "제한 가사", fullBody);
    const mobile = isMobileProject(info.project.name);
    try {
      await page.goto(`/lyrics/${emptyId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await openInsertMenu(page, mobile);
      await page.getByRole("menu", { name: "송폼 삽입" }).getByRole("menuitem", { name: "[Intro]", exact: true }).click();
      await expect.poll(() => lyricBody(page, emptyId)).toBe("[Intro]");

      await page.goto(`/lyrics/${fullId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await openInsertMenu(page, mobile);
      await page.getByRole("menu", { name: "송폼 삽입" }).getByRole("menuitem", { name: "[Verse]", exact: true }).click();
      await expect(page.getByText(/100,000자를 넘을 수 없습니다/)).toBeVisible();
      expect(await lyricBody(page, fullId)).toBe(fullBody);
    } finally { await removeAccount(userId); }
  });

  test("reports the mobile loading state without changing the lyric", async ({ context, page }, info) => {
    test.skip(!isMobileProject(info.project.name), "mobile visible-button loading coverage");
    const userId = await account(context);
    const songId = await createSong(page, "1.0.6 로딩 곡");
    const lyricId = await createLyric(page, songId, "로딩 가사", "로딩 원문");
    await context.addInitScript(() => {
      const pendingRequest = {} as IDBOpenDBRequest;
      Object.defineProperty(window, "indexedDB", { configurable: true, value: { open: () => pendingRequest } });
    });
    try {
      await page.goto(`/lyrics/${lyricId}`);
      await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: "＋ 송폼 삽입" }).click();
      await expect(page.getByText(/편집기를 아직 준비하고 있습니다/)).toBeVisible();
      expect(await lyricBody(page, lyricId)).toBe("로딩 원문");
    } finally { await removeAccount(userId); }
  });

  test("preserves the exact Extend marker through revision restore and account export", async ({ context, page }, info) => {
    test.skip(!isChromiumDesktopProject(info.project.name), "one exact storage-path proof is sufficient");
    const userId = await account(context);
    const body = "[Extend: 3:00:24]\n첫 줄\n둘째 줄";
    const changed = `${body}\n복원 전에 추가한 줄`;
    const songId = await createSong(page, "1.0.6 원문 복구 곡");
    const lyricId = await createLyric(page, songId, "Extend 원문 복구 가사", body);
    try {
      const mapping = await page.request.post(`/collaboration/documents/${lyricId}`, { headers });
      expect(mapping.status()).toBe(200);
      const documentKey = ((await mapping.json()) as { documentKey: string }).documentKey;
      const checkpoint = await page.request.post(`/collaboration/documents/${documentKey}/revisions`, {
        headers, data: { reason: "leave" }
      });
      expect(checkpoint.status()).toBe(200);
      const revisionId = ((await checkpoint.json()) as { revision: { id: string } }).revision.id;

      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.locator(".cm-content").fill(changed);
      await expect.poll(() => lyricBody(page, lyricId)).toBe(changed);

      const history = await page.request.get(`/collaboration/documents/${documentKey}/revisions`);
      expect(history.status()).toBe(200);
      const expectedHash = ((await history.json()) as { current: { hash: string } }).current.hash;
      const restored = await page.request.post(`/collaboration/documents/${documentKey}/revisions/${revisionId}/restore`, {
        headers, data: { requestId: randomUUID(), expectedHash }
      });
      expect(restored.status()).toBe(200);
      await expect.poll(() => lyricBody(page, lyricId)).toBe(body);

      const exported = await page.request.get("/api/export");
      expect(exported.status()).toBe(200);
      const entries = readStoredZip(await exported.body());
      const document = validateExportDocument(JSON.parse(entries.get("lyricscloud-export.json")!.toString("utf8")));
      const lyric = document.records.find((record) => record.section === "lyrics" && record.data.resource_id === lyricId);
      expect(lyric?.data.body).toBe(body);
      const readable = [...entries.entries()].find(([name, value]) => name.startsWith("lyrics/") && value.toString("utf8").includes(`ID: ${lyricId}`));
      expect(readable?.[1].toString("utf8")).toContain(`\n\n${body}`);
    } finally { await removeAccount(userId); }
  });
});

function isMobileProject(name: string) {
  return name === "mobile" || name.endsWith("-mobile");
}

function isChromiumDesktopProject(name: string) {
  return name === "desktop" || name === "chromium-desktop";
}

async function openInsertMenu(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: "＋ 송폼 삽입" }).click();
  } else {
    await page.locator(".cm-content").click({ button: "right" });
  }
  await expect(page.getByRole("menu", { name: "송폼 삽입" })).toBeVisible();
}

function wholeCopyButton(page: Page, mobile: boolean) {
  return mobile
    ? page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: "전체 복사" })
    : page.locator(".editor-header-actions").getByRole("button", { name: "전체 복사", exact: true });
}

async function installClipboard(context: BrowserContext) {
  await context.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: (value: string) => { (window as typeof window & { copied?: string }).copied = value; return Promise.resolve(); }
  } }));
}

async function copied(page: Page) {
  return page.evaluate(() => (window as typeof window & { copied?: string }).copied ?? "");
}

async function lyricBody(page: Page, lyricId: string) {
  const response = await page.request.get(`/api/lyrics/${lyricId}`);
  return ((await response.json()) as { lyric: { body: string } }).lyric.body;
}

async function account(contextOrContexts: BrowserContext | readonly BrowserContext[]) {
  const contexts = Array.isArray(contextOrContexts) ? contextOrContexts : [contextOrContexts];
  const userId = randomUUID();
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.6 가사 사용자')", [userId]);
    for (const context of contexts) {
      const token = `lyrics-106-${randomUUID()}`;
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    }
  });
  return userId;
}

async function createSong(page: Page, title: string) {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { song: { id: string } }).song.id;
}

async function createLyric(page: Page, songId: string, title: string, body: string) {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body } });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { lyric: { id: string } }).lyric.id;
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
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
