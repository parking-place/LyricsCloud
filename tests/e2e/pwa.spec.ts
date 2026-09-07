import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const mutationHeaders = { Origin: origin };

test.describe("0.9.0 installable online-first PWA", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("migrates local drafts, caches only immutable shell assets and gates updates", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "service worker acceptance runs once in Chromium");
    test.setTimeout(120_000);
    const context = await browser.newContext({ baseURL: origin, serviceWorkers: "allow", viewport: { width: 390, height: 844 } });
    const account = await createAccount(context);
    const databaseName = `lyricscloud-draft-${createHash("sha256").update(account.userId).digest("hex")}-sync-v2`;
    const builtWorker = path.join(process.cwd(), "apps/web/.next/standalone/apps/web/public/sw.js");
    const originalWorker = await readFile(builtWorker, "utf8");
    const privateText = `PWA 비공개 합성 제목 ${randomUUID()}`;
    let lyricId: string | undefined;
    try {
      const page = await context.newPage();
      await page.goto("/privacy");
      await page.evaluate(async ({ databaseName }) => {
        await new Promise<void>((resolve, reject) => {
          // Dexie schema 1 uses native IndexedDB version 10.
          const open = indexedDB.open(databaseName, 10);
          open.onerror = () => reject(new Error("legacy database unavailable"));
          open.onupgradeneeded = () => {
            const documents = open.result.createObjectStore("documents", { keyPath: "resourceId" });
            documents.createIndex("documentKey", "documentKey", { unique: true });
            const updates = open.result.createObjectStore("updates", { keyPath: "sequence", autoIncrement: true });
            updates.createIndex("updateId", "updateId", { unique: true });
            updates.createIndex("documentKey", "documentKey");
          };
          open.onsuccess = () => {
            const database = open.result;
            const transaction = database.transaction(["documents", "updates"], "readwrite");
            transaction.objectStore("documents").put({ resourceId: "legacy-resource", documentKey: "legacy-key", snapshot: new Uint8Array([0]) });
            transaction.objectStore("updates").put({ updateId: "legacy-update", documentKey: "legacy-key", payload: new Uint8Array([0]) });
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(new Error("legacy fixture failed")); };
          };
        });
      }, { databaseName });

      await page.goto("/workspace");
      await page.evaluate(() => {
        const prompt = new Event("beforeinstallprompt", { cancelable: true });
        Object.defineProperty(prompt, "prompt", { value: async () => { (window as Window & { __pwaPrompted?: boolean }).__pwaPrompted = true; } });
        Object.defineProperty(prompt, "userChoice", { value: Promise.resolve({ outcome: "accepted" }) });
        window.dispatchEvent(prompt);
      });
      await page.getByRole("button", { name: "앱 설치" }).click();
      expect(await page.evaluate(() => (window as Window & { __pwaPrompted?: boolean }).__pwaPrompted)).toBe(true);
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
      });
      await expect.poll(() => page.evaluate(async ({ databaseName }) => {
        return await new Promise<{ version: number; documents: number; updates: number; schema: number | null }>((resolve, reject) => {
          const open = indexedDB.open(databaseName);
          open.onerror = () => reject(new Error("migrated database unavailable"));
          open.onsuccess = () => {
            const database = open.result;
            const transaction = database.transaction(["documents", "updates", "metadata"], "readonly");
            const documents = transaction.objectStore("documents").count();
            const updates = transaction.objectStore("updates").count();
            const schema = transaction.objectStore("metadata").get("schema");
            transaction.oncomplete = () => {
              const result = { version: database.version, documents: documents.result, updates: updates.result, schema: schema.result?.value ?? null };
              database.close(); resolve(result);
            };
            transaction.onerror = () => { database.close(); reject(new Error("migrated database read failed")); };
          };
        });
      }, { databaseName })).toEqual({ version: 20, documents: 1, updates: 1, schema: 2 });

      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "PRECACHE_STATIC", urls: performance.getEntriesByType("resource").map((entry) => entry.name) });
      });
      await expect.poll(() => page.evaluate(async () => (await Promise.all((await caches.keys()).filter((name) => name.startsWith("lyricscloud-shell-")).map(async (name) => (await caches.open(name)).keys()))).flat().length)).toBeGreaterThan(0);

      await createSong(context.request, privateText);
      expect((await page.request.get("/api/songs")).status()).toBe(200);
      const cached = await page.evaluate(async () => {
        const records: Array<{ url: string; body: string }> = [];
        for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
          records.push({ url: request.url, body: await (await caches.match(request))!.text() });
        }
        return records;
      });
      expect(cached.every(({ url }) => new URL(url).pathname.startsWith("/_next/static/"))).toBe(true);
      expect(cached.some(({ url }) => /\/api\/|\/lyrics\//.test(new URL(url).pathname))).toBe(false);
      expect(cached.some(({ body }) => body.includes(privateText))).toBe(false);
      await context.setOffline(true);
      expect(await page.evaluate(async (url) => (await fetch(url)).ok, cached[0]!.url)).toBe(true);
      await context.setOffline(false);
      for (const route of ["/workspace", "/rhymes", "/api/songs"]) {
        expect((await page.request.get(route)).headers()["cache-control"]).toContain("no-store");
      }

      await writeFile(builtWorker, `${originalWorker}\n// e2e update ${randomUUID()}\n`);
      await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration("/"))?.update(); });
      const updateButton = page.getByRole("button", { name: "업데이트 적용" });
      await expect(updateButton).toBeVisible({ timeout: 20_000 });
      await expect(updateButton).toBeDisabled();
      await expect(page.locator(".pwa-status")).toContainText("미전송 초안 보존 중");
      await page.evaluate(async ({ databaseName }) => {
        await new Promise<void>((resolve, reject) => {
          const open = indexedDB.open(databaseName);
          open.onerror = () => reject(new Error("draft database unavailable"));
          open.onsuccess = () => {
            const database = open.result;
            const transaction = database.transaction("updates", "readwrite");
            transaction.objectStore("updates").clear();
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(new Error("draft cleanup failed")); };
          };
        });
      }, { databaseName });
      await expect(updateButton).toBeEnabled({ timeout: 10_000 });
      await updateButton.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();

      const songId = await createSong(context.request, "PWA 오프라인 곡");
      lyricId = await createLyric(context.request, songId);
      await page.goto(`/lyrics/${lyricId}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\nPWA 콜드 스타트 초안");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await context.setOffline(false);
      const recovered = await context.newPage();
      await recovered.goto(`/lyrics/${lyricId}`);
      await expect(recovered.locator(".cm-content")).toContainText("PWA 콜드 스타트 초안");
      await expect(recovered.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
    } finally {
      await writeFile(builtWorker, originalWorker);
      await context.close();
      await deleteAccount(account.userId);
    }
  });

  test("keeps ordinary web behavior and removes account-local data on logout", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "service worker acceptance runs once in Chromium");
    const context = await browser.newContext({ baseURL: origin, serviceWorkers: "allow" });
    const account = await createAccount(context);
    try {
      const page = await context.newPage();
      await page.goto("/workspace");
      await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
      await page.evaluate(async ({ userId }) => {
        localStorage.setItem(`lc:${userId}:pwa-private`, "private-local-value");
        const cache = await caches.open(`lyricscloud-private-${userId}`);
        await cache.put("/private-fixture", new Response("private-cache-value"));
      }, { userId: account.userId });
      await page.locator(".top-logout").click();
      await expect(page).toHaveURL(/\/auth$/);
      const residue = await page.evaluate(async ({ userId }) => ({
        local: localStorage.getItem(`lc:${userId}:pwa-private`),
        privateCaches: (await caches.keys()).filter((name) => name.startsWith("lyricscloud-private")),
        draftDatabases: (await indexedDB.databases()).filter(({ name }) => name?.startsWith("lyricscloud-draft-"))
      }), { userId: account.userId });
      expect(residue).toEqual({ local: null, privateCaches: [], draftDatabases: [] });
    } finally {
      await context.close();
      await deleteAccount(account.userId);
    }
  });
});

async function createAccount(context: BrowserContext) {
  const userId = randomUUID();
  const token = `pwa-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'PWA 합성 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, token };
}

async function createSong(request: APIRequestContext, title: string) {
  const response = await request.post("/api/songs", { headers: mutationHeaders, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(request: APIRequestContext, songId: string) {
  const response = await request.post(`/api/songs/${songId}/lyrics`, { headers: mutationHeaders, data: { requestId: randomUUID(), title: "PWA 오프라인 가사", body: "기준" } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase(async (pool) => { await pool.query("delete from app_users where id=$1", [userId]); });
}
