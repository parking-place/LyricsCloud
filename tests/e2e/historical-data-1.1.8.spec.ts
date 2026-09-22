import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

test.describe("1.1.8 historical data R10", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires parent's isolated E2E runtime");

  test("shows all permanently deleted lyrics and removed links while restore keeps the older batch in trash", async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const headers = { Origin: origin };
    const owner = randomUUID(), token = `historical-data-${randomUUID()}`;
    const songTitle = "삭제 영향 확인 곡";
    try {
      await withE2eDatabase(async (pool) => {
        await pool.query("insert into app_users(id,status) values($1,'active')", [owner]);
        await pool.query("insert into user_profiles(owner_id,display_name) values($1,'Historical synthetic fixture')", [owner]);
        await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
      });
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      const song = await create(page, "/api/songs", "song", { title: songTitle }, headers);
      const older = await create(page, `/api/songs/${song}/lyrics`, "lyric", { title: "먼저 삭제한 가사", body: "older synthetic body" }, headers);
      const current = await create(page, `/api/songs/${song}/lyrics`, "lyric", { title: "곡과 삭제한 가사", body: "current synthetic body" }, headers);
      const note = await create(page, "/api/rhymes", "rhyme", { title: "보존할 독립 노트", body: "retained synthetic body" }, headers);
      await withE2eDatabase((pool) => pool.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,'rhyme_note')", [owner, song, note]));
      expect((await page.request.delete(`/api/lyrics/${older}`, { headers })).ok()).toBe(true);
      expect((await page.request.delete(`/api/songs/${song}`, { headers })).ok()).toBe(true);
      await page.goto("/trash");

      const target = page.locator(".trash-table tbody tr:visible, .trash-card:visible").filter({ hasText: songTitle }).filter({ hasText: "독립 자료" });
      await target.getByRole("button", { name: "복원", exact: true }).click();
      let dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("같은 삭제 묶음의 소속 가사 1개");
      await expect(dialog).toContainText("보존되는 연결 1개");
      await dialog.getByRole("button", { name: "복원", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect((await page.request.get(`/api/lyrics/${older}`)).status()).toBe(404);
      expect((await page.request.get(`/api/lyrics/${current}`)).status()).toBe(200);
      expect((await page.request.delete(`/api/songs/${song}`, { headers })).ok()).toBe(true);
      await page.reload();
      await target.getByRole("button", { name: "완전 삭제", exact: true }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("소속 가사 전체 2개 영구 삭제");
      await expect(dialog).toContainText("연결 1개 제거");
      await expect(dialog).not.toContainText("보존되는 연결");
      await expect(dialog.getByRole("button", { name: "완전 삭제", exact: true })).toBeDisabled();
      await dialog.getByLabel(/자료 이름을 입력/).fill(songTitle);
      await dialog.getByRole("button", { name: "완전 삭제", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      for (const id of [older, current]) expect((await page.request.get(`/api/lyrics/${id}`)).status()).toBe(404);
      const retained = await page.request.get(`/api/rhymes/${note}`);
      expect(retained.status()).toBe(200);
      expect((await retained.json()).rhyme).toMatchObject({ body: "retained synthetic body", linkedSongIds: [] });
    } finally {
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner]));
    }
  });
});

async function create(page: Page, url: string, field: string, data: Record<string, string>, headers: Record<string, string>): Promise<string> {
  const response = await page.request.post(url, { headers, data: { requestId: randomUUID(), ...data } });
  expect(response.status()).toBe(201);
  return (await response.json())[field].id as string;
}
