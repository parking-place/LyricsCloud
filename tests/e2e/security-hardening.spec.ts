import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("0.9.1 security hardening", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("rejects oversized API bodies before authentication or parsing", async ({ request }) => {
    const response = await request.post("/api/profile", {
      headers: { Origin: origin, "Content-Type": "application/json" },
      data: { displayName: "가".repeat(1_048_576) }
    });
    expect(response.status()).toBe(413);
    const body = await response.json() as { error: { code: string; requestId: string } };
    expect(body).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
    expect(response.headers()["x-request-id"]).toBe(body.error.requestId);
    expect(response.headers()["cache-control"]).toContain("no-store");

    const unauthenticated = await request.get("/api/songs");
    const unauthenticatedBody = await unauthenticated.json() as { error: { code: string; requestId: string } };
    expect(unauthenticated.status()).toBe(401);
    expect(unauthenticatedBody.error.code).toBe("AUTH_REQUIRED");
    expect(unauthenticated.headers()["x-request-id"]).toBe(unauthenticatedBody.error.requestId);
  });

  test("rate limits login and authenticated search bursts without leaking content", async ({ browser, request }, info) => {
    test.skip(info.project.name !== "desktop", "rate boundary runs once");
    test.setTimeout(90_000);
    const client = `192.0.2.${Math.floor(Math.random() * 100 + 100)}`;
    for (let index = 0; index < 40; index++) {
      expect((await request.get("/api/auth/login", { headers: { "x-real-ip": client }, maxRedirects: 0 })).status()).toBe(302);
    }
    const blockedLogin = await request.get("/api/auth/login", { headers: { "x-real-ip": client }, maxRedirects: 0 });
    expect(blockedLogin.status()).toBe(429);
    expect(blockedLogin.headers()["retry-after"]).toMatch(/^\d+$/);
    const blockedLoginBody = await blockedLogin.json();
    expect(blockedLoginBody).toMatchObject({ error: { code: "RATE_LIMITED" } });
    expect(JSON.stringify(blockedLoginBody)).not.toContain("state");

    const context = await browser.newContext({ baseURL: origin });
    const account = await createAccount(context, "검색 빈도 합성 사용자");
    try {
      const responses = await Promise.all(Array.from({ length: 140 }, (_, index) =>
        context.request.get(`/api/search?q=${encodeURIComponent(`합성-${index}`)}`)));
      const statuses = responses.map((response) => response.status());
      expect(statuses.every((status) => status === 200 || status === 429)).toBe(true);
      expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
      const limited = responses.find((response) => response.status() === 429)!;
      expect(limited.headers()["retry-after"]).toMatch(/^\d+$/);
      const limitedBody = await limited.json();
      expect(limitedBody).toMatchObject({ error: { code: "RATE_LIMITED" } });
      expect(JSON.stringify(limitedBody)).not.toContain("합성-");
    } finally {
      await context.close();
      await deleteAccounts([account.userId]);
    }
  });

  test("renders stored and reflected XSS payloads only as text under a nonce CSP", async ({ context, page }, info) => {
    test.skip(info.project.name !== "desktop", "XSS sink matrix runs once");
    const marker = "LC_XSS_0912";
    const payload = `<img src=x onerror=window.__lcXss=1>${marker}<script>window.__lcXss=2</script><a href="javascript:window.__lcXss=3">x</a>`;
    const account = await createXssFixture(context, payload);
    try {
      for (const path of ["/workspace", "/songs", "/rhymes", "/prompts", "/templates"]) {
        const response = await page.goto(path);
        expect(response?.headers()["content-security-policy"]).toContain("script-src 'self' 'nonce-");
        await expect(page.locator("body")).toContainText(marker);
        expect(await page.evaluate(() => (window as Window & { __lcXss?: number }).__lcXss)).toBeUndefined();
      }
      await page.goto(`/search?q=${encodeURIComponent(payload)}`);
      await expect(page.getByRole("searchbox", { name: "통합 검색어" })).toHaveValue(payload);
      expect(await page.evaluate(() => (window as Window & { __lcXss?: number }).__lcXss)).toBeUndefined();
      expect(await page.locator("script:not([src])").evaluateAll((scripts) => scripts.every((script) => script.hasAttribute("nonce")))).toBe(true);
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `security-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, token };
}

async function createXssFixture(context: BrowserContext, payload: string) {
  const account = await createAccount(context, `<svg onload=window.__lcXss=4>LC_XSS_0912</svg>`);
  await withE2eDatabase(async (pool) => {
    const songId = randomUUID(), lyricId = randomUUID(), rhymeId = randomUUID(), promptId = randomUUID(), templateId = randomUUID(), tagId = randomUUID();
    await pool.query("begin");
    try {
      await pool.query(`insert into resources(id,owner_id,type,title) values
        ($1,$5,'song',$6),($2,$5,'lyrics',$6),($3,$5,'rhyme_note',$6),($4,$5,'prompt',$6)`,
      [songId, lyricId, rhymeId, promptId, account.userId, payload]);
      await pool.query("insert into songs(resource_id,owner_id,status,description,work_notes) values($1,$2,'idea',$3,$3)", [songId, account.userId, payload]);
      await pool.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$2,$3,$4,$4,'draft')", [lyricId, account.userId, songId, payload]);
      await pool.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [rhymeId, account.userId, payload]);
      await pool.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)", [promptId, account.userId, payload]);
      const tagPayload = payload.slice(0, 50);
      await pool.query("insert into tags(id,owner_id,display_value,normalized_value) values($1,$2,$3,$4)", [tagId, account.userId, tagPayload, markerSafe(tagPayload)]);
      await pool.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [account.userId, rhymeId, tagId]);
      await pool.query("insert into templates(id,owner_id,type,title,lyric_body) values($1,$2,'lyrics',$3,$3)", [templateId, account.userId, payload]);
      await pool.query("commit");
    } catch (error) { await pool.query("rollback"); throw error; }
  });
  return account;
}

function markerSafe(value: string): string {
  return value.toLocaleLowerCase("ko-KR").slice(0, 200);
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
