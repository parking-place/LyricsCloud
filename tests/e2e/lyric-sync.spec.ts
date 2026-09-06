import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("same-owner server synchronization", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");

  test("independent browsers converge through the server and keep an emptied document empty", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const userId = await account([context, other]);
    try {
      const id = await lyric(page);
      const second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
      await expect(second.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n첫 기기 🎵");
      await expect(second.locator(".cm-content")).toContainText("첫 기기 🎵");
      await second.locator(".cm-content").press("Control+Home");
      await second.keyboard.insertText("다른 기기\n");
      await expect(page.locator(".cm-content")).toContainText("다른 기기");
      await expect.poll(() => body(page, id)).toBe("다른 기기\n[Verse]\n서버 기준\n첫 기기 🎵");

      await page.getByRole("textbox", { name: "가사 제목" }).fill("동기화 중 제목 수정");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.locator(".cm-content").fill("");
      await expect.poll(() => body(page, id)).toBe("");
      await Promise.all([page.reload(), second.reload()]);
      await expect(page.locator(".cm-content")).toHaveText("");
      await expect(second.locator(".cm-content")).toHaveText("");
    } finally { await other.close(); await removeAccount(userId); }
  });

  test("an offline draft survives page closure and merges with another device after reconnect", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const userId = await account([context, other]);
    try {
      const id = await lyric(page);
      const second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await context.setOffline(true);
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n오프라인 초안");
      await expect(page.getByText("오프라인 · 이 기기에 임시 저장됨")).toBeVisible();
      await page.close();
      await second.locator(".cm-content").press("Control+Home");
      await second.keyboard.insertText("온라인 변경\n");
      await expect.poll(() => body(second, id)).toContain("온라인 변경");
      await context.setOffline(false);
      const recovered = await context.newPage();
      await recovered.goto(`/lyrics/${id}`);
      await expect(recovered.locator(".cm-content")).toContainText("온라인 변경");
      await expect(recovered.locator(".cm-content")).toContainText("오프라인 초안");
      await expect(second.locator(".cm-content")).toContainText("오프라인 초안");
      await expect.poll(() => body(recovered, id)).toBe("온라인 변경\n[Verse]\n서버 기준\n오프라인 초안");
    } finally { await other.close(); await removeAccount(userId); }
  });

  test("only commits the completed Korean composition while deferring a remote edit", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const userId = await account([context, other]);
    try {
      const id = await lyric(page);
      const second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      const editor = page.locator(".cm-content");
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await expect(second.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await editor.dispatchEvent("compositionstart", { data: "" });
      await editor.fill("[Verse]\n서버 기준\nㅎ");
      await page.waitForTimeout(150);
      expect(await body(page, id)).toBe("[Verse]\n서버 기준");
      await second.locator(".cm-content").press("Control+Home");
      await second.keyboard.insertText("원격 입력\n");
      await expect.poll(() => body(second, id)).toContain("원격 입력");
      await expect(editor).not.toContainText("원격 입력");
      await editor.fill("[Verse]\n서버 기준\n완성 한글 🎵");
      await editor.dispatchEvent("compositionend", { data: "한글" });
      await expect(editor).toContainText("원격 입력");
      await expect(second.locator(".cm-content")).toContainText("완성 한글 🎵");
      await expect.poll(() => body(page, id)).toBe("원격 입력\n[Verse]\n서버 기준\n완성 한글 🎵");
    } finally { await other.close(); await removeAccount(userId); }
  });

  test("rolls back a failed local queue write and recovers the retained input on retry", async ({ context, page }) => {
    const userId = await account([context]);
    await page.addInitScript(() => {
      let abortNext = false;
      window.addEventListener("test-abort-next-sync-write", () => { abortNext = true; });
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === "updates" && abortNext) { abortNext = false; this.transaction.abort(); }
        return put.call(this, value, key);
      };
    });
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.evaluate(() => window.dispatchEvent(new Event("test-abort-next-sync-write")));
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\n저장 실패에도 보관할 입력");
      await expect(page.getByText("동기화를 완료하지 못했습니다. 현재 입력을 복사해 보관해 주세요.")).toBeVisible();
      await expect(page.locator(".cm-content")).toContainText("저장 실패에도 보관할 입력");
      expect(await body(page, id)).toBe("[Verse]\n서버 기준");
      await expect(page.getByText("방금 저장됨", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "동기화 다시 시도" }).click();
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      expect(await body(page, id)).toBe("[Verse]\n서버 기준\n저장 실패에도 보관할 입력");
    } finally { await removeAccount(userId); }
  });

  test("resends the same durable update after losing an ACK without duplicating text", async ({ context, page }) => {
    const userId = await account([context]);
    const sent: string[] = [];
    let dropAck = true;
    await page.routeWebSocket("**/collaboration/sync/**", (socket) => {
      const server = socket.connectToServer();
      socket.onMessage((message) => {
        const envelope = JSON.parse(String(message));
        if (envelope.type === "update") sent.push(envelope.updateId);
        server.send(message);
      });
      server.onMessage((message) => {
        if (JSON.parse(String(message)).type === "ack" && dropAck) {
          dropAck = false;
          server.close();
          socket.close();
        } else socket.send(message);
      });
    });
    try {
      const id = await lyric(page);
      await page.goto(`/lyrics/${id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      await page.locator(".cm-content").press("Control+End");
      await page.keyboard.insertText("\nACK 유실 뒤 복구");
      await expect.poll(() => sent.length).toBeGreaterThanOrEqual(2);
      expect(new Set(sent).size).toBe(1);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      expect(await body(page, id)).toBe("[Verse]\n서버 기준\nACK 유실 뒤 복구");
      await withE2eDatabase(async (pool) => {
        const result = await pool.query("select count(*)::int count from sync_update_receipts r join sync_documents d using(document_key) where d.resource_id=$1", [id]);
        expect(result.rows[0].count).toBe(1);
      });
    } finally { await removeAccount(userId); }
  });
});

async function account(contexts: BrowserContext[]) {
  const userId = randomUUID();
  const token = `sync-fixture-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values ($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values ($1,'동기화 합성 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values ($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  for (const context of contexts) await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function lyric(page: Page) {
  const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "동기화 합성 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id;
  const result = await page.request.post(`/api/songs/${songId}/lyrics`, { headers,
    data: { requestId: randomUUID(), title: "동기화 합성 가사", body: "[Verse]\n서버 기준" } });
  expect(result.status()).toBe(201);
  return (await result.json()).lyric.id as string;
}

async function body(page: Page, id: string): Promise<string> {
  return (await (await page.request.get(`/api/lyrics/${id}`)).json()).lyric.body;
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
