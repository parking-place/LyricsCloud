import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
test.describe("logout preserves pending work and isolates accounts", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("tampering with a local document key cannot load another owner's server document", async ({ browser, context, page }) => {
    const firstOwner = await account(context);
    const other = await browser.newContext({ baseURL: origin });
    const secondOwner = await account(other);
    try {
      const privateId = await lyric(page, "다른 계정의 비공개 합성 본문");
      const bootstrap = await page.request.post(`/collaboration/documents/${privateId}`, { headers });
      const { documentKey } = await bootstrap.json();
      const second = await other.newPage();
      const ownId = await lyric(second);
      await second.goto(`/lyrics/${ownId}`);
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await second.evaluate(async ({ ownId, documentKey }) => {
        const name = (await indexedDB.databases()).find(({ name }) => name?.endsWith("sync-v2"))!.name!;
        await new Promise<void>((resolve, reject) => {
          const open = indexedDB.open(name);
          open.onerror = () => reject(new Error("fixture database unavailable"));
          open.onsuccess = () => {
            const database = open.result;
            const transaction = database.transaction("documents", "readwrite");
            const store = transaction.objectStore("documents");
            const row = store.get(ownId);
            row.onsuccess = () => store.put({ ...row.result, documentKey });
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(new Error("fixture write failed")); };
          };
        });
      }, { ownId, documentKey });
      await second.reload();
      await expect(second.getByText("초안을 자동으로 합칠 수 없어 동기화를 멈췄습니다.", { exact: true })).toBeVisible();
      await expect(second.locator(".cm-content")).toHaveText("기준");
      expect((await second.request.post(`/collaboration/documents/${privateId}`, { headers })).status()).toBe(404);
      expect((await second.request.get(`/collaboration/documents/${documentKey}/revisions`)).status()).toBe(404);
    } finally { await other.close(); await remove(firstOwner); await remove(secondOwner); }
  });

  test("keeps an offline draft and a failed logout usable, then saves before signing out", async ({ context, page }, info) => {
    const owner = await account(context);
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n오프라인 보존");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      const logout = page.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout");
      await logout.click();
      await expect(page.getByRole("alert").filter({ hasText: "로그아웃" })).toContainText("저장");
      await expect(logout).toBeEnabled();
      await expect(page.locator(".cm-content")).toContainText("오프라인 보존");
      expect(await pending(page)).toBeGreaterThan(0);
      const alert = await page.getByRole("alert").filter({ hasText: "로그아웃" }).boundingBox();
      const editor = await page.locator(".lyric-editor-page").boundingBox();
      expect(alert!.y + alert!.height).toBeLessThanOrEqual(editor!.y);
      await page.screenshot({ path: info.outputPath(`logout-blocked-${info.project.name}.png`), fullPage: true });
      await context.setOffline(false);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.route("**/api/auth/logout", (route) => route.abort());
      await logout.click();
      await expect(logout).toBeEnabled();
      await expect(page.getByRole("alert").filter({ hasText: "로그아웃" })).toBeVisible();
      await page.unroute("**/api/auth/logout");
      await page.getByRole("textbox", { name: "가사 제목" }).fill("로그아웃 직전 제목");
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n마지막 입력");
      await logout.click();
      await expect(page).toHaveURL(/\/auth$/);
      await withE2eDatabase(async (pool) => {
        const result = await pool.query("select r.title,l.body from resources r join lyrics l on l.resource_id=r.id where r.id=$1", [id]);
        expect(result.rows[0]).toMatchObject({ title: "로그아웃 직전 제목", body: "기준\n오프라인 보존\n마지막 입력" });
      });
      expect(await page.evaluate(async () => (await indexedDB.databases()).filter(({ name }) => name?.startsWith("lyricscloud-draft-")).length)).toBe(0);
    } finally { await remove(owner); }
  });

  test("refuses to erase a closed tab's unsent document when logging out from another page", async ({ context, page }, info) => {
    const owner = await account(context);
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n닫은 탭 초안");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await context.setOffline(false);
      const workspace = await context.newPage();
      await workspace.goto("/workspace");
      await workspace.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout").click();
      await expect(workspace.getByRole("alert").filter({ hasText: "로그아웃" })).toContainText("저장");
      expect((await workspace.request.get("/api/auth/session")).status()).toBe(200);
      expect(await pending(workspace)).toBeGreaterThan(0);
      await workspace.goto(`/lyrics/${id}`);
      await expect(workspace.locator(".cm-content")).toContainText("닫은 탭 초안");
      await expect(workspace.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await workspace.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout").click();
      await expect(workspace).toHaveURL(/\/auth$/);
    } finally { await remove(owner); }
  });

  test("a changed account clears the previous owner's browser drafts and view", async ({ context, page }) => {
    const owner = await account(context);
    let other: string | undefined;
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      expect(await page.evaluate(async () => (await indexedDB.databases()).filter(({ name }) => name?.startsWith("lyricscloud-draft-")).length)).toBe(1);
      other = await account(context);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page).not.toHaveURL(new RegExp(`/lyrics/${id}$`));
      expect(await page.evaluate(async () => (await indexedDB.databases()).filter(({ name }) => name?.startsWith("lyricscloud-draft-")).length)).toBe(0);
      expect((await page.request.get(`/api/lyrics/${id}`)).status()).toBe(404);
    } finally { await remove(owner); if (other) await remove(other); }
  });

  test("a fresh page for another account removes drafts left by an already closed account page", async ({ context, page }) => {
    const owner = await account(context);
    let other: string | undefined;
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.close();
      other = await account(context);
      const current = await context.newPage();
      await current.goto("/workspace");
      await expect.poll(() => current.evaluate(async () => (await indexedDB.databases()).filter(({ name }) => name?.startsWith("lyricscloud-draft-")).length)).toBe(0);
      expect((await current.request.get(`/api/lyrics/${id}`)).status()).toBe(404);
      const staleLogout = await current.request.post("/api/auth/logout", { headers: { ...headers, "X-Expected-Owner": owner } });
      expect(staleLogout.status()).toBe(403);
      expect((await current.request.get("/api/auth/session")).status()).toBe(200);
    } finally { await remove(owner); if (other) await remove(other); }
  });

  test("preserves an offline outbox across session expiry and resumes after the same owner signs in", async ({ context, page }) => {
    const owner = await account(context);
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n만료 중 보존할 입력");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await withE2eDatabase((pool) => pool.query("update auth_sessions set expires_at=now()-interval '1 second' where user_id=$1", [owner]).then(() => undefined));
      await context.setOffline(false);
      await expect(page.getByRole("alert").filter({ hasText: "로그인이 만료" })).toBeVisible();
      expect(await pending(page)).toBeGreaterThan(0);
      await expect(page.locator(".cm-content")).toContainText("만료 중 보존할 입력");
      const token = randomUUID();
      await withE2eDatabase((pool) => pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]).then(() => undefined));
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.getByRole("button", { name: "동기화 다시 시도" }).click();
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      expect((await (await page.request.get(`/api/lyrics/${id}`)).json()).lyric.body).toBe("기준\n만료 중 보존할 입력");
    } finally { await remove(owner); }
  });

  test("exports an unsendable deleted document before explicitly discarding it on logout", async ({ context, page }, info) => {
    const owner = await account(context);
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n삭제된 문서의 초안");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await context.setOffline(false);
      const workspace = await context.newPage();
      expect((await workspace.request.delete(`/api/lyrics/${id}`, { headers })).status()).toBe(200);
      await workspace.goto("/workspace");
      await workspace.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout").click();
      await expect(workspace.getByRole("button", { name: "초안 내려받기" })).toBeVisible();
      const downloaded = workspace.waitForEvent("download");
      await workspace.getByRole("button", { name: "초안 내려받기" }).click();
      const stream = await (await downloaded).createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
      expect(JSON.parse(Buffer.concat(chunks).toString()).drafts).toEqual([{ body: "기준\n삭제된 문서의 초안" }]);
      workspace.once("dialog", (dialog) => dialog.dismiss());
      await workspace.getByRole("button", { name: "초안을 지우고 로그아웃" }).click();
      expect((await workspace.request.get("/api/auth/session")).status()).toBe(200);
      workspace.once("dialog", (dialog) => dialog.accept());
      await workspace.getByRole("button", { name: "초안을 지우고 로그아웃" }).click();
      await expect(workspace).toHaveURL(/\/auth$/);
      expect(await pending(workspace)).toBe(0);
    } finally { await remove(owner); }
  });

  test("pauses all open tabs and saves their metadata before an in-flight logout can clear storage", async ({ context, page }, info) => {
    const owner = await account(context);
    let release: (() => void) | undefined;
    try {
      const id = await lyric(page);
      const second = await context.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await second.getByRole("textbox", { name: "가사 제목" }).fill("다른 탭의 마지막 제목");
      await page.route("**/api/auth/logout", async (route) => {
        await new Promise<void>((resolve) => { release = resolve; });
        await route.continue();
      });
      await page.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout").click();
      await expect.poll(() => Boolean(release)).toBe(true);
      await expect(page.locator(".main-shell")).toHaveAttribute("inert", "");
      await expect(second.locator(".main-shell")).toHaveAttribute("inert", "");
      expect((await (await second.request.get(`/api/lyrics/${id}`)).json()).lyric.title).toBe("다른 탭의 마지막 제목");
      release!();
      await expect(page).toHaveURL(/\/auth$/, { timeout: 15_000 });
      await expect(second).toHaveURL(/\/auth$/, { timeout: 15_000 });
    } finally { release?.(); await remove(owner); }
  });

  test("resumes the remaining editor if the tab coordinating logout closes", async ({ context, page }, info) => {
    test.setTimeout(45_000);
    const owner = await account(context);
    let release: (() => void) | undefined;
    try {
      const id = await lyric(page);
      const second = await context.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      // Stop during checkpoint preparation, before the server accepts logout.
      // Closing a page with an intercepted keepalive fetch can release that fetch.
      await page.route("**/collaboration/documents/*/revisions", async (route) => {
        await new Promise<void>((resolve) => { release = resolve; });
        await route.abort().catch(() => undefined);
      }, { times: 1 });
      await page.locator(info.project.name === "mobile" ? ".mobile-logout" : ".top-logout").click();
      await expect.poll(() => Boolean(release)).toBe(true);
      await expect(second.locator(".main-shell")).toHaveAttribute("inert", "");
      await page.close();
      release!();
      expect((await second.request.get("/api/auth/session")).status()).toBe(200);
      await expect(second.locator(".main-shell")).not.toHaveAttribute("inert", "", { timeout: 35_000 });
      await second.locator(".cm-content").press("Control+End");
      await second.keyboard.insertText("\n탭 종료 후 계속 편집");
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      expect((await (await second.request.get(`/api/lyrics/${id}`)).json()).lyric.body).toBe("기준\n탭 종료 후 계속 편집");
    } finally { release?.(); await remove(owner); }
  });
});

async function account(context: BrowserContext) {
  const owner = randomUUID();
  const token = `logout-fixture-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id) values($1)", [owner]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'합성 사용자')", [owner]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return owner;
}
async function lyric(page: Page, body = "기준") {
  const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "합성 곡" } });
  expect(song.status()).toBe(201);
  const result = await page.request.post(`/api/songs/${(await song.json()).song.id}/lyrics`, { headers, data: { requestId: randomUUID(), title: "합성 가사", body } });
  expect(result.status()).toBe(201);
  return (await result.json()).lyric.id as string;
}
async function remove(owner: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner]).then(() => undefined)); }
async function pending(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(({ name }) => name?.endsWith("sync-v2"))?.name;
    if (!name) return 0;
    return new Promise<number>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onerror = () => reject(new Error("fixture database unavailable"));
      open.onsuccess = () => {
        const database = open.result;
        const count = database.transaction("updates").objectStore("updates").count();
        count.onsuccess = () => { database.close(); resolve(count.result); };
        count.onerror = () => { database.close(); reject(new Error("fixture outbox unavailable")); };
      };
    });
  });
}
