import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const original = "[Verse]\n원래 표현 🎵\n\n[Hook]\n지킬 한 줄\n";
const pasted = "[Verse]\n" + "붙여넣은 한글 표현 🎵\n".repeat(90);

test.describe("body history and non-destructive restore", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("compares on desktop and mobile, restores across independent browsers and recovers the pre-restore body", async ({ browser, context, page }, info) => {
    const other = await browser.newContext({ baseURL: origin });
    const owner = await account([context, other]);
    const hydrationErrors: string[] = [];
    page.on("console", (message) => { if (/hydration|hydrated|Minified React error #418/i.test(message.text())) hydrationErrors.push(message.text()); });
    try {
      const id = await createLyric(page);
      const second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await ready(page); await ready(second);
      await paste(page, pasted);
      await expect.poll(() => body(page, id)).toBe(pasted);
      await expect(second.locator(".cm-content")).toContainText("붙여넣은 한글 표현");
      expect(hydrationErrors).toEqual([]);
      const dialog = await openHistory(page);
      await dialog.getByRole("navigation", { name: "수정 기록 목록" }).getByRole("button").filter({ hasText: "대규모 붙여넣기 전" }).click();
      await expect(dialog.locator(".diff-selected")).toContainText("원래 표현");
      await expect(dialog.locator(".diff-current")).toContainText("붙여넣은 한글 표현");
      const left = await dialog.locator(".diff-current").boundingBox();
      const right = await dialog.locator(".diff-selected").boundingBox();
      if (info.project.name === "mobile") {
        expect(right!.y).toBeGreaterThan(left!.y);
        await dialog.getByRole("button", { name: "선택한 본문", exact: true }).click();
        await expect(dialog.locator(".diff-current")).not.toBeVisible();
        await expect(dialog.locator(".diff-selected")).toBeVisible();
        await dialog.getByRole("button", { name: "위아래 비교" }).click();
      } else expect(right!.x).toBeGreaterThan(left!.x);
      await expect(page.locator(".cm-content")).not.toBeFocused();
      await page.screenshot({ path: `test-results/revisions-${info.project.name}.png`, fullPage: true });
      await dialog.getByRole("button", { name: "이 기록으로 복원" }).click();
      await dialog.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect(dialog.getByText("본문을 복원했습니다.", { exact: false })).toBeVisible();
      await expect.poll(() => body(page, id)).toBe(original);
      await expect(second.locator(".cm-content")).toContainText("원래 표현");
      await dialog.getByRole("navigation", { name: "수정 기록 목록" }).getByRole("button").filter({ hasText: "복원 직전 보존" }).first().click();
      await expect(dialog.locator(".diff-selected")).toContainText("붙여넣은 한글 표현");
      await dialog.getByRole("button", { name: "이 기록으로 복원" }).click();
      await dialog.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect.poll(() => body(page, id)).toBe(pasted);
      await expect(second.locator(".cm-content")).toContainText("붙여넣은 한글 표현");
    } finally { await other.close(); await remove(owner); }
  });

  test("refuses to restore a stale comparison after another device edits", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const owner = await account([context, other]);
    try {
      const id = await createLyric(page);
      const second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]);
      await ready(page); await ready(second);
      await checkpoint(page, id);
      await page.locator(".cm-content").fill("비교를 열 때의 현재본"); await ready(page);
      const dialog = await openHistory(page);
      await dialog.getByRole("navigation", { name: "수정 기록 목록" }).getByRole("button").first().click();
      await expect(dialog.locator(".diff-selected")).toContainText("원래 표현");
      await second.locator(".cm-content").press("Control+End");
      await second.keyboard.insertText("\n다른 기기에서 추가한 표현");
      await expect.poll(() => body(page, id)).toContain("다른 기기에서 추가한 표현");
      await dialog.getByRole("button", { name: "이 기록으로 복원" }).click();
      await dialog.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect(dialog.getByRole("alert")).toContainText("비교 후 현재 본문이 바뀌었습니다");
      expect(await body(page, id)).toContain("다른 기기에서 추가한 표현");
    } finally { await other.close(); await remove(owner); }
  });

  test("recovers empty/history-load errors and refuses a large paste if its checkpoint fails", async ({ context, page }) => {
    const owner = await account([context]);
    try {
      const id = await createLyric(page); await page.goto(`/lyrics/${id}`); await ready(page);
      let dialog = await openHistory(page);
      await expect(dialog.getByText("아직 수정 기록이 없습니다.", { exact: false })).toBeVisible();
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
      await page.route("**/collaboration/documents/*/revisions", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
      dialog = await openHistory(page, false);
      await expect(dialog.getByRole("alert")).toContainText("기록을 불러오지 못했습니다");
      await page.unroute("**/collaboration/documents/*/revisions");
      await dialog.getByRole("button", { name: "다시 불러오기", exact: true }).click();
      await expect(dialog.getByText("아직 수정 기록이 없습니다.", { exact: false })).toBeVisible();
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
      await page.route("**/collaboration/documents/*/revisions", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
      await paste(page, pasted);
      await expect(page.getByText("붙여넣기 전 수정 기록을 저장하지 못했습니다.", { exact: false })).toBeVisible();
      expect(await body(page, id)).toBe(original);
      await expect(page.locator(".cm-content")).toContainText("원래 표현");
      await page.unroute("**/collaboration/documents/*/revisions");
      await paste(page, pasted);
      await expect.poll(() => body(page, id)).toBe(pasted);
    } finally { await remove(owner); }
  });

  test("keeps duplicate and leave checkpoints separate from named versions", async ({ context, page }, info) => {
    const owner = await account([context]);
    try {
      const id = await createLyric(page); await page.goto(`/lyrics/${id}`); await ready(page);
      await page.locator(".cm-content").fill("복제할 독립 버전"); await ready(page);
      if (info.project.name === "mobile") {
        await page.getByRole("button", { name: /≋ 다른 가사/ }).click();
        await page.getByRole("button", { name: "현재 가사 복제", exact: true }).click();
      } else await page.getByRole("button", { name: "복제", exact: true }).click();
      await expect(page).not.toHaveURL(new RegExp(`/lyrics/${id}$`));
      await ready(page);
      const copyId = new URL(page.url()).pathname.split("/").at(-1)!;
      expect(await body(page, copyId)).toBe("복제할 독립 버전");
      const originalHistory = await history(page, id);
      expect(originalHistory.items[0].reason).toBe("duplicate");
      const dialog = await openHistory(page);
      await dialog.getByRole("button", { name: "다른 가사 버전", exact: true }).click();
      await dialog.getByRole("navigation", { name: "비교할 다른 가사" }).getByRole("button").click();
      await expect(dialog.getByText("두 본문이 같습니다.")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "이 기록으로 복원" })).toHaveCount(0);
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
      await page.getByRole("link", { name: /←/ }).click();
      await expect(page).toHaveURL(/\/songs\//);
      expect((await history(page, copyId)).items[0].reason).toBe("leave");
    } finally { await remove(owner); }
  });

  test("protects revision HTTP endpoints from another owner, foreign origin, invalid input and deleted resources", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const owner = await account([context]), outsider = await account([other]);
    try {
      const id = await createLyric(page);
      const key = await documentKey(page, id), base = `/collaboration/documents/${key}/revisions`;
      const captured = await page.request.post(base, { headers, data: { reason: "leave" } });
      expect(captured.status()).toBe(200);
      const revision = (await captured.json()).revision;
      const current = (await (await page.request.get(base)).json()).current;
      const input = { requestId: randomUUID(), expectedHash: current.hash };
      expect((await other.request.get(base)).status()).toBe(404);
      expect((await other.request.get(`${base}/${revision.id}`)).status()).toBe(404);
      expect((await other.request.post(`${base}/${revision.id}/restore`, { headers, data: input })).status()).toBe(404);
      expect((await page.request.post(base, { headers: { Origin: "https://foreign.example" }, data: { reason: "leave" } })).status()).toBe(403);
      expect((await page.request.post(base, { headers, data: { reason: "before_restore" } })).status()).toBe(400);
      expect((await page.request.post(`${base}/${revision.id}/restore`, { headers, data: { requestId: "wrong" } })).status()).toBe(400);
      await page.request.delete(`/api/lyrics/${id}`, { headers });
      expect((await page.request.get(base)).status()).toBe(404);
      expect((await page.request.post(`${base}/${revision.id}/restore`, { headers, data: input })).status()).toBe(404);
    } finally { await other.close(); await remove(owner); await remove(outsider); }
  });

  test("retries a lost restore response with the same request without overwriting later edits", async ({ browser, context, page }) => {
    const other = await browser.newContext({ baseURL: origin });
    const owner = await account([context, other]);
    const requests: string[] = [];
    try {
      const id = await createLyric(page), second = await other.newPage();
      await Promise.all([page.goto(`/lyrics/${id}`), second.goto(`/lyrics/${id}`)]); await ready(page); await ready(second);
      await checkpoint(page, id); await page.locator(".cm-content").fill("복원 이전 수정본"); await ready(page);
      const dialog = await openHistory(page);
      await dialog.getByRole("navigation", { name: "수정 기록 목록" }).getByRole("button").first().click();
      await page.route("**/revisions/*/restore", async (route) => {
        requests.push(route.request().postDataJSON().requestId);
        const response = await route.fetch();
        if (requests.length === 1) await route.abort("failed");
        else await route.fulfill({ response });
      });
      await dialog.getByRole("button", { name: "이 기록으로 복원" }).click();
      await dialog.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect(dialog.getByRole("alert")).toContainText("복원 결과를 확인하지 못했습니다");
      await expect.poll(() => body(page, id)).toBe(original);
      await expect(second.locator(".cm-content")).toContainText("원래 표현");
      await second.locator(".cm-content").press("Control+End"); await second.keyboard.insertText("복원 뒤 새 입력");
      await expect.poll(() => body(page, id)).toBe(original + "복원 뒤 새 입력");
      await dialog.getByRole("button", { name: "현재 본문 보존 후 복원" }).click();
      await expect(dialog.getByText("본문을 복원했습니다.", { exact: false })).toBeVisible();
      expect(requests).toHaveLength(2); expect(new Set(requests).size).toBe(1);
      expect(await body(page, id)).toBe(original + "복원 뒤 새 입력");
    } finally { await other.close(); await remove(owner); }
  });
});

