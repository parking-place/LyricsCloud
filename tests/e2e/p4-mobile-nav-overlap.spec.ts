import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

test("B-1 mobile quick add does not take a prompt navigation tap at the document bottom", async ({ context, page }, info) => {
  test.skip(info.project.name !== "mobile" || !process.env.E2E_DATABASE_URL, "requires mobile and isolated database");
  const userId = randomUUID();
  const token = `p4-nav-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "모바일 탐색 합성 계정"]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  try {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ["dark", "light"]) {
        await page.goto("/songs");
        await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; window.scrollTo(0, document.documentElement.scrollHeight); }, theme);
        const result = await page.evaluate(() => {
          const prompt = document.querySelector<HTMLAnchorElement>('.mobile-bottom-nav a[href="/prompts"]')!;
          const quick = document.querySelector<HTMLButtonElement>(".quick-add")!;
          const p = prompt.getBoundingClientRect();
          const q = quick.getBoundingClientRect();
          const overlapWidth = Math.max(0, Math.min(p.right, q.right) - Math.max(p.left, q.left));
          const overlapHeight = Math.max(0, Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top));
          const hit = document.elementFromPoint(p.right - 4, p.top + p.height / 2);
          return { overlapArea: overlapWidth * overlapHeight, promptHit: hit === prompt || prompt.contains(hit) };
        });
        expect(result.overlapArea, `${width}px ${theme} prompt/quick-add overlap`).toBe(0);
        expect(result.promptHit, `${width}px ${theme} prompt edge hit`).toBe(true);
      }
    }
  } finally {
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
  }
});
