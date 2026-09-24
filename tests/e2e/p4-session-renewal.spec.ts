import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

test("SSR page lookup leaves renewal to an API response that can set the cookie", async ({ context }, info) => {
  test.skip(info.project.name !== "desktop" || !process.env.E2E_DATABASE_URL, "runs once with isolated database");
  const userId = randomUUID();
  const token = `p4-session-${randomUUID()}`;
  const hashed = hashToken(token);
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "세션 합성 계정"]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '30 days')", [hashed, userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  try {
    const before = await expiry(hashed);
    const pageResponse = await context.request.get("/songs");
    expect(pageResponse.status()).toBe(200);
    expect(pageResponse.headers()["set-cookie"] ?? "").not.toContain("lc_session=");
    expect(await expiry(hashed)).toBe(before);

    const apiResponse = await context.request.get("/api/songs");
    expect(apiResponse.status()).toBe(200);
    expect(apiResponse.headers()["set-cookie"]).toContain("lc_session=");
    expect(await expiry(hashed)).toBeGreaterThan(before);
  } finally {
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
  }
});

async function expiry(hashed: string): Promise<number> {
  return withE2eDatabase(async (pool) => {
    const result = await pool.query<{ expires_at: Date }>("select expires_at from auth_sessions where token_hash=$1", [hashed]);
    return result.rows[0]!.expires_at.getTime();
  });
}
