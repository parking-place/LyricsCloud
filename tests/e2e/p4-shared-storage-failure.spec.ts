import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test("selected writer keeps unsent text visible and stops claiming it is saved after IndexedDB failure", async ({ browser }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated database");
  const mobile = info.project.name.includes("mobile");
  const options = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
  const ownerContext = await browser.newContext(options);
  const writerContext = await browser.newContext(options);
  const owner = await account(ownerContext, "저장 실패 소유자");
  const writer = await account(writerContext, "저장 실패 작성자");
  try {
    const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "저장 실패 확인 곡" } });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
      requestId: randomUUID(), title: "저장 실패 확인 가사", body: "서버 기준 원문", memo: "비공개 메모"
    } });
    expect(lyricResponse.status()).toBe(201);
    const lyricId = (await lyricResponse.json()).lyric.id as string;
    const grantResponse = await ownerContext.request.post(`/api/lyrics/${lyricId}/shares`, { headers, data: { requestId: randomUUID(), sharingId: writer.sharingId } });
    expect(grantResponse.status()).toBe(201);
    const grantId = (await grantResponse.json()).grant.id as string;
    const writerGrant = await ownerContext.request.patch(`/api/lyrics/${lyricId}/shares/${grantId}`, { headers, data: { access: "write", requestId: randomUUID() } });
    expect(writerGrant.status()).toBe(200);

    const writerPage = await writerContext.newPage();
    await writerPage.goto(`/shared/lyrics/${lyricId}`);
    const editor = writerPage.getByLabel("공유된 가사 본문");
    await expect(writerPage.locator(".shared-read-badge")).toContainText("공동 작성", { timeout: 15_000 });
    await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
    await writerPage.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      (window as unknown as { restoreP4Storage?: () => void }).restoreP4Storage = () => { IDBObjectStore.prototype.put = original; };
      IDBObjectStore.prototype.put = function (...args) {
        if (this.transaction.db.name.endsWith("sync-v2")) throw new DOMException("synthetic quota", "QuotaExceededError");
        return original.apply(this, args);
      } as typeof IDBObjectStore.prototype.put;
    });
    await editor.click();
    await writerPage.keyboard.press("Control+End");
    await writerPage.keyboard.insertText(" 미전송 합성 문장");
    await expect(writerPage.getByRole("status")).toContainText("미전송 입력을 확인", { timeout: 15_000 });
    await expect(editor).toHaveAttribute("contenteditable", "false");
    const recovery = writerPage.locator(".shared-writer-recovery");
    await expect(recovery).toContainText("미전송 합성 문장");
    await expect(recovery.getByRole("button", { name: "내용 복사" })).toBeVisible();
    const beforeRetry = (await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body as string;
    expect(beforeRetry).not.toContain("미전송 합성 문장");

    await writerPage.evaluate(() => (window as unknown as { restoreP4Storage: () => void }).restoreP4Storage());
    await writerPage.getByRole("button", { name: "다시 연결" }).click();
    await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
    await expect.poll(async () => (await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body as string).toContain("미전송 합성 문장");
  } finally {
    await Promise.all([ownerContext.close(), writerContext.close()]);
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [[owner.userId, writer.userId]]).then(() => undefined));
  }
});

test("guest writer keeps unsent text recoverable after IndexedDB failure", async ({ browser }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL || process.env.PUBLIC_GUEST_WRITER_E2E !== "true",
    "requires isolated database and separate public guest handshake budget");
  const mobile = info.project.name.includes("mobile");
  const options = { baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile };
  const ownerContext = await browser.newContext(options);
  const guestContext = await browser.newContext(options);
  const owner = await account(ownerContext, "게스트 실패 소유자");
  try {
    const songResponse = await ownerContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "게스트 실패 곡" } });
    expect(songResponse.status()).toBe(201);
    const songId = (await songResponse.json()).song.id as string;
    const lyricResponse = await ownerContext.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
      requestId: randomUUID(), title: "게스트 실패 가사", body: "공개 서버 원문"
    } });
    expect(lyricResponse.status()).toBe(201);
    const lyricId = (await lyricResponse.json()).lyric.id as string;
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`/lyrics/${lyricId}`);
    await expect(ownerPage.getByLabel("가사 본문")).toBeVisible({ timeout: 15_000 });
    await ownerPage.locator("button:visible", { hasText: /^공유$/ }).first().click();
    const dialog = ownerPage.getByRole("dialog", { name: "가사 공유" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "공개 링크 만들기" }).click();
    const issuedResponse = ownerPage.waitForResponse((response) => response.url().endsWith(`/api/lyrics/${lyricId}/public-link`)
      && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "확인하고 공개" }).click();
    const issued = await (await issuedResponse).json() as { url: string };
    await dialog.locator(".sharing-public-access button").nth(1).click();
    await dialog.locator(".sharing-public-write-risk").getByRole("button", { name: "위험을 이해하고 쓰기 허용" }).click();
    await expect(dialog.locator(".sharing-notice")).toContainText("비로그인 게스트 쓰기를 허용", { timeout: 10_000 });

    const guestPage = await guestContext.newPage();
    await guestPage.goto(issued.url);
    const editor = guestPage.getByLabel("공유된 가사 본문");
    await expect(guestPage.locator(".shared-read-badge")).toContainText("게스트 공동 작성", { timeout: 15_000 });
    await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
    await guestPage.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      (window as unknown as { restoreP4Storage?: () => void }).restoreP4Storage = () => { IDBObjectStore.prototype.put = original; };
      IDBObjectStore.prototype.put = function (...args) {
        if (this.transaction.db.name.includes("public-guest") && this.transaction.db.name.endsWith("sync-v1")) {
          throw new DOMException("synthetic quota", "QuotaExceededError");
        }
        return original.apply(this, args);
      } as typeof IDBObjectStore.prototype.put;
    });
    await editor.click();
    await guestPage.keyboard.press("Control+End");
    await guestPage.keyboard.insertText(" 미전송 게스트 문장");
    await expect(guestPage.getByRole("status")).toContainText("이 기기에 입력을 저장하지 못했습니다", { timeout: 15_000 });
    await expect(editor).toHaveAttribute("contenteditable", "false");
    const recovery = guestPage.locator(".shared-writer-recovery");
    await expect(recovery).toContainText("미전송 게스트 문장");
    await expect(recovery.getByRole("button", { name: "내용 복사" })).toBeVisible();
    const beforeRetry = (await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body as string;
    expect(beforeRetry).not.toContain("미전송 게스트 문장");

    await guestPage.evaluate(() => (window as unknown as { restoreP4Storage: () => void }).restoreP4Storage());
    await guestPage.getByRole("button", { name: "다시 연결" }).click();
    await expect(editor).toHaveAttribute("contenteditable", "true", { timeout: 15_000 });
    await expect.poll(async () => (await (await ownerContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body as string)
      .toContain("미전송 게스트 문장");
  } finally {
    await Promise.all([ownerContext.close(), guestContext.close()]);
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner.userId]).then(() => undefined));
  }
});

async function account(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `p4-storage-${randomUUID()}`;
  const sharingId = await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    const profile = await pool.query<{ sharing_id: string }>("insert into user_profiles(owner_id,display_name) values($1,$2) returning sharing_id", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    return profile.rows[0]!.sharing_id;
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, sharingId };
}
