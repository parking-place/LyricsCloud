import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.8.0 trash and account lifecycle", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("restores a song batch, moves an orphan lyric, and permanently deletes only after title confirmation", async ({ browser, context, page }, info) => {
    test.setTimeout(90_000);
    const account = await createAccount(context, `휴지통 ${info.project.name}`);
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, `다른 휴지통 ${info.project.name}`);
    try {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
      const destination = await createSong(page, "복원 목적지");
      const firstSong = await createSong(page, "묶음 복원 곡");
      const firstLyric = await createLyric(page, firstSong, "묶음 복원 가사");
      expect((await page.request.delete(`/api/songs/${firstSong}`, { headers })).status()).toBe(200);

      const ownerTrash = await page.request.get("/api/trash");
      expect(ownerTrash.status()).toBe(200);
      const items = (await ownerTrash.json()).items as Array<{ title: string; purgeAt: string; deletedAt: string; affectedLyrics: number }>;
      const songTrash = items.find((item) => item.title === "묶음 복원 곡")!;
      expect(songTrash.affectedLyrics).toBe(1);
      expect(new Date(songTrash.purgeAt).getTime() - new Date(songTrash.deletedAt).getTime()).toBe(30 * 86_400_000);
      expect(((await (await otherContext.request.get("/api/trash")).json()).items as unknown[])).toHaveLength(0);

      await page.goto("/trash");
      await expect(page.getByRole("heading", { name: "휴지통", exact: true })).toBeVisible();
      await expect(page.getByText("30일 뒤 자동으로 완전히 삭제", { exact: false })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const firstTarget = trashTarget(page, info.project.name, "묶음 복원 곡");
      await firstTarget.getByRole("button", { name: "복원", exact: true }).click();
      const restoreDialog = page.getByRole("dialog", { name: /1개 자료 복원/ });
      await expect(restoreDialog).toContainText("소속 가사 1개");
      await restoreDialog.getByRole("button", { name: "복원", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("원래 위치로 복원");
      expect((await page.request.get(`/api/songs/${firstSong}`)).status()).toBe(200);
      expect((await page.request.get(`/api/lyrics/${firstLyric}`)).status()).toBe(200);

      const orphanSong = await createSong(page, "삭제된 부모 곡");
      const orphanLyric = await createLyric(page, orphanSong, "옮길 가사");
      await page.request.delete(`/api/songs/${orphanSong}`, { headers });
      const withoutChoice = await page.request.post("/api/trash/restore", { headers, data: { items: [{ kind: "resource", id: orphanLyric }], confirmedTitles: [] } });
      expect(withoutChoice.status()).toBe(409);
      await page.reload();
      const orphanTarget = trashTarget(page, info.project.name, "옮길 가사");
      await orphanTarget.getByRole("button", { name: "복원", exact: true }).click();
      const orphanDialog = page.getByRole("dialog", { name: /1개 자료 복원/ });
      await orphanDialog.getByRole("radio", { name: /활성 곡으로 이동/ }).check();
      await orphanDialog.getByLabel("이동할 곡").selectOption(destination);
      await orphanDialog.getByRole("button", { name: "복원", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("원래 위치로 복원");
      expect(((await (await page.request.get(`/api/lyrics/${orphanLyric}`)).json()).lyric.songId)).toBe(destination);

      const deleteLyric = await createLyric(page, destination, "즉시 제거 가사");
      await page.request.delete(`/api/lyrics/${deleteLyric}`, { headers });
      await page.reload();
      const deleteTarget = trashTarget(page, info.project.name, "즉시 제거 가사");
      await deleteTarget.getByRole("button", { name: "완전 삭제", exact: true }).click();
      const deleteDialog = page.getByRole("dialog", { name: /1개 자료 완전 삭제/ });
      await expect(deleteDialog.getByRole("button", { name: "완전 삭제", exact: true })).toBeDisabled();
      await deleteDialog.getByLabel(/자료 이름을 입력/).fill("즉시 제거 가사");
      await deleteDialog.getByRole("button", { name: "완전 삭제", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("완전히 삭제");
      expect((await page.request.get(`/api/lyrics/${deleteLyric}`)).status()).toBe(404);
      if (info.project.name === "desktop" || info.project.name === "mobile") await page.screenshot({ path: `docs/runbooks/evidence/0.8.0-phase4-trash-${info.project.name}.png`, fullPage: true });
    } finally {
      await Promise.all([otherContext.close(), deleteAccounts([account.userId, other.userId])]);
    }
  });

  test("blocks existing tabs immediately and restores access only after explicit withdrawal cancellation", async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "session lifecycle contract runs once");
    test.setTimeout(60_000);
    const account = await createAccount(context, "탈퇴 수명주기");
    const oldTab = await context.newPage();
    try {
      await page.goto("/settings?withdrawal=confirm#account");
      const dialog = page.getByRole("dialog", { name: "회원 탈퇴 확인" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("7일");
      await expect(dialog).toContainText("Google 재인증");
      await page.screenshot({ path: "docs/runbooks/evidence/0.8.0-phase4-withdrawal-confirm-desktop.png", fullPage: true });
      await page.evaluate(([prefix]) => {
        localStorage.setItem(`${prefix}draft-marker`, "private");
        sessionStorage.setItem(`${prefix}session-marker`, "private");
      }, [`lc:${account.userId}:`]);
      await oldTab.goto("/songs");
      await dialog.getByRole("checkbox").check();
      await dialog.getByLabel(/계속하려면/).fill("탈퇴");
      await dialog.getByRole("button", { name: "탈퇴 요청" }).click();
      await expect(page).toHaveURL(/\/auth\?withdrawal=pending$/);
      expect((await oldTab.request.get("/api/trash")).status()).toBe(401);
      expect(await accountState(account.userId)).toMatchObject({ status: "withdrawal_pending", activeSessions: 0 });
      expect(await page.evaluate(([prefix]) => localStorage.getItem(`${prefix}draft-marker`) ?? sessionStorage.getItem(`${prefix}session-marker`), [`lc:${account.userId}:`])).toBeNull();

      const recoveryToken = `withdrawal-recovery-${randomUUID()}`;
      await withE2eDatabase((pool) => pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [hashToken(recoveryToken), account.userId]).then(() => undefined));
      await context.addCookies([{ name: "lc_session", value: recoveryToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await page.goto("/account/withdrawal");
      await expect(page.getByRole("heading", { name: /탈퇴가 예약되었습니다/ })).toBeVisible();
      await expect(page.getByText("일반 기능은 즉시 차단", { exact: false })).toBeVisible();
      await page.screenshot({ path: "docs/runbooks/evidence/0.8.0-phase4-withdrawal-pending-desktop.png", fullPage: true });
      await page.getByLabel(/계속하려면/).fill("철회");
      await page.getByRole("button", { name: "탈퇴 철회하고 작업 공간 복구" }).click();
      await expect(page).toHaveURL(/\/workspace$/);
      expect((await page.request.get("/api/trash")).status()).toBe(200);
      expect(await accountState(account.userId)).toMatchObject({ status: "active" });
    } finally { await oldTab.close(); await deleteAccounts([account.userId]); }
  });
});

async function createSong(page: Page, title: string): Promise<string> {
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201); return ((await response.json()).song as { id: string }).id;
}
async function createLyric(page: Page, songId: string, title: string): Promise<string> {
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title, body: `[Verse]\n${title}` } });
  expect(response.status()).toBe(201); return ((await response.json()).lyric as { id: string }).id;
}
async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `lifecycle-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, token };
}
async function accountState(userId: string) {
  return withE2eDatabase(async (pool) => {
    const user = (await pool.query<{ status: string }>("select status from app_users where id=$1", [userId])).rows[0];
    const sessions = (await pool.query<{ count: number }>("select count(*)::int count from auth_sessions where user_id=$1 and revoked_at is null", [userId])).rows[0]!.count;
    return { status: user?.status, activeSessions: sessions };
  });
}
function trashTarget(page: Page, projectName: string, title: string) {
  return projectName === "mobile"
    ? page.locator(".trash-card").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    : page.locator(".trash-table tbody tr").filter({ has: page.locator("td:nth-child(2) > strong").filter({ hasText: new RegExp(`^${title}$`) }) });
}
async function deleteAccounts(ids: readonly string[]) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined)); }
