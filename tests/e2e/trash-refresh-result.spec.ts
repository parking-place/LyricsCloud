import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.8 trash refresh result", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("reports completed restore/delete when list refresh fails and preserves real conflict handling", async ({ context, page }, info) => {
    const userId = randomUUID(); const token = `trash-refresh-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "휴지통 결과 회귀"]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);

    try {
      async function deletedSong(title: string) {
        const response = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
        expect(response.ok()).toBe(true);
        const id = (await response.json()).song.id as string;
        expect((await context.request.delete(`/api/songs/${id}`, { headers })).status()).toBe(200);
        return { id, title };
      }
      const restore = await deletedSong("새로고침 실패 후 복원");
      const permanent = await deletedSong("새로고침 실패 후 완전 삭제");
      const untouched = await deletedSong("남겨둘 자료");
      function target(title: string) {
        return page.locator(info.project.name === "mobile" ? ".trash-card" : ".trash-table tbody tr")
          .filter({ has: page.getByText(title, { exact: true }) });
      }
      const mutations: string[] = [];
      page.on("request", (request) => {
        const path = new URL(request.url()).pathname;
        if (request.method() === "POST" && (path === "/api/trash/restore" || path === "/api/trash/permanent")) mutations.push(path);
      });
      await page.goto("/trash");
      await expect(target(untouched.title)).toBeVisible();

      for (const [index, operation] of [
        { action: "restore", item: restore, button: "복원", result: "원래 위치로 복원했습니다." },
        { action: "permanent", item: permanent, button: "완전 삭제", result: "완전히 삭제했습니다." }
      ].entries()) {
        await target(operation.item.title).getByRole("button", { name: operation.button, exact: true }).click();
        const dialog = page.getByRole("dialog", { name: `1개 자료 ${operation.button}`, exact: true });
        const confirm = dialog.getByRole("button", { name: operation.button, exact: true });
        if (operation.action === "permanent") {
          await expect(confirm).toBeDisabled();
          await dialog.getByLabel(/자료 이름을 입력/).fill("다른 이름");
          await expect(confirm).toBeDisabled();
          await dialog.getByLabel(/자료 이름을 입력/).fill(operation.item.title);
        }
        await page.route("**/api/trash?type=all", (route) => operation.action === "restore"
          ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "REFRESH_UNAVAILABLE" }) })
          : route.abort("failed"), { times: 1 });
        const mutation = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/trash/${operation.action}` && response.request().method() === "POST");
        await confirm.click();
        expect((await mutation).status()).toBe(200);

        await expect(dialog).toBeHidden();
        await expect(target(operation.item.title)).toHaveCount(0);
        await expect(target(untouched.title)).toBeVisible();
        const notice = page.locator(".trash-message");
        await expect(notice).toContainText(operation.result);
        await expect(notice).toContainText("목록을 새로 불러오지 못했습니다.");
        await expect(notice).not.toContainText("요청을 완료하지 못했습니다.");
        expect(mutations).toHaveLength(index + 1);
        const trash = await context.request.get("/api/trash");
        expect(trash.status()).toBe(200);
        const ids = ((await trash.json()).items as Array<{ id: string }>).map(({ id }) => id);
        expect(ids).not.toContain(operation.item.id);
        expect(ids).toContain(untouched.id);
        expect((await context.request.get(`/api/songs/${operation.item.id}`)).status()).toBe(operation.action === "restore" ? 200 : 404);

        await page.getByRole("button", { name: "목록 새로고침", exact: true }).click();
        await expect(notice).toHaveCount(0);
        await expect(target(operation.item.title)).toHaveCount(0);
        await expect(target(untouched.title)).toBeVisible();
        expect(mutations).toHaveLength(index + 1);
      }

      // A real mutation conflict still leaves its confirmation open for review.
      const external = await context.request.post("/api/trash/restore", { headers, data: { items: [{ kind: "resource", id: untouched.id }], confirmedTitles: [] } });
      expect(external.status()).toBe(200);
      await target(untouched.title).getByRole("button", { name: "복원", exact: true }).click();
      const conflictDialog = page.getByRole("dialog", { name: "1개 자료 복원", exact: true });
      const conflict = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/trash/restore" && response.request().method() === "POST");
      await conflictDialog.getByRole("button", { name: "복원", exact: true }).click();
      expect((await conflict).status()).toBe(409);
      await expect(page.locator(".trash-message")).toContainText("휴지통 상태가 바뀌었거나");
      await expect(conflictDialog).toBeVisible();
      await expect(target(untouched.title)).toBeVisible();
      await expect(page.locator(".trash-message")).not.toContainText("복원했습니다.");
    } finally {
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
    }
  });
});