async function account(contexts: BrowserContext[]) {
  const owner = randomUUID(), token = `revisions-fixture-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [owner]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'수정 기록 합성 사용자')", [owner]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
  });
  for (const context of contexts) await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return owner;
}
async function createLyric(page: Page) {
  const song = await page.request.post("/api/songs", { headers, data: { title: "수정 기록 합성 곡", requestId: randomUUID() } });
  expect(song.status()).toBe(201);
  const result = await page.request.post(`/api/songs/${(await song.json()).song.id}/lyrics`, { headers, data: { title: "비교할 이름 있는 가사", body: original, requestId: randomUUID() } });
  expect(result.status()).toBe(201); return (await result.json()).lyric.id as string;
}
async function ready(page: Page) { await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible(); await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true"); }
async function openHistory(page: Page, loaded = true) {
  await page.getByRole("button", { name: /^(버전 비교|기록·비교)$/ }).click();
  const dialog = page.getByRole("dialog", { name: "수정 기록 · 버전 비교" });
  if (loaded) await expect(dialog.getByRole("button", { name: "최신 본문·목록 불러오기" })).toBeEnabled();
  return dialog;
}
async function paste(page: Page, text: string) {
  const editor = page.locator(".cm-content");
  await expect(editor).toHaveAttribute("contenteditable", "true"); await editor.press("Control+A");
  await editor.evaluate((node, value) => { const data = new DataTransfer(); data.setData("text/plain", value); node.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })); }, text);
}
async function body(page: Page, id: string): Promise<string> { return (await (await page.request.get(`/api/lyrics/${id}`)).json()).lyric.body; }
async function documentKey(page: Page, id: string) { return (await (await page.request.post(`/collaboration/documents/${id}`, { headers })).json()).documentKey as string; }
async function checkpoint(page: Page, id: string) { const key = await documentKey(page, id); expect((await page.request.post(`/collaboration/documents/${key}/revisions`, { headers, data: { reason: "leave" } })).ok()).toBe(true); }
async function history(page: Page, id: string) { return (await page.request.get(`/collaboration/documents/${await documentKey(page, id)}/revisions`)).json(); }
async function remove(id: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined)); }
