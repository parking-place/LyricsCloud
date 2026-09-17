import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.4 sharing storage and recovery UX", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("explains actor-specific durability and keeps the mobile sharing sheet usable", async ({ browser }, info) => {
    test.setTimeout(60_000);
    const mobile = info.project.name.includes("mobile");
    const options = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(options);
    const writerContext = await browser.newContext(options);
    const owner = await account(ownerContext, "안정화 소유자");
    const writer = await account(writerContext, "안정화 작성자");
    const ownerPage = await ownerContext.newPage();
    const writerPage = await writerContext.newPage();
    try {
      const lyricId = await createSharedLyric(ownerContext, writer.sharingId);
      await ownerPage.goto(`/lyrics/${lyricId}`);
      await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      await writerPage.goto(`/shared/lyrics/${lyricId}`);
      await expect(writerPage.getByRole("status")).toContainText("모든 변경 저장됨", { timeout: 15_000 });
      const writerGuide = writerPage.getByRole("region", { name: "공유 저장 및 복구 안내" });
      await expect(writerGuide).toContainText("서버에 변경을 저장");
      await expect(writerGuide).toContainText("이 기기");
      await expect(writerGuide).toContainText("권한이 끝나면");

      const dialog = await openSharingDialog(ownerPage);
      await expect(dialog.getByRole("region", { name: "공유 저장 및 복구 안내" })).toContainText("삭제하면 기존 공유 권한");
      if (mobile) {
        const box = await dialog.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(845);
        expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
      }
    } finally {
      await Promise.all([ownerContext.close(), writerContext.close()]);
      await removeAccounts([owner.userId, writer.userId]);
    }
  });

  test("removes a previous selected writer local store before another account enters the workspace", async ({ browser }, info) => {
    test.skip(!["desktop", "chromium-desktop"].includes(info.project.name), "account switch isolation runs once");
    test.setTimeout(90_000);
    const ownerContext = await browser.newContext({ baseURL: origin });
    const sharedContext = await browser.newContext({ baseURL: origin });
    const owner = await account(ownerContext, "전환 소유자");
    const writer = await account(sharedContext, "전환 전 작성자");
    const next = await createAccount("전환 후 계정");
    const ownerPage = await ownerContext.newPage();
    const page = await sharedContext.newPage();
    try {
      const lyricId = await createSharedLyric(ownerContext, writer.sharingId);
      await ownerPage.goto(`/lyrics/${lyricId}`);
      await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
      await page.goto(`/shared/lyrics/${lyricId}`);
      const editor = page.getByLabel("공유된 가사 본문");
      await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
      await sharedContext.setOffline(true);
      await editor.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" 전환 전 로컬 원문");
      await expect(editor).toContainText("전환 전 로컬 원문");
      await expect(page.getByRole("status")).toContainText("이 기기", { timeout: 10_000 });
      const previousDatabase = await ownerDatabaseName(page, writer.userId);
      await expect.poll(() => page.evaluate((name) => indexedDB.databases().then((items) =>
        items.some((item) => item.name === name)), previousDatabase)).toBe(true);

      await page.goto("about:blank");
      await sharedContext.setOffline(false);
      await sharedContext.clearCookies();
      await sharedContext.addCookies([{ name: "lc_session", value: next.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await page.goto("/workspace?login=success");
      await expect(page.getByRole("complementary").getByText("전환 후 계정", { exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate((name) => indexedDB.databases().then((items) => items.some((item) => item.name === name)), previousDatabase)).toBe(false);
      expect((await sharedContext.request.get(`/api/shared/lyrics/${lyricId}`)).status()).toBe(404);
      await expect(page.getByText("전환 전 로컬 원문")).toHaveCount(0);
    } finally {
      await sharedContext.setOffline(false).catch(() => undefined);
      await Promise.all([ownerContext.close(), sharedContext.close()]);
      await removeAccounts([owner.userId, writer.userId, next.userId]);
    }
  });

  test("bounds an offline writer queue and merges it after the owner restores an earlier body", async ({ browser }, info) => {
    test.setTimeout(120_000);
    const mobile = info.project.name.includes("mobile");
    const options = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile, hasTouch: mobile };
    const ownerContext = await browser.newContext(options);
    const writerContext = await browser.newContext(options);
    const owner = await account(ownerContext, "복원 소유자");
    const writer = await account(writerContext, "오프라인 복원 작성자");
    const ownerPage = await ownerContext.newPage();
    const writerPage = await writerContext.newPage();
    try {
      const lyricId = await createSharedLyric(ownerContext, writer.sharingId);
      await ownerPage.goto(`/lyrics/${lyricId}`);
      const ownerEditor = ownerPage.getByLabel("가사 본문");
      await expect(ownerEditor).toBeVisible({ timeout: 15_000 });
      await writerPage.goto(`/shared/lyrics/${lyricId}`);
      const writerEditor = writerPage.getByLabel("공유된 가사 본문");
      await expect(writerEditor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
      await expect(writerPage.getByRole("status")).toContainText("모든 변경 저장됨", { timeout: 15_000 });

      const documentKey = await sharedDocumentKey(ownerPage, lyricId);
      const initial = await ownerPage.request.post(`/collaboration/documents/${documentKey}/revisions`, {
        headers, data: { reason: "leave" }
      });
      expect(initial.status()).toBe(200);
      const initialRevisionId = ((await initial.json()) as { revision: { id: string } }).revision.id;

      await ownerEditor.click(); await ownerPage.keyboard.press("Control+End");
      await ownerPage.keyboard.insertText(" 복원에서 제외할 소유자 임시 원문");
      await expect.poll(() => lyricBody(ownerContext, lyricId)).toContain("소유자 임시 원문");

      await writerContext.setOffline(true);
      await expect(writerPage.getByRole("status")).toContainText("오프라인", { timeout: 10_000 });
      await writerEditor.click(); await writerPage.keyboard.press("Control+End");
      const offlineText = " 오프라인 작성자 원문 " + "빛".repeat(70);
      for (const character of offlineText) await writerPage.keyboard.insertText(character);
      await expect(writerEditor).toContainText("오프라인 작성자 원문");
      await expect(writerPage.getByRole("status")).toContainText("오프라인", { timeout: 15_000 });
      const databaseName = await ownerDatabaseName(writerPage, writer.userId);
      const queued = await syncQueueCount(writerPage, databaseName, documentKey);
      expect(queued).toBeGreaterThan(0);
      expect(queued).toBeLessThanOrEqual(64);

      const history = await ownerPage.request.get(`/collaboration/documents/${documentKey}/revisions`);
      expect(history.status()).toBe(200);
      const expectedHash = ((await history.json()) as { current: { hash: string } }).current.hash;
      const restored = await ownerPage.request.post(`/collaboration/documents/${documentKey}/revisions/${initialRevisionId}/restore`, {
        headers, data: { requestId: randomUUID(), expectedHash }
      });
      expect(restored.status()).toBe(200);
      await expect(ownerEditor).toContainText("안정화 원문", { timeout: 15_000 });
      await expect(ownerEditor).not.toContainText("소유자 임시 원문");

      await writerContext.setOffline(false);
      await expect(writerPage.getByRole("status")).toContainText("모든 변경 저장됨", { timeout: 20_000 });
      for (const editor of [ownerEditor, writerEditor]) {
        await expect(editor).toContainText("안정화 원문", { timeout: 15_000 });
        await expect(editor).toContainText("오프라인 작성자 원문", { timeout: 15_000 });
        await expect(editor).not.toContainText("소유자 임시 원문");
      }
      await expect.poll(() => syncQueueCount(writerPage, databaseName, documentKey)).toBe(0);
      for (let round = 1; round <= 3; round++) {
        await writerContext.setOffline(true);
        await expect(writerPage.getByRole("status")).toContainText("오프라인", { timeout: 10_000 });
        const marker = ` 재연결-${round}`;
        await writerEditor.click(); await writerPage.keyboard.press("Control+End"); await writerPage.keyboard.insertText(marker);
        await expect(writerPage.getByRole("status")).toContainText("오프라인", { timeout: 10_000 });
        const pending = await syncQueueCount(writerPage, databaseName, documentKey);
        expect(pending).toBeGreaterThan(0);
        expect(pending).toBeLessThanOrEqual(64);
        await writerContext.setOffline(false);
        await expect(writerPage.getByRole("status")).toContainText("모든 변경 저장됨", { timeout: 20_000 });
        await expect(ownerEditor).toContainText(marker, { timeout: 15_000 });
        await expect.poll(() => syncQueueCount(writerPage, databaseName, documentKey)).toBe(0);
      }
      const persisted = await lyricBody(ownerContext, lyricId);
      expect(persisted).toContain("안정화 원문");
      expect(persisted).toContain("오프라인 작성자 원문");
      expect(persisted).toContain("재연결-1 재연결-2 재연결-3");
      expect(persisted).not.toContain("소유자 임시 원문");
    } finally {
      await writerContext.setOffline(false).catch(() => undefined);
      await Promise.all([ownerContext.close(), writerContext.close()]);
      await removeAccounts([owner.userId, writer.userId]);
    }
  });
});

async function createSharedLyric(ownerContext: BrowserContext, sharingId: string): Promise<string> {
  const song = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "1.1.4 안정화 곡" } });
  expect(song.status()).toBe(201);
  const songId = ((await song.json()) as { song: { id: string } }).song.id;
  const lyric = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "1.1.4 안정화 가사", body: "[Verse]\n안정화 원문"
  } });
  expect(lyric.status()).toBe(201);
  const lyricId = ((await lyric.json()) as { lyric: { id: string } }).lyric.id;
  const grant = await ownerContext.request.post(`/api/lyrics/${lyricId}/shares`, { headers, data: { requestId: randomUUID(), sharingId } });
  expect(grant.status()).toBe(201);
  const grantId = ((await grant.json()) as { grant: { id: string } }).grant.id;
  expect((await ownerContext.request.patch(`/api/lyrics/${lyricId}/shares/${grantId}`, {
    headers, data: { requestId: randomUUID(), access: "write" }
  })).status()).toBe(200);
  return lyricId;
}

