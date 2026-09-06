import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
test("shows durable server storage separately from a delayed plaintext projection", async ({ context, page }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");
  const owner = randomUUID(), token = randomUUID();
  const trigger = `p5_projection_${randomUUID().replaceAll("-", "")}`;
  let id = "";
  try {
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id) values($1)", [owner]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'합성 사용자')", [owner]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const headers = { Origin: origin };
    const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "합성 곡" } });
    const lyric = await page.request.post(`/api/songs/${(await song.json()).song.id}/lyrics`, { headers, data: { requestId: randomUUID(), title: "합성 가사", body: "기준" } });
    id = (await lyric.json()).lyric.id;
    await page.goto(`/lyrics/${id}`);
    await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
    await withE2eDatabase(async (pool) => {
      await pool.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin raise exception 'synthetic projection failure'; end $$`);
      await pool.query(`create trigger ${trigger} before update of body on lyrics for each row when (old.resource_id='${id}'::uuid) execute function ${trigger}()`);
    });
    await page.locator(".cm-content").press("Control+End");
    await page.keyboard.insertText("\n서버 원본에 저장된 입력");
    await expect(page.getByText("서버에 저장됨 · 검색 반영 중…", { exact: true })).toBeVisible();
    await expect(page.getByText("방금 저장됨", { exact: true })).toHaveCount(0);
    const pending = await withE2eDatabase(async (pool) => {
      const result = await pool.query(`select l.body, d.projection_error_code,
        (select count(*)::int from sync_update_receipts r where r.document_key=d.document_key) receipts
        from lyrics l join sync_documents d on d.resource_id=l.resource_id where l.resource_id=$1`, [id]);
      return result.rows[0];
    });
    expect(pending).toMatchObject({ body: "기준", projection_error_code: "SYNC_PROJECTION_FAILED", receipts: 1 });
    // Reload obtains the latest CRDT snapshot even while the relational body is stale.
    await page.reload();
    await expect(page.locator(".cm-content")).toContainText("서버 원본에 저장된 입력");
    await expect(page.getByText("서버에 저장됨 · 검색 반영 중…", { exact: true })).toBeVisible();
    if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`projection-pending-${info.project.name}.png`) });
    await withE2eDatabase(async (pool) => {
      await pool.query(`drop trigger ${trigger} on lyrics`);
      await pool.query(`drop function ${trigger}()`);
    });
    await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 15_000 });
    expect((await (await page.request.get(`/api/lyrics/${id}`)).json()).lyric.body).toBe("기준\n서버 원본에 저장된 입력");
  } finally {
    await withE2eDatabase(async (pool) => {
      await pool.query(`drop trigger if exists ${trigger} on lyrics`);
      await pool.query(`drop function if exists ${trigger}()`);
      await pool.query("delete from app_users where id=$1", [owner]);
    });
  }
});