async function openSharingDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "가사 공유" });
  await page.locator("button:visible", { hasText: /^공유$/ }).first().click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("공유 설정을 불러오는 중…")).toHaveCount(0, { timeout: 10_000 });
  return dialog;
}

async function account(context: BrowserContext, displayName: string) {
  const value = await createAccount(displayName);
  await context.addCookies([{ name: "lc_session", value: value.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return value;
}

async function createAccount(displayName: string) {
  const userId = randomUUID(); const token = `sharing-stability-${randomUUID()}`;
  const sharingId = await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    const profile = await pool.query<{ sharing_id: string }>("insert into user_profiles(owner_id,display_name) values($1,$2) returning sharing_id", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    return profile.rows[0]!.sharing_id;
  });
  return { userId, token, sharingId };
}

async function ownerDatabaseName(page: Page, ownerId: string): Promise<string> {
  return page.evaluate(async (value) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `lyricscloud-draft-${hex}-sync-v2`;
  }, ownerId);
}

async function sharedDocumentKey(page: Page, lyricId: string): Promise<string> {
  const response = await page.request.post(`/collaboration/documents/${lyricId}`, { headers });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { documentKey: string }).documentKey;
}

async function lyricBody(context: BrowserContext, lyricId: string): Promise<string> {
  const response = await context.request.get(`/api/lyrics/${lyricId}`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { lyric: { body: string } }).lyric.body;
}

async function syncQueueCount(page: Page, databaseName: string, documentKey: string): Promise<number> {
  return page.evaluate(({ name, key }) => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("updates", "readonly");
      const count = transaction.objectStore("updates").index("documentKey").count(key);
      count.onerror = () => reject(count.error);
      count.onsuccess = () => resolve(count.result);
      transaction.oncomplete = () => database.close();
    };
  }), { name: databaseName, key: documentKey });
}

async function removeAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
